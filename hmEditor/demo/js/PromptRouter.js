(function() {
    'use strict';
    
    var PromptRouter = {
        currentTemplateName: '',
        requiredFields: [],
        currentTemplateConfig: null,
        
        TEMPLATE_TYPES: {
            ADMISSION: 'admission',
            PROGRESS: 'progress',
            DISCHARGE: 'discharge',
            FIRST_PROGRESS: 'first_progress',
            SURGERY: 'surgery',
            HANDOVER: 'handover',
            STAGE_SUMMARY: 'stage_summary',
            UNKNOWN: 'unknown'
        },
        
        init: function() {
            console.log('[PromptRouter] 初始化动态模板路由器');
        },
        
        detectTemplateType: function(templateName) {
            if (!templateName) return this.TEMPLATE_TYPES.UNKNOWN;
            
            var name = templateName.toLowerCase();
            
            if (name.indexOf('入院记录') !== -1 || name.indexOf('住院病历') !== -1) {
                return this.TEMPLATE_TYPES.ADMISSION;
            }
            
            if (name.indexOf('首次病程') !== -1) {
                return this.TEMPLATE_TYPES.FIRST_PROGRESS;
            }
            
            if (name.indexOf('病程记录') !== -1 || name.indexOf('日常病程') !== -1 || name.indexOf('查房') !== -1) {
                return this.TEMPLATE_TYPES.PROGRESS;
            }
            
            if (name.indexOf('出院记录') !== -1 || name.indexOf('出院小结') !== -1) {
                return this.TEMPLATE_TYPES.DISCHARGE;
            }
            
            if (name.indexOf('手术记录') !== -1 || name.indexOf('术前') !== -1 || name.indexOf('术后') !== -1) {
                return this.TEMPLATE_TYPES.SURGERY;
            }
            
            if (name.indexOf('交接') !== -1 || name.indexOf('交班') !== -1 || name.indexOf('接班') !== -1) {
                return this.TEMPLATE_TYPES.HANDOVER;
            }
            
            if (name.indexOf('阶段') !== -1 || name.indexOf('小结') !== -1) {
                return this.TEMPLATE_TYPES.STAGE_SUMMARY;
            }
            
            return this.TEMPLATE_TYPES.UNKNOWN;
        },
        
        setCurrentTemplate: function(templateName, requiredFields) {
            this.currentTemplateName = templateName || '';
            this.requiredFields = requiredFields || [];
            
            var type = this.detectTemplateType(templateName);
            
            if (window.EmrTemplateConfig) {
                this.currentTemplateConfig = window.EmrTemplateConfig.detectTemplate(templateName);
            }
            
            console.log('[PromptRouter] ========== 设置当前模板 ==========');
            console.log('[PromptRouter] 模板名称:', templateName);
            console.log('[PromptRouter] 模板类型:', type);
            console.log('[PromptRouter] 必填字段:', requiredFields);
            if (this.currentTemplateConfig) {
                console.log('[PromptRouter] 临床要点:', this.currentTemplateConfig.clinicalFocus);
            }
            console.log('[PromptRouter] ========================================');
            
            return type;
        },
        
        buildPrompt: function(clinicalKeywords, patientContext, lisData) {
            var type = this.detectTemplateType(this.currentTemplateName);
            
            console.log('[PromptRouter] ========== 构建场景感知提示词 ==========');
            console.log('[PromptRouter] 模板类型:', type);
            console.log('[PromptRouter] 临床关键词:', clinicalKeywords);
            console.log('[PromptRouter] 患者上下文:', patientContext ? '有效' : '无效');
            console.log('[PromptRouter] LIS/PACS 数据:', lisData ? '有效' : '无效');
            
            var prompt = '';
            var systemPrompt = '';
            
            switch (type) {
                case this.TEMPLATE_TYPES.ADMISSION:
                    prompt = this.buildAdmissionPrompt(clinicalKeywords, lisData);
                    systemPrompt = this.getAdmissionSystemPrompt();
                    break;
                    
                case this.TEMPLATE_TYPES.FIRST_PROGRESS:
                    prompt = this.buildFirstProgressPrompt(clinicalKeywords, patientContext, lisData);
                    systemPrompt = this.getProgressSystemPrompt();
                    break;
                    
                case this.TEMPLATE_TYPES.PROGRESS:
                    prompt = this.buildProgressPrompt(clinicalKeywords, patientContext, lisData);
                    systemPrompt = this.getProgressSystemPrompt();
                    break;
                    
                case this.TEMPLATE_TYPES.DISCHARGE:
                    prompt = this.buildDischargePrompt(clinicalKeywords, patientContext, lisData);
                    systemPrompt = this.getDischargeSystemPrompt();
                    break;
                    
                case this.TEMPLATE_TYPES.SURGERY:
                    prompt = this.buildSurgeryPrompt(clinicalKeywords, patientContext, lisData);
                    systemPrompt = this.getSurgerySystemPrompt();
                    break;
                    
                default:
                    prompt = this.buildDefaultPrompt(clinicalKeywords, lisData);
                    systemPrompt = this.getDefaultSystemPrompt();
            }
            
            prompt += this.buildFieldConstraints();
            
            console.log('[PromptRouter] 生成的提示词长度:', prompt.length);
            console.log('[PromptRouter] ================================================');
            
            return {
                systemPrompt: systemPrompt,
                userPrompt: prompt,
                templateType: type
            };
        },
        
        getAdmissionSystemPrompt: function() {
            return `你是一名三甲医院资深内科首诊医生，正在为患者撰写入院记录。

你的回复必须是纯 JSON 格式，不要有任何 Markdown 代码块包裹，也不要有任何解释说明。

核心原则：
1. 所有内容必须基于循证医学证据
2. 对于未提及的个人史、家族史、婚育史，请生成标准的临床阴性描述
3. 诊断要有依据，鉴别诊断要合理
4. 治疗方案要具体、可执行`;
        },
        
        getProgressSystemPrompt: function() {
            return `你是一名三甲医院内科主治医生，正在查房并撰写病程记录。

你的回复必须是纯 JSON 格式，不要有任何 Markdown 代码块包裹，也不要有任何解释说明。

核心原则：
1. 必须参考患者的既往病史和入院诊断
2. 重点描述病情演变和诊疗计划更新
3. 内容要连贯，体现临床思维
4. 不能伪造患者信息，只能基于提供的真实数据`;
        },
        
        getDischargeSystemPrompt: function() {
            return `你是一名三甲医院内科主治医生，正在为患者撰写出院记录。

你的回复必须是纯 JSON 格式，不要有任何 Markdown 代码块包裹，也不要有任何解释说明。

核心原则：
1. 必须总结患者住院期间的诊疗经过
2. 出院诊断要准确
3. 出院医嘱要详细、具体
4. 注意随访安排和注意事项`;
        },
        
        getSurgerySystemPrompt: function() {
            return `你是一名三甲医院外科主治医生，正在撰写手术相关记录。

你的回复必须是纯 JSON 格式，不要有任何 Markdown 代码块包裹，也不要有任何解释说明。

核心原则：
1. 手术经过要详细、准确
2. 术前诊断和术后诊断要明确
3. 术后医嘱要具体`;
        },
        
        getDefaultSystemPrompt: function() {
            return `你是一名三甲医院资深医生，正在撰写病历记录。

你的回复必须是纯 JSON 格式，不要有任何 Markdown 代码块包裹，也不要有任何解释说明。

核心原则：
1. 所有内容必须专业、准确
2. 遵循病历书写规范
3. 内容要连贯、完整`;
        },
        
        buildAdmissionPrompt: function(clinicalKeywords, lisData) {
            var prompt = `【场景】你是一名首诊医生，正在为患者撰写入院记录。

【患者表现】
${clinicalKeywords}
`;
            
            if (lisData) {
                prompt += `
【客观数据 (LIS/PACS)】
${lisData}

【重要】请在你的分析和诊疗计划中直接引用这些异常指标来论证你的诊断。
例如：患者白细胞显著升高(14.5×10^9/L)，提示严重细菌感染...
`;
            }
            
            prompt += `
【必填字段】
${this.requiredFields.join('、')}

【特殊要求】
对于未提及的个人史、家族史、婚育史，请生成标准的、无异常的临床阴性描述：
- 个人史：生于本地，久居本地，无疫区接触史，无吸烟饮酒嗜好
- 家族史：否认家族遗传病史，父母体健
- 婚育史：适龄结婚，配偶体健（或未婚未育）

`;
            return prompt;
        },
        
        buildFirstProgressPrompt: function(clinicalKeywords, patientContext, lisData) {
            var prompt = `【场景】你是一名主治医生，正在撰写首次病程记录。

`;
            
            if (patientContext && patientContext.hasValidContext) {
                prompt += `【不可伪造的患者前情提要】
═══════════════════════════════════════
`;
                if (patientContext.chiefComplaint) {
                    prompt += `患者入院时主诉：${patientContext.chiefComplaint}\n`;
                }
                if (patientContext.presentIllness) {
                    prompt += `现病史摘要：${patientContext.presentIllness.substring(0, 200)}...\n`;
                }
                if (patientContext.pastHistory) {
                    prompt += `既往史：${patientContext.pastHistory.substring(0, 100)}...\n`;
                }
                if (patientContext.primaryDiagnosis) {
                    prompt += `入院诊断：${patientContext.primaryDiagnosis}\n`;
                }
                prompt += `═══════════════════════════════════════

`;
            }
            
            if (lisData) {
                prompt += `【客观数据 (LIS/PACS)】
${lisData}

【重要】请在诊断分析中引用这些检验检查结果作为依据。

`;
            }
            
            prompt += `【今日分析】
${clinicalKeywords}

【必填字段】
${this.requiredFields.join('、')}

【要求】
1. 结合患者入院情况，进行诊断分析
2. 列出诊断依据和鉴别诊断
3. 制定诊疗计划

`;
            return prompt;
        },
        
        buildProgressPrompt: function(clinicalKeywords, patientContext, lisData) {
            var prompt = `【场景】你是一名负责查房的主治医生，正在撰写日常病程记录。

`;
            
            if (patientContext && patientContext.hasValidContext) {
                prompt += `【不可伪造的患者前情提要】
═══════════════════════════════════════
`;
                if (patientContext.chiefComplaint) {
                    prompt += `患者入院时主诉：${patientContext.chiefComplaint}\n`;
                }
                if (patientContext.pastHistory) {
                    prompt += `既往存在：${patientContext.pastHistory.substring(0, 100)}\n`;
                }
                if (patientContext.primaryDiagnosis) {
                    prompt += `目前诊断：${patientContext.primaryDiagnosis}\n`;
                }
                prompt += `═══════════════════════════════════════

`;
            }
            
            if (lisData) {
                prompt += `【客观数据 (LIS/PACS)】
${lisData}

【重要】请在病程记录中引用这些检验检查结果，说明病情变化。

`;
            }
            
            prompt += `【今日新发现】
${clinicalKeywords}

【必填字段】
${this.requiredFields.join('、')}

【要求】
1. 结合上述前情提要，生成顺理成章的今日病程记录
2. 重点描述病情演变和诊疗计划更新
3. 内容要连贯，体现临床思维
4. 不能伪造患者信息

`;
            return prompt;
        },
        
        buildDischargePrompt: function(clinicalKeywords, patientContext, lisData) {
            var prompt = `【场景】你正在为患者撰写出院记录。

`;
            
            if (patientContext && patientContext.hasValidContext) {
                prompt += `【患者住院信息】
═══════════════════════════════════════
`;
                if (patientContext.chiefComplaint) {
                    prompt += `入院主诉：${patientContext.chiefComplaint}\n`;
                }
                if (patientContext.primaryDiagnosis) {
                    prompt += `入院诊断：${patientContext.primaryDiagnosis}\n`;
                }
                prompt += `═══════════════════════════════════════

`;
            }
            
            if (lisData) {
                prompt += `【出院前检验检查】
${lisData}

`;
            }
            
            prompt += `【出院情况】
${clinicalKeywords}

【必填字段】
${this.requiredFields.join('、')}

【要求】
1. 总结住院期间诊疗经过
2. 明确出院诊断
3. 详细列出出院医嘱和注意事项

`;
            return prompt;
        },
        
        buildSurgeryPrompt: function(clinicalKeywords, patientContext, lisData) {
            var prompt = `【场景】你正在撰写手术相关记录。

`;
            
            if (patientContext && patientContext.hasValidContext) {
                prompt += `【患者信息】
═══════════════════════════════════════
`;
                if (patientContext.primaryDiagnosis) {
                    prompt += `术前诊断：${patientContext.primaryDiagnosis}\n`;
                }
                prompt += `═══════════════════════════════════════

`;
            }
            
            if (lisData) {
                prompt += `【术前检验检查】
${lisData}

`;
            }
            
            prompt += `【手术情况】
${clinicalKeywords}

【必填字段】
${this.requiredFields.join('、')}

`;
            return prompt;
        },
        
        buildDefaultPrompt: function(clinicalKeywords, lisData) {
            var prompt = `【患者表现】
${clinicalKeywords}
`;
            
            if (lisData) {
                prompt += `
【客观数据 (LIS/PACS)】
${lisData}

`;
            }
            
            prompt += `
【必填字段】
${this.requiredFields.join('、')}

`;
            return prompt;
        },
        
        buildFieldConstraints: function() {
            if (!this.requiredFields || this.requiredFields.length === 0) {
                return '';
            }
            
            var prompt = `
【返回格式】
请必须返回纯 JSON 格式（不要有任何 Markdown 代码块包裹，也不要解释）。
JSON 的 Key 必须严格使用以下字段名：
${this.requiredFields.join(', ')}

每个 Value 是生成的专业医学文本。
`;
            return prompt;
        },
        
        getTemplateDescription: function() {
            var type = this.detectTemplateType(this.currentTemplateName);
            
            var descriptions = {
                'admission': '入院记录 - 首诊医生模式',
                'first_progress': '首次病程记录 - 诊断分析模式',
                'progress': '病程记录 - 查房医生模式',
                'discharge': '出院记录 - 总结模式',
                'surgery': '手术记录 - 外科模式',
                'handover': '交接班记录 - 安全交接模式',
                'stage_summary': '阶段小结 - 回顾总结模式',
                'unknown': '通用病历模式'
            };
            
            return descriptions[type] || descriptions.unknown;
        },
        
        getClinicalFocus: function() {
            if (this.currentTemplateConfig) {
                return this.currentTemplateConfig.clinicalFocus;
            }
            return '';
        },
        
        getPromptTemplate: function() {
            if (this.currentTemplateConfig) {
                return this.currentTemplateConfig.promptTemplate;
            }
            return '';
        }
    };
    
    PromptRouter.init();
    
    window.PromptRouter = PromptRouter;
    
    console.log('[PromptRouter] 模块加载完成');
    console.log('[PromptRouter] 支持的模板类型:', Object.values(PromptRouter.TEMPLATE_TYPES));
    
})();
