(function() {
    'use strict';
    
    var STORAGE_KEY = 'patient_context_store';
    
    var PatientContextStore = {
        state: {
            patientId: '',
            admissionDate: '',
            chiefComplaint: '',
            presentIllness: '',
            pastHistory: '',
            primaryDiagnosis: '',
            lastUpdateTime: null,
            sourceDocument: ''
        },
        
        listeners: [],
        
        init: function() {
            console.log('[PatientContextStore] ========== 初始化患者上下文存储 ==========');
            this.loadFromStorage();
            console.log('[PatientContextStore] 初始状态:', JSON.stringify(this.state, null, 2));
        },
        
        subscribe: function(callback) {
            this.listeners.push(callback);
            return function() {
                var index = this.listeners.indexOf(callback);
                if (index > -1) {
                    this.listeners.splice(index, 1);
                }
            }.bind(this);
        },
        
        notify: function() {
            var self = this;
            this.listeners.forEach(function(callback) {
                callback(self.state);
            });
        },
        
        setState: function(newState) {
            var self = this;
            var changed = false;
            
            Object.keys(newState).forEach(function(key) {
                if (self.state.hasOwnProperty(key) && self.state[key] !== newState[key]) {
                    self.state[key] = newState[key];
                    changed = true;
                    console.log('[PatientContextStore] 字段变更:', key, '→', newState[key]);
                }
            });
            
            if (changed) {
                this.state.lastUpdateTime = new Date().toISOString();
                this.saveToStorage();
                this.notify();
                console.log('[PatientContextStore] ✅ 状态已更新');
                console.log('[PatientContextStore] 当前完整状态:', JSON.stringify(this.state, null, 2));
            }
            
            return changed;
        },
        
        getState: function() {
            return Object.assign({}, this.state);
        },
        
        extractFromEditor: function(editor, docTitle) {
            console.log('[PatientContextStore] ========== 开始从编辑器提取上下文 ==========');
            console.log('[PatientContextStore] 文档标题:', docTitle);
            
            if (!editor || !editor.editor) {
                console.warn('[PatientContextStore] ⚠️ 编辑器实例不存在');
                return null;
            }
            
            try {
                var $body = $(editor.editor.document.getBody().$);
                var extractedData = {};
                
                var fieldMappings = {
                    '主诉': 'chiefComplaint',
                    '现病史': 'presentIllness',
                    '既往史': 'pastHistory',
                    '初步诊断': 'primaryDiagnosis',
                    '入院诊断': 'primaryDiagnosis',
                    '诊断': 'primaryDiagnosis',
                    '入院时间': 'admissionDate'
                };
                
                var self = this;
                $body.find('[data-hm-name]').each(function() {
                    var $el = $(this);
                    var name = $el.attr('data-hm-name');
                    var value = self.getElementValue($el);
                    
                    if (name && value && fieldMappings[name]) {
                        var fieldName = fieldMappings[name];
                        if (!extractedData[fieldName]) {
                            extractedData[fieldName] = value;
                            console.log('[PatientContextStore] 提取字段: [' + name + '] → [' + fieldName + ']');
                            console.log('[PatientContextStore] 字段值: ' + value.substring(0, 100) + (value.length > 100 ? '...' : ''));
                        }
                    }
                });
                
                if (docTitle) {
                    extractedData.sourceDocument = docTitle;
                }
                
                console.log('[PatientContextStore] 提取结果:', JSON.stringify(extractedData, null, 2));
                
                return extractedData;
                
            } catch (error) {
                console.error('[PatientContextStore] ❌ 提取失败:', error);
                return null;
            }
        },
        
        getElementValue: function($el) {
            var $content = $el.find('.new-textbox-content');
            if ($content.length > 0) {
                var text = $content.text().trim();
                if (text && !this.isPlaceholder(text, $el.attr('data-hm-name'))) {
                    return text;
                }
            }
            
            var text = $el.text().trim();
            if (text && !this.isPlaceholder(text, $el.attr('data-hm-name'))) {
                return text;
            }
            
            return '';
        },
        
        isPlaceholder: function(text, fieldName) {
            var placeholders = [
                fieldName,
                fieldName + '待完善',
                fieldName + '待填写',
                '请输入',
                '待完善',
                '待填写',
                '医疗机构名称'
            ];
            
            for (var i = 0; i < placeholders.length; i++) {
                if (text === placeholders[i]) {
                    return true;
                }
            }
            
            return false;
        },
        
        saveFromEditor: function(editor, docTitle) {
            console.log('[PatientContextStore] ========== 保存编辑器上下文 ==========');
            
            var extractedData = this.extractFromEditor(editor, docTitle);
            
            if (extractedData && Object.keys(extractedData).length > 0) {
                var changed = this.setState(extractedData);
                
                if (changed) {
                    console.log('[PatientContextStore] ✅ 患者上下文已成功保存到 Store');
                    console.log('[PatientContextStore] 📋 保存内容:');
                    console.log('   - 主诉:', this.state.chiefComplaint || '(空)');
                    console.log('   - 现病史:', (this.state.presentIllness || '(空)').substring(0, 50) + '...');
                    console.log('   - 既往史:', (this.state.pastHistory || '(空)').substring(0, 50) + '...');
                    console.log('   - 初步诊断:', this.state.primaryDiagnosis || '(空)');
                    console.log('   - 入院时间:', this.state.admissionDate || '(空)');
                    console.log('   - 来源文档:', this.state.sourceDocument || '(空)');
                }
                
                return changed;
            }
            
            return false;
        },
        
        saveToStorage: function() {
            try {
                var data = JSON.stringify(this.state);
                localStorage.setItem(STORAGE_KEY, data);
                console.log('[PatientContextStore] 💾 已持久化到 localStorage');
            } catch (error) {
                console.error('[PatientContextStore] ❌ localStorage 保存失败:', error);
            }
        },
        
        loadFromStorage: function() {
            try {
                var data = localStorage.getItem(STORAGE_KEY);
                if (data) {
                    var parsed = JSON.parse(data);
                    var self = this;
                    Object.keys(parsed).forEach(function(key) {
                        if (self.state.hasOwnProperty(key)) {
                            self.state[key] = parsed[key];
                        }
                    });
                    console.log('[PatientContextStore] 💾 从 localStorage 加载成功');
                }
            } catch (error) {
                console.error('[PatientContextStore] ❌ localStorage 加载失败:', error);
            }
        },
        
        clear: function() {
            console.log('[PatientContextStore] ========== 清空上下文 ==========');
            
            this.state = {
                patientId: '',
                admissionDate: '',
                chiefComplaint: '',
                presentIllness: '',
                pastHistory: '',
                primaryDiagnosis: '',
                lastUpdateTime: null,
                sourceDocument: ''
            };
            
            localStorage.removeItem(STORAGE_KEY);
            this.notify();
            
            console.log('[PatientContextStore] ✅ 上下文已清空');
        },
        
        hasValidContext: function() {
            return !!(this.state.chiefComplaint || this.state.presentIllness || this.state.primaryDiagnosis);
        },
        
        getContextSummary: function() {
            var parts = [];
            
            if (this.state.chiefComplaint) {
                parts.push('主诉: ' + this.state.chiefComplaint);
            }
            if (this.state.primaryDiagnosis) {
                parts.push('诊断: ' + this.state.primaryDiagnosis.split('\n')[0]);
            }
            
            return parts.join(' | ');
        },
        
        logCurrentState: function() {
            console.log('[PatientContextStore] ========== 当前上下文状态 ==========');
            console.log(JSON.stringify(this.state, null, 2));
            console.log('[PatientContextStore] ==========================================');
        }
    };
    
    PatientContextStore.init();
    
    window.PatientContextStore = PatientContextStore;
    
    console.log('[PatientContextStore] 模块加载完成');
    console.log('[PatientContextStore] 使用方法:');
    console.log('  - PatientContextStore.getState() - 获取当前状态');
    console.log('  - PatientContextStore.saveFromEditor(editor, docTitle) - 从编辑器保存上下文');
    console.log('  - PatientContextStore.clear() - 清空上下文');
    console.log('  - PatientContextStore.logCurrentState() - 打印当前状态');
    
})();
