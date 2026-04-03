(function() {
    'use strict';
    
    var HISIntegrationService = {
        API_BASE_URL: 'http://218.75.194.44/api',
        TIMEOUT: 10000,
        currentPatientData: null,
        
        LAB_REFERENCE_RANGES: {
            'WBC': { name: '白细胞计数', unit: '×10^9/L', min: 3.5, max: 9.5 },
            'RBC': { name: '红细胞计数', unit: '×10^12/L', min: 4.3, max: 5.8 },
            'HGB': { name: '血红蛋白', unit: 'g/L', min: 130, max: 175 },
            'HCT': { name: '红细胞压积', unit: '%', min: 40, max: 50 },
            'PLT': { name: '血小板计数', unit: '×10^9/L', min: 125, max: 350 },
            'NEUT%': { name: '中性粒细胞百分比', unit: '%', min: 40, max: 75 },
            'LYMPH%': { name: '淋巴细胞百分比', unit: '%', min: 20, max: 50 },
            'MONO%': { name: '单核细胞百分比', unit: '%', min: 3, max: 10 },
            'EOS%': { name: '嗜酸性粒细胞百分比', unit: '%', min: 0.5, max: 5 },
            'BASO%': { name: '嗜碱性粒细胞百分比', unit: '%', min: 0, max: 1 },
            'CRP': { name: 'C反应蛋白', unit: 'mg/L', min: 0, max: 10 },
            'PCT': { name: '降钙素原', unit: 'ng/mL', min: 0, max: 0.05 },
            'ESR': { name: '血沉', unit: 'mm/h', min: 0, max: 15 },
            'GLU': { name: '血糖', unit: 'mmol/L', min: 3.9, max: 6.1 },
            'BUN': { name: '尿素氮', unit: 'mmol/L', min: 2.9, max: 8.2 },
            'CREA': { name: '肌酐', unit: 'μmol/L', min: 57, max: 111 },
            'UA': { name: '尿酸', unit: 'μmol/L', min: 208, max: 428 },
            'ALT': { name: '谷丙转氨酶', unit: 'U/L', min: 9, max: 50 },
            'AST': { name: '谷草转氨酶', unit: 'U/L', min: 15, max: 40 },
            'ALP': { name: '碱性磷酸酶', unit: 'U/L', min: 45, max: 125 },
            'GGT': { name: '谷氨酰转肽酶', unit: 'U/L', min: 10, max: 60 },
            'TBIL': { name: '总胆红素', unit: 'μmol/L', min: 5, max: 21 },
            'DBIL': { name: '直接胆红素', unit: 'μmol/L', min: 0, max: 8 },
            'ALB': { name: '白蛋白', unit: 'g/L', min: 40, max: 55 },
            'TP': { name: '总蛋白', unit: 'g/L', min: 65, max: 85 },
            'K': { name: '钾', unit: 'mmol/L', min: 3.5, max: 5.3 },
            'Na': { name: '钠', unit: 'mmol/L', min: 137, max: 147 },
            'Cl': { name: '氯', unit: 'mmol/L', min: 99, max: 110 },
            'Ca': { name: '钙', unit: 'mmol/L', min: 2.1, max: 2.6 },
            'cTnI': { name: '肌钙蛋白I', unit: 'ng/mL', min: 0, max: 0.04 },
            'CKMB': { name: '肌酸激酶同工酶', unit: 'U/L', min: 0, max: 25 },
            'BNP': { name: 'B型钠尿肽', unit: 'pg/mL', min: 0, max: 100 },
            'DDimer': { name: 'D-二聚体', unit: 'mg/L', min: 0, max: 0.5 }
        },
        
        init: function() {
            console.log('[HISIntegrationService] 初始化 HIS/LIS 数据适配层');
        },
        
        fetchPatientData: async function(patientId) {
            console.log('[HISIntegrationService] ========== 获取患者数据 ==========');
            console.log('[HISIntegrationService] 患者 ID:', patientId);
            console.log('[HISIntegrationService] API URL:', this.API_BASE_URL + '/patient/' + patientId);
            
            try {
                var response = await this.mockFetchPatientData(patientId);
                
                this.currentPatientData = response;
                
                console.log('[HISIntegrationService] ✅ 数据获取成功');
                
                return response;
                
            } catch (error) {
                console.error('[HISIntegrationService] 获取数据失败:', error);
                throw error;
            }
        },
        
        mockFetchPatientData: function(patientId) {
            var self = this;
            
            return new Promise(function(resolve) {
                setTimeout(function() {
                    var mockData = self.generateMockPatientData(patientId);
                    resolve(mockData);
                }, 1200);
            });
        },
        
        generateMockPatientData: function(patientId) {
            var templates = ['pneumonia', 'mi', 'pe', 'cholecystitis'];
            var template = templates[Math.floor(Math.random() * templates.length)];
            
            var data = {
                patientInfo: {
                    patientId: patientId || 'P' + Date.now().toString().slice(-8),
                    name: '张三',
                    gender: '男',
                    age: 45,
                    department: '内科',
                    bedNo: '12床',
                    admissionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                },
                vitalSigns: {
                    temperature: (37.5 + Math.random() * 1.5).toFixed(1),
                    heartRate: Math.floor(80 + Math.random() * 30),
                    bloodPressure: {
                        systolic: Math.floor(120 + Math.random() * 30),
                        diastolic: Math.floor(80 + Math.random() * 15)
                    },
                    respiratoryRate: Math.floor(18 + Math.random() * 6),
                    oxygenSaturation: Math.floor(92 + Math.random() * 7)
                },
                labResults: this.generateMockLabResults(template),
                imagingResults: this.generateMockImagingResults(template),
                allergies: ['青霉素过敏'],
                currentMedications: []
            };
            
            return data;
        },
        
        generateMockLabResults: function(template) {
            var results = {
                bloodRoutine: {
                    examTime: new Date().toISOString(),
                    items: []
                },
                biochemistry: {
                    examTime: new Date().toISOString(),
                    items: []
                },
                coagulation: {
                    examTime: new Date().toISOString(),
                    items: []
                },
                cardiacMarkers: {
                    examTime: new Date().toISOString(),
                    items: []
                }
            };
            
            if (template === 'pneumonia') {
                results.bloodRoutine.items = [
                    { code: 'WBC', name: '白细胞计数', value: 14.5, unit: '×10^9/L', refRange: '3.5-9.5', flag: 'H' },
                    { code: 'NEUT%', name: '中性粒细胞百分比', value: 88, unit: '%', refRange: '40-75', flag: 'H' },
                    { code: 'LYMPH%', name: '淋巴细胞百分比', value: 8, unit: '%', refRange: '20-50', flag: 'L' },
                    { code: 'HGB', name: '血红蛋白', value: 128, unit: 'g/L', refRange: '130-175', flag: 'L' },
                    { code: 'PLT', name: '血小板计数', value: 186, unit: '×10^9/L', refRange: '125-350', flag: 'N' }
                ];
                results.biochemistry.items = [
                    { code: 'CRP', name: 'C反应蛋白', value: 68, unit: 'mg/L', refRange: '0-10', flag: 'H' },
                    { code: 'PCT', name: '降钙素原', value: 0.8, unit: 'ng/mL', refRange: '<0.05', flag: 'H' },
                    { code: 'ALT', name: '谷丙转氨酶', value: 35, unit: 'U/L', refRange: '9-50', flag: 'N' },
                    { code: 'CREA', name: '肌酐', value: 78, unit: 'μmol/L', refRange: '57-111', flag: 'N' }
                ];
            } else if (template === 'mi') {
                results.bloodRoutine.items = [
                    { code: 'WBC', name: '白细胞计数', value: 11.2, unit: '×10^9/L', refRange: '3.5-9.5', flag: 'H' },
                    { code: 'NEUT%', name: '中性粒细胞百分比', value: 78, unit: '%', refRange: '40-75', flag: 'H' }
                ];
                results.cardiacMarkers.items = [
                    { code: 'cTnI', name: '肌钙蛋白I', value: 5.8, unit: 'ng/mL', refRange: '<0.04', flag: 'H' },
                    { code: 'CKMB', name: '肌酸激酶同工酶', value: 89, unit: 'U/L', refRange: '0-25', flag: 'H' },
                    { code: 'BNP', name: 'B型钠尿肽', value: 1850, unit: 'pg/mL', refRange: '<100', flag: 'H' }
                ];
                results.coagulation.items = [
                    { code: 'DDimer', name: 'D-二聚体', value: 1.2, unit: 'mg/L', refRange: '<0.5', flag: 'H' }
                ];
            } else if (template === 'pe') {
                results.bloodRoutine.items = [
                    { code: 'WBC', name: '白细胞计数', value: 9.8, unit: '×10^9/L', refRange: '3.5-9.5', flag: 'N' }
                ];
                results.coagulation.items = [
                    { code: 'DDimer', name: 'D-二聚体', value: 3.8, unit: 'mg/L', refRange: '<0.5', flag: 'H' }
                ];
                results.biochemistry.items = [
                    { code: 'BNP', name: 'B型钠尿肽', value: 420, unit: 'pg/mL', refRange: '<100', flag: 'H' }
                ];
            } else {
                results.bloodRoutine.items = [
                    { code: 'WBC', name: '白细胞计数', value: 13.2, unit: '×10^9/L', refRange: '3.5-9.5', flag: 'H' },
                    { code: 'NEUT%', name: '中性粒细胞百分比', value: 82, unit: '%', refRange: '40-75', flag: 'H' }
                ];
                results.biochemistry.items = [
                    { code: 'TBIL', name: '总胆红素', value: 35, unit: 'μmol/L', refRange: '5-21', flag: 'H' },
                    { code: 'DBIL', name: '直接胆红素', value: 18, unit: 'μmol/L', refRange: '0-8', flag: 'H' },
                    { code: 'ALT', name: '谷丙转氨酶', value: 85, unit: 'U/L', refRange: '9-50', flag: 'H' },
                    { code: 'ALP', name: '碱性磷酸酶', value: 156, unit: 'U/L', refRange: '45-125', flag: 'H' }
                ];
            }
            
            return results;
        },
        
        generateMockImagingResults: function(template) {
            var results = [];
            
            if (template === 'pneumonia') {
                results.push({
                    examType: '胸部CT',
                    examTime: new Date().toISOString(),
                    report: '右下肺大片实变影，可见支气管充气征，考虑右下肺炎症。双侧胸腔少量积液。'
                });
                results.push({
                    examType: '胸部X线',
                    examTime: new Date().toISOString(),
                    report: '右下肺野大片密度增高影，心影大小形态正常。'
                });
            } else if (template === 'mi') {
                results.push({
                    examType: '心电图',
                    examTime: new Date().toISOString(),
                    report: '窦性心律，II、III、aVF导联ST段抬高0.2-0.3mV，T波倒置，提示下壁心肌梗死。'
                });
                results.push({
                    examType: '心脏超声',
                    examTime: new Date().toISOString(),
                    report: '左室下壁运动减弱，LVEF 52%，左房稍大。'
                });
            } else if (template === 'pe') {
                results.push({
                    examType: '肺动脉CTA',
                    examTime: new Date().toISOString(),
                    report: '右肺动脉主干及分支可见充盈缺损，提示肺动脉栓塞。右心室稍大。'
                });
            } else {
                results.push({
                    examType: '腹部超声',
                    examTime: new Date().toISOString(),
                    report: '胆囊增大，壁增厚约6mm，胆囊内可见多发强回声光团伴声影，最大约12mm，考虑胆囊结石伴胆囊炎。'
                });
            }
            
            return results;
        },
        
        normalizeLabResults: function(rawData) {
            console.log('[HISIntegrationService] ========== 数据清洗与展平 ==========');
            
            if (!rawData || !rawData.labResults) {
                console.warn('[HISIntegrationService] 无有效检验数据');
                return {
                    formatted: '',
                    abnormalItems: [],
                    summary: ''
                };
            }
            
            var labResults = rawData.labResults;
            var formattedLines = [];
            var abnormalItems = [];
            var categories = {
                bloodRoutine: '血常规',
                biochemistry: '生化',
                coagulation: '凝血',
                cardiacMarkers: '心肌标志物'
            };
            
            for (var category in labResults) {
                if (labResults[category] && labResults[category].items && labResults[category].items.length > 0) {
                    var categoryName = categories[category] || category;
                    var items = labResults[category].items;
                    
                    formattedLines.push('【' + categoryName + '】');
                    
                    items.forEach(function(item) {
                        var flag = '';
                        var flagText = '';
                        
                        if (item.flag === 'H') {
                            flag = '↑';
                            flagText = '偏高';
                            abnormalItems.push({
                                code: item.code,
                                name: item.name,
                                value: item.value,
                                unit: item.unit,
                                refRange: item.refRange,
                                direction: 'high'
                            });
                        } else if (item.flag === 'L') {
                            flag = '↓';
                            flagText = '偏低';
                            abnormalItems.push({
                                code: item.code,
                                name: item.name,
                                value: item.value,
                                unit: item.unit,
                                refRange: item.refRange,
                                direction: 'low'
                            });
                        }
                        
                        var line = item.name + ': ' + item.value + ' ' + item.unit;
                        if (flag) {
                            line += ' (' + flag + ')';
                        }
                        line += ' [参考值: ' + item.refRange + ']';
                        
                        formattedLines.push(line);
                    });
                    
                    formattedLines.push('');
                }
            }
            
            var summary = '';
            if (abnormalItems.length > 0) {
                summary = '发现 ' + abnormalItems.length + ' 项异常指标：';
                abnormalItems.forEach(function(item, index) {
                    if (index < 5) {
                        summary += item.name + (item.direction === 'high' ? '↑' : '↓');
                        if (index < abnormalItems.length - 1 && index < 4) {
                            summary += '、';
                        }
                    }
                });
                if (abnormalItems.length > 5) {
                    summary += '等';
                }
            }
            
            var result = {
                formatted: formattedLines.join('\n'),
                abnormalItems: abnormalItems,
                summary: summary,
                abnormalCount: abnormalItems.length
            };
            
            console.log('[HISIntegrationService] 清洗完成，异常项:', abnormalItems.length);
            
            return result;
        },
        
        normalizeVitalSigns: function(rawData) {
            if (!rawData || !rawData.vitalSigns) {
                return '';
            }
            
            var vs = rawData.vitalSigns;
            var lines = [];
            
            lines.push('【生命体征】');
            lines.push('体温: ' + vs.temperature + '℃');
            lines.push('心率: ' + vs.heartRate + '次/分');
            lines.push('血压: ' + vs.bloodPressure.systolic + '/' + vs.bloodPressure.diastolic + 'mmHg');
            lines.push('呼吸: ' + vs.respiratoryRate + '次/分');
            lines.push('血氧饱和度: ' + vs.oxygenSaturation + '%');
            
            return lines.join('\n');
        },
        
        normalizeImagingResults: function(rawData) {
            if (!rawData || !rawData.imagingResults || rawData.imagingResults.length === 0) {
                return '';
            }
            
            var lines = [];
            lines.push('【影像学检查】');
            
            rawData.imagingResults.forEach(function(result) {
                lines.push(result.examType + ': ' + result.report);
            });
            
            return lines.join('\n');
        },
        
        getFormattedDataForPrompt: function(rawData) {
            var labData = this.normalizeLabResults(rawData);
            var vitalSigns = this.normalizeVitalSigns(rawData);
            var imaging = this.normalizeImagingResults(rawData);
            
            var parts = [];
            
            if (vitalSigns) {
                parts.push(vitalSigns);
            }
            
            if (labData.formatted) {
                parts.push(labData.formatted);
            }
            
            if (imaging) {
                parts.push(imaging);
            }
            
            return parts.join('\n\n');
        },
        
        getCurrentPatientData: function() {
            return this.currentPatientData;
        },
        
        hasCurrentData: function() {
            return this.currentPatientData !== null;
        },
        
        clearCurrentData: function() {
            this.currentPatientData = null;
            console.log('[HISIntegrationService] 已清空当前患者数据');
        }
    };
    
    HISIntegrationService.init();
    
    window.HISIntegrationService = HISIntegrationService;
    
    console.log('[HISIntegrationService] 模块加载完成');
    
})();
