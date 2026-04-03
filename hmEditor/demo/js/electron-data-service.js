(function() {
    'use strict';
    
    var ElectronDataService = {
        isElectron: false,
        currentUser: null,
        
        init: function() {
            this.isElectron = !!(window && window.process && window.process.type);
            
            if (this.isElectron && window.electronAPI) {
                console.log('[ElectronDataService] 运行在 Electron 环境');
                this.setupElectronIntegration();
            } else {
                console.log('[ElectronDataService] 运行在浏览器环境，使用 localStorage');
            }
        },
        
        setupElectronIntegration: function() {
            var self = this;
            
            if (window.AuditLogger) {
                var originalLogAudit = window.AuditLogger.logAudit;
                window.AuditLogger.logAudit = function(doctorFinalInput) {
                    var log = originalLogAudit.call(this, doctorFinalInput);
                    
                    if (self.currentUser) {
                        log.doctorId = self.currentUser.doctor_id;
                    }
                    
                    window.electronAPI.audit.log(log)
                        .then(function(result) {
                            if (result.success) {
                                console.log('[ElectronDataService] 审计日志已同步到本地数据库');
                            }
                        })
                        .catch(function(error) {
                            console.error('[ElectronDataService] 审计日志同步失败:', error);
                        });
                    
                    return log;
                };
            }
            
            if (window.PatientContextStore) {
                var originalSave = window.PatientContextStore.save;
                window.PatientContextStore.save = function(state) {
                    originalSave.call(this, state);
                    
                    if (state.patientId) {
                        window.electronAPI.patient.saveContext({
                            patientId: state.patientId,
                            chiefComplaint: state.chiefComplaint,
                            presentIllness: state.presentIllness,
                            pastHistory: state.pastHistory,
                            primaryDiagnosis: state.primaryDiagnosis,
                            admissionDate: state.admissionDate
                        }).then(function(result) {
                            if (result.success) {
                                console.log('[ElectronDataService] 患者上下文已同步到本地数据库');
                            }
                        });
                    }
                };
            }
            
            window.electronAPI.onMenuAction(function(action) {
                console.log('[ElectronDataService] 菜单操作:', action);
                
                switch (action) {
                    case 'save':
                        if (window.tabManager) {
                            console.log('[ElectronDataService] 触发保存操作');
                        }
                        break;
                    case 'export-pdf':
                        self.exportToPDF();
                        break;
                    case 'view-audit':
                        self.showAuditLogs();
                        break;
                }
            });
        },
        
        login: async function(doctorId, name, department) {
            if (this.isElectron && window.electronAPI) {
                var result = await window.electronAPI.user.login(doctorId, name, department);
                if (result.success) {
                    this.currentUser = result.user;
                    console.log('[ElectronDataService] 用户登录成功:', result.user);
                }
                return result;
            } else {
                this.currentUser = {
                    doctor_id: doctorId,
                    name: name,
                    department: department
                };
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                return { success: true, user: this.currentUser };
            }
        },
        
        logout: function() {
            this.currentUser = null;
            if (!this.isElectron) {
                localStorage.removeItem('currentUser');
            }
        },
        
        getCurrentUser: async function() {
            if (this.currentUser) {
                return this.currentUser;
            }
            
            if (this.isElectron && window.electronAPI) {
                var doctorId = localStorage.getItem('currentDoctorId');
                if (doctorId) {
                    var result = await window.electronAPI.user.getCurrent(doctorId);
                    if (result.success) {
                        this.currentUser = result.user;
                    }
                }
            } else {
                var stored = localStorage.getItem('currentUser');
                if (stored) {
                    this.currentUser = JSON.parse(stored);
                }
            }
            
            return this.currentUser;
        },
        
        getPatientContext: async function(patientId) {
            if (this.isElectron && window.electronAPI) {
                var result = await window.electronAPI.patient.getContext(patientId);
                return result.success ? result.context : null;
            } else {
                var stored = localStorage.getItem('patientContext_' + patientId);
                return stored ? JSON.parse(stored) : null;
            }
        },
        
        getAuditLogs: async function(filters) {
            if (this.isElectron && window.electronAPI) {
                var result = await window.electronAPI.audit.getLogs(filters || {});
                return result.success ? result.logs : [];
            } else {
                var stored = localStorage.getItem('med_audit_logs');
                return stored ? JSON.parse(stored) : [];
            }
        },
        
        syncToCloud: async function() {
            if (this.isElectron && window.electronAPI) {
                return await window.electronAPI.sync.toCloud();
            }
            return { success: false, message: '非 Electron 环境' };
        },
        
        backupData: async function() {
            if (this.isElectron && window.electronAPI) {
                return await window.electronAPI.backup.export();
            }
            return { success: false, message: '非 Electron 环境' };
        },
        
        exportToPDF: function() {
            console.log('[ElectronDataService] 导出 PDF...');
            
            if (window.tabManager) {
                window.tabManager.getCurrentEditor().then(function(editor) {
                    if (editor && editor.editor) {
                        var content = editor.editor.getData();
                        console.log('[ElectronDataService] 获取到编辑器内容，长度:', content.length);
                    }
                });
            }
        },
        
        showAuditLogs: async function() {
            var logs = await this.getAuditLogs({ limit: 50 });
            console.log('[ElectronDataService] 审计日志:', logs);
        },
        
        getSetting: async function(key) {
            if (this.isElectron && window.electronAPI) {
                var result = await window.electronAPI.settings.get(key);
                return result.value;
            }
            return localStorage.getItem('setting_' + key);
        },
        
        setSetting: async function(key, value) {
            if (this.isElectron && window.electronAPI) {
                return await window.electronAPI.settings.set(key, value);
            }
            localStorage.setItem('setting_' + key, value);
            return { success: true };
        }
    };
    
    ElectronDataService.init();
    
    window.ElectronDataService = ElectronDataService;
    
    console.log('[ElectronDataService] 模块加载完成');
    
})();
