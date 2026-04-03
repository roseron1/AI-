(function() {
    'use strict';
    
    var EMR_TEMPLATES = {
        "admission_note": {
            templateId: "DOC001",
            templateName: "入院记录",
            requiredFields: [
                "主诉",
                "现病史",
                "既往史",
                "个人史",
                "婚育史",
                "家族史",
                "体格检查",
                "辅助检查",
                "初步诊断"
            ],
            fieldMapping: {
                "主诉": "chiefComplaint",
                "现病史": "presentIllness",
                "既往史": "pastHistory",
                "个人史": "personalHistory",
                "婚育史": "maritalHistory",
                "家族史": "familyHistory",
                "体格检查": "physicalExam",
                "辅助检查": "auxiliaryExam",
                "初步诊断": "preliminaryDiagnosis"
            },
            clinicalFocus: "全面收集病史，现病史需围绕主诉展开，详细描述症状的PQRST特征（诱因、性质、部位、严重程度、时间特点），必须包含阴性鉴别体征。既往史/个人史/家族史若未提供明确阳性信息，生成标准阴性无异常描述。体格检查需按系统顺序描述，重点突出与主诉相关的阳性体征。",
            promptTemplate: "你是一名三甲医院内科主治医师，正在撰写【入院记录】。\n\n请根据提供的临床信息，生成完整的入院记录。\n\n核心要求：\n1. 主诉：简洁明确，包含主要症状+时间\n2. 现病史：围绕主诉展开，描述起病情况、症状演变、伴随症状、诊治经过\n3. 既往史/个人史/婚育史/家族史：如无特殊，使用标准阴性描述\n4. 体格检查：按系统顺序，重点突出阳性体征\n5. 初步诊断：列出可能的诊断，按可能性排序",
            sections: [
                {
                    id: "subjective",
                    title: "主观资料",
                    fields: ["主诉", "现病史", "既往史", "个人史", "婚育史", "家族史"]
                },
                {
                    id: "objective",
                    title: "客观资料",
                    fields: ["体格检查", "辅助检查"]
                },
                {
                    id: "assessment",
                    title: "评估",
                    fields: ["初步诊断"]
                }
            ]
        },
        
        "first_progress_note": {
            templateId: "DOC002",
            templateName: "首次病程记录",
            requiredFields: [
                "病例特点",
                "诊断依据",
                "鉴别诊断",
                "诊疗计划"
            ],
            fieldMapping: {
                "病例特点": "caseCharacteristics",
                "诊断依据": "diagnosticRationale",
                "鉴别诊断": "differentialDiagnosis",
                "诊疗计划": "treatmentPlan"
            },
            clinicalFocus: "这是首次病程记录（首程）。无需重复详细现病史，重点提炼【病例特点】（3-5条精炼总结）。重点撰写【诊断依据】和严格的【鉴别诊断】（需列出2-3个相似疾病并给出排除理由）。【诊疗计划】需分点详细列出分级护理、饮食、核心用药方案及拟完善的检查。",
            promptTemplate: "你是一名三甲医院内科主治医师，正在撰写【首次病程记录】。\n\n请根据入院记录和患者信息，生成首程记录。\n\n核心要求：\n1. 病例特点：提炼3-5条核心要点，不重复现病史细节\n2. 诊断依据：列出支持诊断的关键证据\n3. 鉴别诊断：列出2-3个需鉴别的疾病，并说明排除理由\n4. 诊疗计划：分点列出护理级别、饮食、检查、用药等",
            sections: [
                {
                    id: "characteristics",
                    title: "病例特点",
                    fields: ["病例特点"]
                },
                {
                    id: "diagnosis",
                    title: "诊断分析",
                    fields: ["诊断依据", "鉴别诊断"]
                },
                {
                    id: "plan",
                    title: "诊疗计划",
                    fields: ["诊疗计划"]
                }
            ]
        },
        
        "daily_progress_note": {
            templateId: "DOC003",
            templateName: "日常病程记录",
            requiredFields: [
                "主观症状",
                "客观检查",
                "分析评估",
                "诊疗计划"
            ],
            fieldMapping: {
                "主观症状": "subjective",
                "客观检查": "objective",
                "分析评估": "assessment",
                "诊疗计划": "plan"
            },
            clinicalFocus: "精简、精准。基于患者前情提要，重点描述今日（S）主观症状的动态变化和（O）新出的化验报告/检查结果。必须在（A）中给出对治疗效果的评价，并在（P）中指明医嘱是否需调整。病程记录应体现临床思维过程。",
            promptTemplate: "你是一名三甲医院内科主治医师，正在撰写【日常病程记录】。\n\n请根据患者前情提要和今日新发情况，生成病程记录。\n\n核心要求：\n1. 主观症状(S)：描述患者今日主观感受的变化\n2. 客观检查(O)：记录今日查体发现和新出的检验检查结果\n3. 分析评估(A)：评价治疗效果，分析病情变化\n4. 诊疗计划(P)：根据评估调整治疗方案",
            sections: [
                {
                    id: "soap_s",
                    title: "S - 主观",
                    fields: ["主观症状"]
                },
                {
                    id: "soap_o",
                    title: "O - 客观",
                    fields: ["客观检查"]
                },
                {
                    id: "soap_a",
                    title: "A - 评估",
                    fields: ["分析评估"]
                },
                {
                    id: "soap_p",
                    title: "P - 计划",
                    fields: ["诊疗计划"]
                }
            ]
        },
        
        "discharge_summary": {
            templateId: "DOC004",
            templateName: "出院记录",
            requiredFields: [
                "入院情况",
                "住院经过",
                "出院情况",
                "出院医嘱"
            ],
            fieldMapping: {
                "入院情况": "admissionCondition",
                "住院经过": "hospitalCourse",
                "出院情况": "dischargeCondition",
                "出院医嘱": "dischargeOrders"
            },
            clinicalFocus: "极其简练地总结【入院情况】。高度提炼【住院经过】（做了什么关键检查，确诊了什么，用了什么核心药物或手术，病情转归如何）。详细撰写【出院医嘱】（包含带药指导、饮食起居调理、注意事项及复诊时间）。",
            promptTemplate: "你是一名三甲医院内科主治医师，正在撰写【出院记录】。\n\n请根据患者住院期间的诊疗过程，生成出院记录。\n\n核心要求：\n1. 入院情况：简述入院时主要症状和诊断\n2. 住院经过：提炼关键检查、确诊结果、核心治疗\n3. 出院情况：描述出院时病情和恢复状态\n4. 出院医嘱：详细列出带药、饮食、活动、复诊等指导",
            sections: [
                {
                    id: "admission",
                    title: "入院情况",
                    fields: ["入院情况"]
                },
                {
                    id: "course",
                    title: "住院经过",
                    fields: ["住院经过"]
                },
                {
                    id: "discharge",
                    title: "出院情况",
                    fields: ["出院情况"]
                },
                {
                    id: "orders",
                    title: "出院医嘱",
                    fields: ["出院医嘱"]
                }
            ]
        },
        
        "handover_note": {
            templateId: "DOC005",
            templateName: "交接班记录",
            requiredFields: [
                "患者概况",
                "重点病情",
                "待办事项",
                "注意事项"
            ],
            fieldMapping: {
                "患者概况": "patientOverview",
                "重点病情": "keyCondition",
                "待办事项": "pendingTasks",
                "注意事项": "specialNotes"
            },
            clinicalFocus: "交接班记录需确保医疗安全连续性。简明扼要地总结患者当前状态，突出需要关注的风险点和待处理的医嘱。接班医师应能快速掌握患者核心情况，确保诊疗不中断。",
            promptTemplate: "你是一名三甲医院内科住院医师，正在撰写【交接班记录】。\n\n请根据患者住院情况，生成交接班记录。\n\n核心要求：\n1. 患者概况：床号、诊断、住院天数、当前状态\n2. 重点病情：今日病情变化、关键检查结果\n3. 待办事项：需完成的检查、治疗、会诊等\n4. 注意事项：需特别观察的症状、可能的风险",
            sections: [
                {
                    id: "overview",
                    title: "患者概况",
                    fields: ["患者概况"]
                },
                {
                    id: "condition",
                    title: "重点病情",
                    fields: ["重点病情"]
                },
                {
                    id: "tasks",
                    title: "待办事项",
                    fields: ["待办事项"]
                },
                {
                    id: "notes",
                    title: "注意事项",
                    fields: ["注意事项"]
                }
            ]
        },
        
        "stage_summary": {
            templateId: "DOC006",
            templateName: "阶段小结",
            requiredFields: [
                "诊疗经过",
                "目前情况",
                "存在问题",
                "下一步计划"
            ],
            fieldMapping: {
                "诊疗经过": "treatmentCourse",
                "目前情况": "currentStatus",
                "存在问题": "currentIssues",
                "下一步计划": "nextPlan"
            },
            clinicalFocus: "阶段小结是对住院时间较长患者（通常≥1个月）的阶段性总结。需全面回顾诊疗经过，客观评价治疗效果，分析存在的问题，制定下一步诊疗方向。",
            promptTemplate: "你是一名三甲医院内科主治医师，正在撰写【阶段小结】。\n\n请根据患者住院期间的诊疗情况，生成阶段小结。\n\n核心要求：\n1. 诊疗经过：回顾本阶段的主要诊疗措施\n2. 目前情况：评估当前病情和治疗效果\n3. 存在问题：分析诊疗中的困难和未解决的问题\n4. 下一步计划：制定后续诊疗方案",
            sections: [
                {
                    id: "course",
                    title: "诊疗经过",
                    fields: ["诊疗经过"]
                },
                {
                    id: "status",
                    title: "目前情况",
                    fields: ["目前情况"]
                },
                {
                    id: "issues",
                    title: "存在问题",
                    fields: ["存在问题"]
                },
                {
                    id: "plan",
                    title: "下一步计划",
                    fields: ["下一步计划"]
                }
            ]
        }
    };
    
    var EmrTemplateConfig = {
        templates: EMR_TEMPLATES,
        
        getTemplate: function(templateId) {
            for (var key in this.templates) {
                if (this.templates[key].templateId === templateId) {
                    return this.templates[key];
                }
            }
            return null;
        },
        
        getTemplateByKey: function(key) {
            return this.templates[key] || null;
        },
        
        getTemplateByName: function(name) {
            for (var key in this.templates) {
                if (this.templates[key].templateName === name) {
                    return this.templates[key];
                }
                if (name.indexOf(this.templates[key].templateName) !== -1) {
                    return this.templates[key];
                }
            }
            return null;
        },
        
        detectTemplate: function(docTitle) {
            if (!docTitle) return null;
            
            var title = docTitle.toLowerCase();
            
            if (title.indexOf('入院') !== -1) {
                return this.templates.admission_note;
            }
            if (title.indexOf('首次病程') !== -1 || title.indexOf('首程') !== -1) {
                return this.templates.first_progress_note;
            }
            if (title.indexOf('病程') !== -1 || title.indexOf('查房') !== -1) {
                return this.templates.daily_progress_note;
            }
            if (title.indexOf('出院') !== -1) {
                return this.templates.discharge_summary;
            }
            if (title.indexOf('交接') !== -1 || title.indexOf('交班') !== -1 || title.indexOf('接班') !== -1) {
                return this.templates.handover_note;
            }
            if (title.indexOf('阶段') !== -1 || title.indexOf('小结') !== -1) {
                return this.templates.stage_summary;
            }
            
            return null;
        },
        
        getRequiredFields: function(templateId) {
            var template = this.getTemplate(templateId);
            return template ? template.requiredFields : [];
        },
        
        getClinicalFocus: function(templateId) {
            var template = this.getTemplate(templateId);
            return template ? template.clinicalFocus : '';
        },
        
        getPromptTemplate: function(templateId) {
            var template = this.getTemplate(templateId);
            return template ? template.promptTemplate : '';
        },
        
        getAllTemplateNames: function() {
            var names = [];
            for (var key in this.templates) {
                names.push({
                    key: key,
                    id: this.templates[key].templateId,
                    name: this.templates[key].templateName
                });
            }
            return names;
        },
        
        buildPrompt: function(templateId, clinicalKeywords, patientContext, hisData) {
            var template = this.getTemplate(templateId);
            if (!template) {
                return this.buildDefaultPrompt(clinicalKeywords, patientContext, hisData);
            }
            
            var prompt = template.promptTemplate + '\n\n';
            
            if (patientContext && patientContext.hasValidContext) {
                prompt += '【患者前情提要】\n';
                if (patientContext.chiefComplaint) {
                    prompt += '主诉: ' + patientContext.chiefComplaint + '\n';
                }
                if (patientContext.presentIllness) {
                    prompt += '现病史摘要: ' + patientContext.presentIllness.substring(0, 200) + '...\n';
                }
                if (patientContext.primaryDiagnosis) {
                    prompt += '目前诊断: ' + patientContext.primaryDiagnosis + '\n';
                }
                prompt += '\n';
            }
            
            if (hisData) {
                prompt += '【今日检验检查数据】\n' + hisData + '\n\n';
            }
            
            prompt += '【今日临床信息】\n' + clinicalKeywords + '\n\n';
            
            prompt += '【必须生成的字段】\n' + template.requiredFields.join('、') + '\n\n';
            prompt += '【临床要点】\n' + template.clinicalFocus + '\n\n';
            prompt += '请返回 JSON 格式，Key 为字段名，Value 为生成的内容。';
            
            return prompt;
        },
        
        buildDefaultPrompt: function(clinicalKeywords, patientContext, hisData) {
            var prompt = '你是一名三甲医院内科主治医师。\n\n';
            
            if (patientContext && patientContext.hasValidContext) {
                prompt += '【患者前情提要】\n';
                if (patientContext.chiefComplaint) {
                    prompt += '主诉: ' + patientContext.chiefComplaint + '\n';
                }
                if (patientContext.primaryDiagnosis) {
                    prompt += '目前诊断: ' + patientContext.primaryDiagnosis + '\n';
                }
                prompt += '\n';
            }
            
            if (hisData) {
                prompt += '【检验检查数据】\n' + hisData + '\n\n';
            }
            
            prompt += '【临床信息】\n' + clinicalKeywords + '\n\n';
            prompt += '请根据上述信息生成病历内容，返回 JSON 格式。';
            
            return prompt;
        }
    };
    
    window.EmrTemplateConfig = EmrTemplateConfig;
    window.EMR_TEMPLATES = EMR_TEMPLATES;
    
    console.log('[EmrTemplateConfig] 模板配置加载完成，共', Object.keys(EMR_TEMPLATES).length, '个模板');
    
})();
