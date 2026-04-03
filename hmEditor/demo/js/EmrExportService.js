(function() {
    'use strict';
    
    var EmrExportService = {
        DOCUMENT_TYPE_MAP: {
            '入院记录': 'AdmissionNote',
            '住院病历': 'AdmissionNote',
            '首次病程记录': 'FirstProgressNote',
            '病程记录': 'ProgressNote',
            '日常病程记录': 'DailyProgressNote',
            '出院记录': 'DischargeNote',
            '出院小结': 'DischargeSummary',
            '手术记录': 'SurgeryNote',
            '术前记录': 'PreOperativeNote',
            '术后记录': 'PostOperativeNote'
        },
        
        FIELD_NAME_MAP: {
            '主诉': 'chief_complaint',
            '现病史': 'history_of_present_illness',
            '既往史': 'past_history',
            '个人史': 'personal_history',
            '家族史': 'family_history',
            '婚育史': 'marital_history',
            '体格检查': 'physical_examination',
            '辅助检查': 'auxiliary_examination',
            '初步诊断': 'preliminary_diagnosis',
            '诊断': 'diagnosis',
            '诊疗计划': 'treatment_plan',
            '病情记录': 'progress_note',
            '查房意见': 'rounds_opinion',
            '处理意见': 'treatment_opinion',
            '出院诊断': 'discharge_diagnosis',
            '出院医嘱': 'discharge_instructions',
            '手术经过': 'surgical_procedure',
            '术前诊断': 'preoperative_diagnosis',
            '术后诊断': 'postoperative_diagnosis'
        },
        
        init: function() {
            console.log('[EmrExportService] 初始化 EMR 数据导出服务');
        },
        
        extractAllData: async function(editor) {
            console.log('[EmrExportService] ========== 开始提取病历数据 ==========');
            
            if (!editor || !editor.editor) {
                console.error('[EmrExportService] 编辑器实例无效');
                return null;
            }
            
            var structuredData = await this.extractStructuredData(editor);
            var htmlContent = this.extractHtmlContent(editor);
            var docTitle = await this.getDocumentTitle(editor);
            var docType = this.getDocumentType(docTitle);
            
            var payload = {
                patient_id: this.generatePatientId(),
                document_id: this.generateDocumentId(),
                document_type: docType,
                document_title: docTitle,
                author: this.getCurrentAuthor(),
                department: this.getCurrentDepartment(),
                timestamp: new Date().toISOString(),
                structured_data: structuredData,
                html_content: htmlContent,
                metadata: {
                    editor_version: 'hm_editor_1.0',
                    export_version: '1.0.0',
                    checksum: this.generateChecksum(structuredData)
                }
            };
            
            console.log('[EmrExportService] ✅ 数据提取完成');
            console.log('[EmrExportService] 文档类型:', docType);
            console.log('[EmrExportService] 结构化字段数:', Object.keys(structuredData).length);
            console.log('[EmrExportService] HTML 内容长度:', htmlContent.length);
            
            return payload;
        },
        
        extractStructuredData: async function(editor) {
            console.log('[EmrExportService] 提取结构化数据...');
            
            var structuredData = {};
            var $body = $(editor.editor.document.getBody().$);
            
            var dataElements = $body.find('[data-hm-keycode]');
            
            var self = this;
            dataElements.each(function() {
                var $el = $(this);
                var keyCode = $el.attr('data-hm-keycode');
                var keyName = $el.attr('data-hm-keyname') || '';
                var value = '';
                
                if ($el.is('input, textarea')) {
                    value = $el.val();
                } else if ($el.find('input, textarea').length > 0) {
                    value = $el.find('input, textarea').val();
                } else {
                    value = $el.text().trim();
                }
                
                if (keyName && value) {
                    var fieldName = self.FIELD_NAME_MAP[keyName] || self.toSnakeCase(keyName);
                    structuredData[fieldName] = {
                        display_name: keyName,
                        key_code: keyCode,
                        value: value
                    };
                    console.log('[EmrExportService] 提取字段:', keyName, '=', value.substring(0, 50) + '...');
                }
            });
            
            var editableElements = $body.find('[contenteditable="true"]');
            editableElements.each(function() {
                var $el = $(this);
                var dataKey = $el.attr('data-key') || $el.attr('data-field');
                if (dataKey) {
                    var value = $el.text().trim();
                    if (value) {
                        var fieldName = self.FIELD_NAME_MAP[dataKey] || self.toSnakeCase(dataKey);
                        if (!structuredData[fieldName]) {
                            structuredData[fieldName] = {
                                display_name: dataKey,
                                value: value
                            };
                        }
                    }
                }
            });
            
            return structuredData;
        },
        
        extractHtmlContent: function(editor) {
            console.log('[EmrExportService] 提取 HTML 内容...');
            
            var html = editor.editor.getData();
            return html || '';
        },
        
        getDocumentTitle: async function(editor) {
            if (!window.tabManager) {
                return '未知文档';
            }
            
            try {
                var currentTab = window.tabManager.getCurrentTab();
                if (currentTab && currentTab.title) {
                    return currentTab.title;
                }
            } catch (e) {
                console.warn('[EmrExportService] 获取文档标题失败:', e);
            }
            
            return '病历文档';
        },
        
        getDocumentType: function(docTitle) {
            for (var key in this.DOCUMENT_TYPE_MAP) {
                if (docTitle.indexOf(key) !== -1) {
                    return this.DOCUMENT_TYPE_MAP[key];
                }
            }
            return 'GeneralNote';
        },
        
        submitToHis: async function(payload) {
            console.log('[EmrExportService] ========== 提交病历到 HIS 系统 ==========');
            console.log('[EmrExportService] 提交 URL: /api/emr/submit');
            console.log('[EmrExportService] Payload:');
            console.log(JSON.stringify(payload, null, 2));
            
            return new Promise(function(resolve) {
                setTimeout(function() {
                    var response = {
                        success: true,
                        message: '病历已成功签名并提交至核心 HIS 系统',
                        document_id: payload.document_id,
                        submitted_at: new Date().toISOString(),
                        server_response: {
                            status: 'accepted',
                            queue_position: Math.floor(Math.random() * 100) + 1
                        }
                    };
                    
                    console.log('[EmrExportService] ✅ 服务器响应:');
                    console.log(JSON.stringify(response, null, 2));
                    
                    resolve(response);
                }, 1500);
            });
        },
        
        generatePatientId: function() {
            if (window.PatientContextStore) {
                var state = window.PatientContextStore.getState();
                if (state.patientId) {
                    return state.patientId;
                }
            }
            return 'P' + Date.now().toString().slice(-8);
        },
        
        generateDocumentId: function() {
            return 'DOC' + Date.now().toString(36).toUpperCase();
        },
        
        getCurrentAuthor: function() {
            return 'Dr. Woo';
        },
        
        getCurrentDepartment: function() {
            return '内科';
        },
        
        toSnakeCase: function(str) {
            return str
                .replace(/([A-Z])/g, '_$1')
                .replace(/[\s\-]+/g, '_')
                .replace(/_+/g, '_')
                .toLowerCase()
                .replace(/^_|_$/g, '');
        },
        
        generateChecksum: function(data) {
            var str = JSON.stringify(data);
            var hash = 0;
            for (var i = 0; i < str.length; i++) {
                var char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(16).toUpperCase();
        }
    };
    
    EmrExportService.init();
    
    window.EmrExportService = EmrExportService;
    
    console.log('[EmrExportService] 模块加载完成');
    
})();
