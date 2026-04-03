(function() {
    'use strict';
    
    var STORAGE_KEY = 'hm_editor_patient_context';
    
    var GlobalPatientContext = {
        currentPatientId: null,
        
        context: {
            patientId: null,
            patientName: '',
            gender: '',
            age: '',
            admissionDate: '',
            diagnosis: '',
            presentIllness: '',
            pastHistory: '',
            chiefComplaint: '',
            vitalSigns: '',
            treatmentPlan: '',
            lastUpdateTime: null,
            sourceDocument: null
        },
        
        init: function() {
            console.log('[GlobalPatientContext] 初始化全局患者上下文管理器');
            this.loadFromStorage();
        },
        
        setPatientId: function(patientId) {
            this.currentPatientId = patientId;
            this.context.patientId = patientId;
            console.log('[GlobalPatientContext] 设置患者ID:', patientId);
        },
        
        extractFromEditor: async function(editor) {
            console.log('[GlobalPatientContext] ========== 开始提取患者上下文 ==========');
            
            if (!editor || !editor.editor) {
                console.warn('[GlobalPatientContext] 编辑器实例不存在');
                return null;
            }
            
            try {
                var $body = $(editor.editor.document.getBody().$);
                var extractedData = {};
                
                var fieldMappings = {
                    '姓名': 'patientName',
                    '性别': 'gender',
                    '年龄': 'age',
                    '入院时间': 'admissionDate',
                    '初步诊断': 'diagnosis',
                    '入院诊断': 'diagnosis',
                    '诊断': 'diagnosis',
                    '出院诊断': 'diagnosis',
                    '现病史': 'presentIllness',
                    '既往史': 'pastHistory',
                    '主诉': 'chiefComplaint',
                    '体格检查': 'vitalSigns',
                    '诊疗计划': 'treatmentPlan'
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
                            console.log('[GlobalPatientContext] 提取字段:', name, '→', fieldName, ':', value.substring(0, 50) + '...');
                        }
                    }
                });
                
                if (Object.keys(extractedData).length > 0) {
                    this.updateContext(extractedData);
                }
                
                console.log('[GlobalPatientContext] ========== 患者上下文提取完成 ==========');
                console.log('[GlobalPatientContext] 当前上下文:', this.context);
                
                return this.context;
                
            } catch (error) {
                console.error('[GlobalPatientContext] 提取患者上下文失败:', error);
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
                '待填写'
            ];
            
            for (var i = 0; i < placeholders.length; i++) {
                if (text === placeholders[i]) {
                    return true;
                }
            }
            
            return false;
        },
        
        updateContext: function(data) {
            var self = this;
            Object.keys(data).forEach(function(key) {
                if (data[key] && self.context.hasOwnProperty(key)) {
                    self.context[key] = data[key];
                }
            });
            
            this.context.lastUpdateTime = new Date().toISOString();
            this.saveToStorage();
            
            console.log('[GlobalPatientContext] 上下文已更新');
        },
        
        getContext: function() {
            return this.context;
        },
        
        getDiagnosis: function() {
            return this.context.diagnosis || '';
        },
        
        getPresentIllness: function() {
            return this.context.presentIllness || '';
        },
        
        getPastHistory: function() {
            return this.context.pastHistory || '';
        },
        
        getChiefComplaint: function() {
            return this.context.chiefComplaint || '';
        },
        
        getPatientSummary: function() {
            var parts = [];
            
            if (this.context.patientName) {
                parts.push('患者：' + this.context.patientName);
            }
            if (this.context.gender) {
                parts.push('性别：' + this.context.gender);
            }
            if (this.context.age) {
                parts.push('年龄：' + this.context.age);
            }
            
            return parts.join('，');
        },
        
        getClinicalBackground: function() {
            var background = '';
            
            if (this.context.chiefComplaint) {
                background += '【主诉】' + this.context.chiefComplaint + '\n\n';
            }
            
            if (this.context.presentIllness) {
                background += '【现病史】' + this.context.presentIllness + '\n\n';
            }
            
            if (this.context.pastHistory) {
                background += '【既往史】' + this.context.pastHistory + '\n\n';
            }
            
            if (this.context.diagnosis) {
                background += '【诊断】' + this.context.diagnosis + '\n\n';
            }
            
            if (this.context.treatmentPlan) {
                background += '【诊疗计划】' + this.context.treatmentPlan + '\n\n';
            }
            
            return background;
        },
        
        hasValidContext: function() {
            return !!(this.context.diagnosis || this.context.presentIllness || this.context.pastHistory);
        },
        
        saveToStorage: function() {
            try {
                var data = JSON.stringify(this.context);
                localStorage.setItem(STORAGE_KEY, data);
                console.log('[GlobalPatientContext] 已保存到 LocalStorage');
            } catch (error) {
                console.error('[GlobalPatientContext] 保存到 LocalStorage 失败:', error);
            }
        },
        
        loadFromStorage: function() {
            try {
                var data = localStorage.getItem(STORAGE_KEY);
                if (data) {
                    this.context = JSON.parse(data);
                    console.log('[GlobalPatientContext] 从 LocalStorage 加载成功');
                    console.log('[GlobalPatientContext] 加载的上下文:', this.context);
                }
            } catch (error) {
                console.error('[GlobalPatientContext] 从 LocalStorage 加载失败:', error);
            }
        },
        
        clearContext: function() {
            this.context = {
                patientId: null,
                patientName: '',
                gender: '',
                age: '',
                admissionDate: '',
                diagnosis: '',
                presentIllness: '',
                pastHistory: '',
                chiefComplaint: '',
                vitalSigns: '',
                treatmentPlan: '',
                lastUpdateTime: null,
                sourceDocument: null
            };
            
            localStorage.removeItem(STORAGE_KEY);
            console.log('[GlobalPatientContext] 上下文已清空');
        },
        
        isProgressNote: function(docTitle) {
            if (!docTitle) return false;
            
            var keywords = ['病程记录', '日常病程', '首次病程', '查房记录', '上级医师查房'];
            
            for (var i = 0; i < keywords.length; i++) {
                if (docTitle.indexOf(keywords[i]) !== -1) {
                    return true;
                }
            }
            
            return false;
        },
        
        isAdmissionRecord: function(docTitle) {
            if (!docTitle) return false;
            
            var keywords = ['入院记录', '住院病历'];
            
            for (var i = 0; i < keywords.length; i++) {
                if (docTitle.indexOf(keywords[i]) !== -1) {
                    return true;
                }
            }
            
            return false;
        }
    };
    
    GlobalPatientContext.init();
    
    window.GlobalPatientContext = GlobalPatientContext;
    
    console.log('[GlobalPatientContext] 模块加载完成');
    
})();
