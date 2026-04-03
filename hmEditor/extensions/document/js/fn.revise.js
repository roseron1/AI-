/**
 * 修订模式相关功能
 */
commonHM.component['documentModel'].fn({
    /**
     * 设置文档修订模式
     * @param {Boolean} reviseMode 是否启用修订模式
     */
    setReviseMode: function(reviseMode,retainModify) {
        var _t = this;
        _t.editor.HMConfig.reviseMode = reviseMode;
        if (reviseMode) {
            _t.editor.commands["revise"].frozen = false;
            _t.editor.commands["revise"].enable();
            _t.editor.execCommand('revise', {reviseState: '显示修订'});
        } else if (!reviseMode) {
            _t.editor.reviseModelOpened = reviseMode;
            if (retainModify!==undefined && retainModify!==null) {
                if(retainModify){
                    _t.acceptAllRevisions();
                }else{
                    _t.rejectAllRevisions();
                }
                
                _t.editor.commands["revise"].frozen = true;
                _t.editor.commands["revise"].disable();
                return;
            }

            // 创建确认对话框
            var $dialog = $('<div class="revise-confirm-dialog" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1000; min-width: 400px;">' +
                '<div style="position: relative;">' +
                '<span class="close-icon" style="position: absolute; right: -10px; top: -10px; color: gray; cursor: pointer; font-size: 20px;">×</span>' +
                '<h3 style="margin-top: 0; font-size: 20px; margin-bottom: 25px;">关闭修订模式</h3>' +
                '<p style="margin-bottom: 20px;">请选择如何处理修订内容：</p>' +
                '<div style="display: flex; justify-content: space-between; margin-top: 30px;">' +
                '<button class="accept-all-btn" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">全部接受修订</button>' +
                '<button class="reject-all-btn" style="padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">全部拒绝修订</button>' +
                '</div>' +
                '</div>' +
                '</div>');

            // 添加到body
            $('body').append($dialog);
            $dialog.show();

            // 绑定关闭图标事件
            $dialog.find('.close-icon').on('click', function() {
                $dialog.remove();
            });

            // 绑定按钮事件
            $dialog.find('.accept-all-btn').on('click', function() {
                _t.acceptAllRevisions();
                $dialog.remove();
                _t.editor.commands["revise"].frozen = true;
                _t.editor.commands["revise"].disable();
            });

            $dialog.find('.reject-all-btn').on('click', function() {
                _t.rejectAllRevisions();
                $dialog.remove();
                _t.editor.commands["revise"].frozen = true;
                _t.editor.commands["revise"].disable();
            });
        }
    },

    /**
     * 接受所有修订
     */
    acceptAllRevisions: function() {
        var _t = this;
        var $body = $(_t.editor.document.getBody().$);

        // 处理新增内容
        $body.find('.hm_revise_ins').each(function() {
            var $ins = $(this);
            $ins.replaceWith($ins.text());
        });

        // 处理删除内容
        $body.find('.hm_revise_del').each(function() {
            var $del = $(this);
            $del.remove();
        });

        // 移除font color为#ff0000的样式
        $body.find('font[color="#ff0000"]').each(function() {
            var $font = $(this);
            $font.removeAttr('color');
        });
    },

    /**
     * 拒绝所有修订
     */
    rejectAllRevisions: function() {
        var _t = this;
        var $body = $(_t.editor.document.getBody().$);

        // 处理新增内容
        $body.find('.hm_revise_ins').each(function() {
            var $ins = $(this);
            $ins.remove();
        });

        // 处理删除内容
        $body.find('.hm_revise_del').each(function() {
            var $del = $(this);
            $del.replaceWith($del.text());
        });
    },

    /**
     * 手动合并修订内容
     * @returns {Object} 合并结果 {success: boolean, totalMerged: number, processedElements: number}
     */
    mergeRevisions: function() {
        var _t = this;

        if (!_t.editor) {
            return {
                success: false,
                message: 'Editor 实例未初始化'
            };
        }

        if (!_t.editor.mergeUncompletedRevisions) {
            return {
                success: false,
                message: '修订功能未初始化'
            };
        }

        return _t.editor.mergeUncompletedRevisions();
    },

    /**
     * 获取修订记录
     * @param {String} code 病历唯一编码，如果为空则获取所有病历的修订记录
     * @returns {Array} data 修订记录
     * @returns {Array} data[].traceId 修订记录ID
     * @returns {Array} data[].modifier 修订记录修改者
     * @returns {Array} data[].modifyTime 修订记录修改时间
     * @returns {Array} data[].modifyType 修订记录修改类型
     * @returns {Array} data[].content 修订记录内容
     * @returns {Array} data[].code 修订记录所属的病历编码
     */
    getRevisionHistory: function(code) {
        var _t = this;
        var $body = $(_t.editor.document.getBody().$);
        var revisionHistory = [];

        // 根据是否有病历编码确定查询范围
        var $searchScope;
        if (code) {
            // 如果指定了病历编码，只在该病历widget内查找
            $searchScope = $body.find('[data-hm-widgetid="' + code + '"]');
            if ($searchScope.length === 0) {
                // 如果找不到对应的widget，返回空数组
                return revisionHistory;
            }
        } else {
            // 如果没有指定病历编码，在整个文档中查找
            $searchScope = $body;
        }

        var $insElements = $searchScope.find('.hm_revise_ins');
        var $delElements = $searchScope.find('.hm_revise_del');

        // 处理新增修订
        $insElements.each(function() {
            var $element = $(this);

            // 获取当前标签的直接文本内容（排除子标签内容）
            var directTextContent = _t._getDirectTextContent($element);

            // 如果排除子标签后内容为空，则跳过
            if (!directTextContent || directTextContent.trim() === '') {
                return; // 相当于continue
            }

            // 获取修订标签所属的病历编码
            var $widgetContainer = $element.closest('[data-hm-widgetid]');
            var revisionCode = $widgetContainer.length > 0 ? $widgetContainer.attr('data-hm-widgetid') : '';

            // 向上查找带有 data-hm-code 属性的父元素
            var parentData = _t._findParentWithDataHmCode($element);

            var revision = {
                traceId: $element.attr('trace_id') || '',
                modifier: $element.attr('hm-modify-userName') || '',
                modifyTime: $element.attr('hm-modify-time') || '',
                modifyType: '新增',
                content: directTextContent,
                docCode: revisionCode, // 添加病历编码字段
                eleCode: parentData.dataHmCode, // 添加父元素的 data-hm-code
                eleName: parentData.dataHmName // 添加父元素的 data-hm-name
            };

            revisionHistory.push(revision);
        });

        // 处理删除修订
        $delElements.each(function() {
            var $element = $(this);

            // 获取当前标签的直接文本内容（排除子标签内容）
            var directTextContent = _t._getDirectTextContent($element);

            // 如果排除子标签后内容为空，则跳过
            if (!directTextContent || directTextContent.trim() === '') {
                return; // 相当于continue
            }

            // 获取修订标签所属的病历编码
            var $widgetContainer = $element.closest('[data-hm-widgetid]');
            var revisionCode = $widgetContainer.length > 0 ? $widgetContainer.attr('data-hm-widgetid') : '';

            // 向上查找带有 data-hm-code 属性的父元素
            var parentData = _t._findParentWithDataHmCode($element);

            var revision = {
                traceId: $element.attr('trace_id') || '',
                modifier: $element.attr('hm-modify-userName') || '',
                modifyTime: $element.attr('hm-modify-time') || '',
                modifyType: '删除',
                content: directTextContent,
                docCode: revisionCode, // 添加病历编码字段
                eleCode: parentData.dataHmCode, // 添加父元素 数据元的 data-hm-code
                eleName: parentData.dataHmName // 添加父元素 数据元的 data-hm-name
            };

            revisionHistory.push(revision);
        });

        // 按修改开始时间倒序排列
        revisionHistory.sort(function(a, b) {
            var timeA = a.modifyTime || '';
            var timeB = b.modifyTime || '';

            // 如果时间为空，则排在后面
            if (!timeA && !timeB) return 0;
            if (!timeA) return 1;
            if (!timeB) return -1;

            // 将时间字符串转换为Date对象进行比较
            var dateA = new Date(timeA);
            var dateB = new Date(timeB);

            // 倒序排列：较新的时间排在前面
            return dateB.getTime() - dateA.getTime();
        });

        return revisionHistory;
    },

    /**
     * 获取元素的直接文本内容（排除子标签内容）
     * @param {jQuery} $element jQuery元素对象
     * @returns {String} 直接文本内容
     */
    _getDirectTextContent: function($element) {
        var directText = '';

        // 遍历当前元素的直接子节点
        $element.contents().each(function() {
            // 如果是文本节点（nodeType == 3）
            if (this.nodeType === 3) {
                directText += this.nodeValue;
            }
            // 如果是元素节点但不是修订标签，则获取其文本内容
            else if (this.nodeType === 1) {
                var $child = $(this);
                // 排除修订标签（嵌套的修订标签）
                if (!$child.hasClass('hm_revise_ins') && !$child.hasClass('hm_revise_del')) {
                    directText += $child.text();
                }
            }
        });

        return directText;
    },

    /**
     * 向上查找带有 data-hm-code 属性的父元素
     * @param {jQuery} $element jQuery元素对象
     * @returns {Object} 包含 data-hm-code 和 data-hm-name 的对象
     */
    _findParentWithDataHmCode: function($element) {
        var $parent = $element.parent();
        
        while ($parent.length > 0 && $parent[0] !== document.body) {
            var dataHmCode = $parent.attr('data-hm-code');
            if (dataHmCode) {
                return {
                    dataHmCode: dataHmCode,
                    dataHmName: $parent.attr('data-hm-name') || ''
                };
            }
            $parent = $parent.parent();
        }
        
        return {
            dataHmCode: '',
            dataHmName: ''
        };
    }
});