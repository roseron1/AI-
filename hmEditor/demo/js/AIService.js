(function() {
    'use strict';
    
    var AIService = {
        API_URL: 'https://api.deepseek.com/v1/chat/completions',
        API_KEY: 'sk-161d6b003e814c78a72e46cc10003fb0',
        MODEL: 'deepseek-chat',
        MAX_TOKENS: 2000,
        TEMPERATURE: 0.7,
        
        DEFAULT_SYSTEM_PROMPT: `你是一名三甲医院资深内科主任医师，拥有丰富的临床经验。请根据提供的症状和检验词汇，利用循证医学临床思维，生成一份严谨的查房/入院记录片段。

你的回复必须是纯 JSON 格式，不要有任何 Markdown 代码块包裹，也不要有任何解释说明。

注意事项：
1. 所有内容必须基于循证医学证据
2. 诊断要有依据，治疗要有指南支持
3. 对于不确定的诊断，要列出鉴别诊断
4. 治疗方案要具体、可执行
5. 要考虑患者的安全性和依从性
6. 必要时提醒需要紧急处理的情况
7. 返回的 JSON 不要有任何额外的文字或格式`,

        buildTemplateBasedSystemPrompt: function(templateConfig) {
            if (!templateConfig) {
                return this.DEFAULT_SYSTEM_PROMPT;
            }
            
            var templateName = templateConfig.templateName || '病历记录';
            var clinicalFocus = templateConfig.clinicalFocus || '';
            var requiredFields = templateConfig.requiredFields || [];
            
            var systemPrompt = '你是一名严谨的三甲医院内科主治医师。你现在正在撰写《' + templateName + '》。\n\n';
            systemPrompt += '你的行文必须符合中国病历书写基本规范。\n\n';
            systemPrompt += '请严格遵循此文书的核心要点：\n' + clinicalFocus + '\n\n';
            systemPrompt += '【返回格式要求】\n';
            systemPrompt += '请必须返回纯 JSON 格式（不要有任何 Markdown 代码块包裹，也不要解释）。\n';
            systemPrompt += 'JSON 的 Key 必须且只能是以下字段：\n';
            systemPrompt += JSON.stringify(requiredFields, null, 2) + '\n\n';
            systemPrompt += '【禁止事项】\n';
            systemPrompt += '1. 不要擅自增加 JSON 中没有的 Key\n';
            systemPrompt += '2. 不要虚构生命体征和核心用药剂量（除非医生在草案中提及）\n';
            systemPrompt += '3. 不要返回任何非 JSON 格式的内容';
            
            return systemPrompt;
        },
        
        buildTemplateBasedUserPrompt: function(templateConfig, clinicalKeywords, patientContext, hisData) {
            if (!templateConfig) {
                return this.buildDynamicPrompt(clinicalKeywords, []);
            }
            
            var templateName = templateConfig.templateName || '病历记录';
            var requiredFields = templateConfig.requiredFields || [];
            var clinicalFocus = templateConfig.clinicalFocus || '';
            
            var userPrompt = '【当前任务】撰写《' + templateName + '》\n\n';
            
            if (patientContext && patientContext.hasValidContext) {
                userPrompt += '═══════════════════════════════════════\n';
                userPrompt += '【患者已知背景】（仅供参考，不得修改）\n';
                userPrompt += '═══════════════════════════════════════\n';
                
                if (patientContext.chiefComplaint) {
                    userPrompt += '主诉: ' + patientContext.chiefComplaint + '\n';
                }
                if (patientContext.presentIllness) {
                    var presentIllnessSummary = patientContext.presentIllness;
                    if (presentIllnessSummary.length > 300) {
                        presentIllnessSummary = presentIllnessSummary.substring(0, 300) + '...';
                    }
                    userPrompt += '现病史摘要: ' + presentIllnessSummary + '\n';
                }
                if (patientContext.pastHistory) {
                    userPrompt += '既往史: ' + patientContext.pastHistory.substring(0, 100) + '\n';
                }
                if (patientContext.primaryDiagnosis) {
                    userPrompt += '目前诊断: ' + patientContext.primaryDiagnosis + '\n';
                }
                
                userPrompt += '═══════════════════════════════════════\n\n';
            }
            
            if (hisData) {
                userPrompt += '【检验检查数据】\n';
                userPrompt += hisData + '\n\n';
            }
            
            userPrompt += '【医生输入的草案/症状词】\n';
            userPrompt += clinicalKeywords + '\n\n';
            
            userPrompt += '【任务要求】\n';
            userPrompt += '请严格输出一个 JSON 对象，Key 必须且只能是以下数组中的元素：\n';
            userPrompt += JSON.stringify(requiredFields) + '\n\n';
            userPrompt += '【临床要点提醒】\n';
            userPrompt += clinicalFocus + '\n\n';
            userPrompt += '【重要警示】\n';
            userPrompt += '请不要擅自增加毫无根据的虚构数据（尤其是生命体征和核心用药剂量，除非医生在草案中提及）。';
            
            return userPrompt;
        },
        
        sanitizeResponse: function(response, requiredFields) {
            console.log('[AI Service] ========== JSON 校验清洗 ==========');
            console.log('[AI Service] 原始响应 Keys:', Object.keys(response));
            console.log('[AI Service] 必需字段:', requiredFields);
            
            var sanitized = {
                generatedAt: new Date().toISOString(),
                source: response.source || 'ai',
                _sanitized: false
            };
            
            var extraKeys = [];
            var missingFields = [];
            
            for (var key in response) {
                if (key === 'generatedAt' || key === 'source' || key === 'contextAware' || key === 'docTitle') {
                    continue;
                }
                if (requiredFields.indexOf(key) === -1) {
                    extraKeys.push(key);
                }
            }
            
            requiredFields.forEach(function(field) {
                if (!response[field] || response[field] === '') {
                    missingFields.push(field);
                    sanitized[field] = '';
                } else {
                    sanitized[field] = response[field];
                }
            });
            
            if (extraKeys.length > 0) {
                console.warn('[AI Service] ⚠️ 发现多余字段，已剔除:', extraKeys);
                sanitized._removedKeys = extraKeys;
                sanitized._sanitized = true;
            }
            
            if (missingFields.length > 0) {
                console.warn('[AI Service] ⚠️ 发现缺失字段，已填充空字符串:', missingFields);
                sanitized._missingFields = missingFields;
                sanitized._sanitized = true;
            }
            
            console.log('[AI Service] 清洗后 Keys:', Object.keys(sanitized).filter(function(k) { return k.indexOf('_') !== 0; }));
            console.log('[AI Service] ==========================================');
            
            return sanitized;
        },
        
        validateResponse: function(response, requiredFields) {
            var errors = [];
            var warnings = [];
            
            if (!response || typeof response !== 'object') {
                errors.push('响应不是有效的对象');
                return { valid: false, errors: errors, warnings: warnings };
            }
            
            requiredFields.forEach(function(field) {
                if (!response[field]) {
                    warnings.push('字段 "' + field + '" 缺失或为空');
                }
            });
            
            for (var key in response) {
                if (key.indexOf('_') === 0 || key === 'generatedAt' || key === 'source') {
                    continue;
                }
                if (requiredFields.indexOf(key) === -1) {
                    warnings.push('字段 "' + key + '" 不在必需字段列表中');
                }
            }
            
            return {
                valid: errors.length === 0,
                errors: errors,
                warnings: warnings
            };
        },

        buildDynamicSystemPrompt: function(fields) {
            var fieldDescriptions = {
                '主诉': '简明扼要描述主要症状及持续时间',
                '现病史': '详细描述起病经过、症状特点、伴随症状、诊疗经过等',
                '既往史': '包括既往疾病史、手术史、过敏史等',
                '体格检查': '包括生命体征、一般情况、各系统检查结果',
                '辅助检查': '包括实验室检查、影像学检查等结果',
                '初步诊断': '列出主要诊断及鉴别诊断',
                '诊疗计划': '包括进一步检查、治疗方案、注意事项等',
                '婚育史': '婚育情况，适龄结婚，配偶体健等',
                '家族史': '家族遗传病史情况',
                '个人史': '个人生活习惯、职业等',
                '月经史': '女性患者月经情况',
                '过敏史': '药物及食物过敏史',
                '专科检查': '专科相关检查结果',
                '辅助检查结果': '各项检查结果描述',
                '诊断': '诊断结论',
                '处理意见': '治疗及处理建议'
            };
            
            var jsonTemplate = {};
            fields.forEach(function(field) {
                jsonTemplate[field] = fieldDescriptions[field] || field + '内容';
            });
            
            var prompt = this.DEFAULT_SYSTEM_PROMPT + '\n\n';
            prompt += 'JSON 的 Key 必须严格使用以下字段名（对应电子病历模板中的控件）：\n';
            prompt += JSON.stringify(jsonTemplate, null, 2) + '\n\n';
            prompt += '对于"婚育史"、"家族史"、"个人史"等如果没有特殊提示，请生成临床惯用的标准阴性描述。';
            
            return prompt;
        },

        buildDynamicPrompt: function(clinicalKeywords, fields) {
            var prompt = '患者表现及证据：' + clinicalKeywords + '\n\n';
            
            prompt += '请注意，你必须且只能为以下病历字段生成内容：' + fields.join('、') + '。\n\n';
            prompt += '对于"婚育史"、"家族史"、"个人史"等如果没有特殊提示，请生成临床惯用的标准阴性描述（如：适龄结婚，配偶体健；否认家族遗传病史等）。\n\n';
            prompt += '请必须返回纯 JSON 格式（不要有任何 Markdown 代码块包裹，也不要解释）。\n';
            prompt += 'JSON 的 Key 必须严格使用：' + fields.join(', ') + '\n';
            prompt += '每个 Value 是生成的专业医学文本。';
            
            return prompt;
        },
        
        buildContextAwarePrompt: function(clinicalKeywords, fields, docTitle, patientContext) {
            var prompt = '';
            var isProgressNote = this.isProgressNote(docTitle);
            
            if (isProgressNote && patientContext && patientContext.hasValidContext) {
                prompt += '【重要提示】你现在正在撰写一份【' + docTitle + '】。\n\n';
                prompt += '═══════════════════════════════════════\n';
                prompt += '【前情提要 / 既往病史】（以下为患者既往信息，仅供参考，不得修改）：\n';
                prompt += '═══════════════════════════════════════\n\n';
                
                if (patientContext.patientSummary) {
                    prompt += '患者基本信息：' + patientContext.patientSummary + '\n\n';
                }
                
                if (patientContext.chiefComplaint) {
                    prompt += '【主诉】' + patientContext.chiefComplaint + '\n\n';
                }
                
                if (patientContext.presentIllness) {
                    prompt += '【现病史】' + patientContext.presentIllness + '\n\n';
                }
                
                if (patientContext.pastHistory) {
                    prompt += '【既往史】' + patientContext.pastHistory + '\n\n';
                }
                
                if (patientContext.diagnosis) {
                    prompt += '【既定诊断】' + patientContext.diagnosis + '\n\n';
                }
                
                if (patientContext.treatmentPlan) {
                    prompt += '【原诊疗计划】' + patientContext.treatmentPlan + '\n\n';
                }
                
                prompt += '═══════════════════════════════════════\n';
                prompt += '【今日新发情况 / 查房发现】：\n';
                prompt += '═══════════════════════════════════════\n\n';
                prompt += clinicalKeywords + '\n\n';
                
                prompt += '请基于上述前情提要，结合今日新发情况，推断病情演变，生成今日的病程记录。\n';
                prompt += '内容应包含：主观感受变化、客观查体变化、病情分析、诊疗调整计划等。\n\n';
            } else {
                prompt += '患者表现及证据：' + clinicalKeywords + '\n\n';
            }
            
            prompt += '请注意，你必须且只能为以下病历字段生成内容：' + fields.join('、') + '。\n\n';
            prompt += '对于"婚育史"、"家族史"、"个人史"等如果没有特殊提示，请生成临床惯用的标准阴性描述。\n\n';
            prompt += '请必须返回纯 JSON 格式（不要有任何 Markdown 代码块包裹，也不要解释）。\n';
            prompt += 'JSON 的 Key 必须严格使用：' + fields.join(', ') + '\n';
            prompt += '每个 Value 是生成的专业医学文本。';
            
            return prompt;
        },
        
        isProgressNote: function(docTitle) {
            if (!docTitle) return false;
            var keywords = ['病程记录', '日常病程', '首次病程', '查房记录', '上级医师查房'];
            for (var i = 0; i < keywords.length; i++) {
                if (docTitle.indexOf(keywords[i]) !== -1) return true;
            }
            return false;
        },
        
        generateWithContext: async function(clinicalKeywords, fields, docTitle, patientContext) {
            console.log('[AI Service] ========== 开始上下文感知生成 ==========');
            console.log('[AI Service] 文档类型:', docTitle);
            console.log('[AI Service] 是否病程记录:', this.isProgressNote(docTitle));
            console.log('[AI Service] 患者上下文有效:', patientContext && patientContext.hasValidContext);
            
            if (this.API_KEY === 'YOUR_API_KEY') {
                console.warn('[AI Service] API Key 未配置，使用 Mock 数据');
                return this.getMockWithContext(clinicalKeywords, fields, docTitle, patientContext);
            }
            
            var systemPrompt = this.buildDynamicSystemPrompt(fields);
            var userPrompt = this.buildContextAwarePrompt(clinicalKeywords, fields, docTitle, patientContext);
            
            console.log('[AI Service] 上下文感知 System Prompt:', systemPrompt.substring(0, 200) + '...');
            console.log('[AI Service] 上下文感知 User Prompt:', userPrompt.substring(0, 500) + '...');
            
            var requestBody = {
                model: this.MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: this.MAX_TOKENS,
                temperature: this.TEMPERATURE,
                stream: false
            };
            
            try {
                var response = await fetch(this.API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + this.API_KEY
                    },
                    body: JSON.stringify(requestBody)
                });
                
                if (!response.ok) {
                    throw new Error('API 请求失败: ' + response.status);
                }
                
                var data = await response.json();
                var content = data.choices[0].message.content;
                
                console.log('[AI Service] AI 原始返回:', content);
                
                return this.parseDynamicResponse(content, fields);
                
            } catch (error) {
                console.error('[AI Service] API 调用失败:', error);
                return this.getMockWithContext(clinicalKeywords, fields, docTitle, patientContext);
            }
        },
        
        getMockWithContext: function(clinicalKeywords, fields, docTitle, patientContext) {
            console.log('[AI Service] 生成上下文感知 Mock 数据');
            
            var result = this.getMockClinicalRecordDynamic(clinicalKeywords, fields);
            
            if (this.isProgressNote(docTitle) && patientContext && patientContext.hasValidContext) {
                console.log('[AI Service] 注入患者背景信息到病程记录');
                
                if (patientContext.diagnosis && fields.indexOf('诊断') !== -1) {
                    result['诊断'] = patientContext.diagnosis;
                }
                
                if (fields.indexOf('病情记录') !== -1 || fields.indexOf('病程记录') !== -1) {
                    var progressContent = '患者今日精神可';
                    
                    if (patientContext.chiefComplaint) {
                        progressContent += '，诉' + patientContext.chiefComplaint.replace(/^[0-9]+天?/, '症状较前');
                    }
                    
                    progressContent += '。查体：';
                    
                    if (patientContext.vitalSigns) {
                        progressContent += patientContext.vitalSigns.substring(0, 100);
                    } else {
                        progressContent += '生命体征平稳，心肺腹查体未见明显异常';
                    }
                    
                    progressContent += '。继续当前治疗，病情稳定。';
                    
                    if (fields.indexOf('病情记录') !== -1) {
                        result['病情记录'] = progressContent;
                    }
                }
                
                if (fields.indexOf('查房意见') !== -1) {
                    var roundsOpinion = '患者诊断明确';
                    if (patientContext.diagnosis) {
                        roundsOpinion = '患者' + patientContext.diagnosis.split('\n')[0] + '诊断明确';
                    }
                    roundsOpinion += '，治疗方案合理，继续当前治疗，监测病情变化。';
                    result['查房意见'] = roundsOpinion;
                }
                
                if (fields.indexOf('处理意见') !== -1) {
                    var treatmentOpinion = '1. 继续当前治疗方案\n2. 监测生命体征\n3. 注意观察病情变化';
                    if (patientContext.treatmentPlan) {
                        treatmentOpinion = '1. 继续原诊疗计划\n2. ' + clinicalKeywords + '\n3. 监测病情变化';
                    }
                    result['处理意见'] = treatmentOpinion;
                }
            }
            
            result.contextAware = true;
            result.docTitle = docTitle;
            
            return result;
        },
        
        buildClinicalPrompt: function(clinicalKeywords) {
            return this.buildDynamicPrompt(clinicalKeywords, [
                '主诉', '现病史', '既往史', '体格检查', '辅助检查', '初步诊断', '诊疗计划'
            ]);
        },
        
        generateClinicalRecordDynamic: async function(clinicalKeywords, fields) {
            console.log('[AI Service] ========== 开始动态生成病历记录 ==========');
            console.log('[AI Service] 临床关键词:', clinicalKeywords);
            console.log('[AI Service] 目标字段:', fields);
            
            if (this.API_KEY === 'YOUR_API_KEY') {
                console.warn('[AI Service] ⚠️ API Key 未配置，使用 Mock 数据');
                return this.getMockClinicalRecordDynamic(clinicalKeywords, fields);
            }
            
            var systemPrompt = this.buildDynamicSystemPrompt(fields);
            var userPrompt = this.buildDynamicPrompt(clinicalKeywords, fields);
            
            console.log('[AI Service] 动态 System Prompt:', systemPrompt);
            console.log('[AI Service] 动态 User Prompt:', userPrompt);
            
            var requestBody = {
                model: this.MODEL,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                max_tokens: this.MAX_TOKENS,
                temperature: this.TEMPERATURE,
                stream: false
            };
            
            console.log('[AI Service] 请求体:', JSON.stringify(requestBody, null, 2));
            
            try {
                var response = await fetch(this.API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + this.API_KEY
                    },
                    body: JSON.stringify(requestBody)
                });
                
                console.log('[AI Service] 响应状态:', response.status);
                
                if (!response.ok) {
                    var errorText = await response.text();
                    console.error('[AI Service] API 错误:', errorText);
                    throw new Error('API 请求失败: ' + response.status + ' - ' + errorText);
                }
                
                var data = await response.json();
                console.log('[AI Service] API 响应:', JSON.stringify(data, null, 2));
                
                var content = data.choices[0].message.content;
                console.log('[AI Service] AI 返回内容:', content);
                
                var clinicalData = this.parseDynamicResponse(content, fields);
                
                console.log('[AI Service] 解析后的临床数据:', JSON.stringify(clinicalData, null, 2));
                console.log('[AI Service] ========== 动态病历记录生成完成 ==========');
                
                return clinicalData;
                
            } catch (error) {
                console.error('[AI Service] ❌ 请求失败:', error);
                console.log('[AI Service] 使用 Mock 数据作为降级方案');
                return this.getMockClinicalRecordDynamic(clinicalKeywords, fields);
            }
        },
        
        parseDynamicResponse: function(content, fields) {
            console.log('[AI Service] 解析动态响应...');
            
            try {
                var cleanedContent = content.trim();
                
                if (cleanedContent.startsWith('```json')) {
                    cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
                } else if (cleanedContent.startsWith('```')) {
                    cleanedContent = cleanedContent.replace(/```\n?/g, '');
                }
                
                var jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
                
                if (jsonMatch) {
                    var jsonStr = jsonMatch[0];
                    var parsed = JSON.parse(jsonStr);
                    
                    var result = {
                        generatedAt: new Date().toISOString(),
                        source: 'ai'
                    };
                    
                    fields.forEach(function(field) {
                        result[field] = parsed[field] || '';
                    });
                    
                    return result;
                }
            } catch (parseError) {
                console.error('[AI Service] JSON 解析失败:', parseError);
            }
            
            console.log('[AI Service] 无法解析 JSON，返回空结构');
            return this.getEmptyClinicalRecordDynamic(fields);
        },
        
        getEmptyClinicalRecordDynamic: function(fields) {
            var result = {
                generatedAt: new Date().toISOString(),
                source: 'empty'
            };
            
            fields.forEach(function(field) {
                result[field] = '';
            });
            
            return result;
        },
        
        getMockClinicalRecordDynamic: function(clinicalKeywords, fields) {
            console.log('[AI Service] 返回动态 Mock 临床数据');
            console.log('[AI Service] 请求字段:', fields);
            
            var keyword = clinicalKeywords.split('、')[0] || clinicalKeywords;
            
            var mockDatabase = {
                '胸痛': {
                    '主诉': '胸痛3天',
                    '现病史': '患者3天前无明显诱因出现胸痛，位于胸骨后，呈压榨样，向左肩背部放射。伴有活动后气促，无恶心呕吐，无大汗淋漓。既往有高血压病史5年。',
                    '既往史': '高血压病史5年，最高血压160/100mmHg，规律服用氨氯地平5mg qd，血压控制尚可。否认糖尿病、冠心病病史。否认药物过敏史。',
                    '体格检查': 'T: 36.8°C, P: 92次/分, R: 20次/分, BP: 138/88mmHg。神志清楚，精神可。双肺呼吸音清，未闻及干湿啰音。心率92次/分，律齐，各瓣膜区未闻及病理性杂音。腹软，无压痛反跳痛。双下肢无水肿。',
                    '辅助检查': '心电图：窦性心律，未见明显ST-T改变。心肌酶谱：CK-MB 15U/L，肌钙蛋白I 0.01ng/ml。',
                    '初步诊断': '1. 胸痛待查：冠心病？心肌缺血？\n2. 高血压病2级（中危）',
                    '诊疗计划': '1. 完善心电图、心肌酶谱、肌钙蛋白检查\n2. 完善心脏彩超评估心功能\n3. 必要时行冠脉CTA或冠脉造影\n4. 给予抗血小板、调脂、扩冠治疗\n5. 监测生命体征，卧床休息',
                    '婚育史': '适龄结婚，配偶体健，育有1子1女，均体健。',
                    '家族史': '父亲有高血压病史，母亲体健。否认家族遗传病史。',
                    '个人史': '生于本地，久居本地，无疫区接触史。吸烟20年，平均10支/日，戒烟3年。偶有饮酒。',
                    '过敏史': '否认药物及食物过敏史。',
                    '诊断分析': '患者老年男性，有高血压病史，胸痛呈压榨样，向左肩背部放射，考虑冠心病心绞痛可能性大。需与主动脉夹层、肺栓塞、气胸等鉴别。',
                    '诊疗经过': '入院后完善相关检查，给予抗血小板、调脂、扩冠治疗，胸痛症状明显缓解。',
                    '出院医嘱': '1. 低盐低脂饮食，适量运动\n2. 规律服用阿司匹林100mg qd、阿托伐他汀20mg qn\n3. 监测血压，定期复查\n4. 门诊随访',
                    '出院诊断': '1. 冠心病，心绞痛\n2. 高血压病2级（中危）',
                    '病情摘要': '患者因胸痛3天入院，入院后完善相关检查，诊断为冠心病心绞痛，经治疗后症状缓解，病情稳定出院。',
                    '病历摘要': '患者老年男性，因胸痛3天入院。既往有高血压病史5年。入院查体：BP 138/88mmHg，心率92次/分，心律齐。心电图未见明显ST-T改变，心肌酶谱正常。入院诊断：胸痛待查。入院后给予抗血小板、调脂、扩冠治疗，症状缓解。',
                    '诊断依据': '1. 老年男性，有高血压病史\n2. 胸痛呈压榨样，向左肩背部放射\n3. 心电图未见明显ST-T改变，心肌酶谱正常\n4. 排除主动脉夹层、肺栓塞等',
                    '鉴别诊断': '1. 主动脉夹层：疼痛剧烈，呈撕裂样，双上肢血压不对称，本例不支持\n2. 肺栓塞：常有下肢深静脉血栓，D-二聚体升高，本例不支持\n3. 气胸：突发胸痛，呼吸困难，患侧呼吸音消失，本例不支持',
                    '诊疗情况': '入院后完善心电图、心肌酶谱、心脏彩超等检查，给予抗血小板、调脂、扩冠治疗，胸痛症状明显缓解，病情稳定。',
                    '病情记录': '患者今日精神可，诉胸痛较前明显缓解，无胸闷气促。查体：BP 135/85mmHg，心率88次/分，心律齐，双肺呼吸音清。继续当前治疗。',
                    '查房意见': '患者诊断明确，治疗方案合理，继续当前治疗，监测血压心率变化，注意观察病情变化。',
                    '处理意见': '1. 继续抗血小板、调脂、扩冠治疗\n2. 监测血压心率\n3. 完善心脏彩超评估心功能\n4. 必要时行冠脉CTA检查'
                },
                '发热': {
                    '主诉': '发热3天',
                    '现病史': '患者3天前无明显诱因出现发热，最高体温39.2°C，伴有畏寒、寒战，头痛、全身酸痛。有咳嗽、咳黄痰，无胸痛、咯血。',
                    '既往史': '既往体健，否认高血压、糖尿病、冠心病病史。否认药物过敏史。',
                    '体格检查': 'T: 38.5°C, P: 98次/分, R: 22次/分, BP: 120/75mmHg。急性病容，咽部充血，扁桃体I度肿大。双肺呼吸音粗，右下肺可闻及少量湿啰音。心率98次/分，律齐。',
                    '辅助检查': '血常规：WBC 12.5×10^9/L，N 85%，CRP 45mg/L。胸部CT：右下肺斑片状高密度影。',
                    '初步诊断': '1. 社区获得性肺炎（右下肺）\n2. 急性上呼吸道感染',
                    '诊疗计划': '1. 完善血常规、CRP、PCT检查\n2. 痰培养+药敏试验\n3. 经验性抗感染治疗：头孢曲松2.0g ivgtt qd\n4. 对症退热治疗\n5. 监测体温变化',
                    '婚育史': '适龄结婚，配偶体健。',
                    '家族史': '否认家族遗传病史。',
                    '个人史': '生于本地，久居本地，无疫区接触史。无吸烟、饮酒嗜好。',
                    '诊断分析': '患者急性起病，发热、咳嗽、咳黄痰，右下肺闻及湿啰音，胸部CT示右下肺斑片状高密度影，考虑社区获得性肺炎诊断明确。',
                    '诊疗经过': '入院后给予头孢曲松抗感染治疗，体温逐渐下降，咳嗽咳痰症状明显改善。',
                    '出院医嘱': '1. 注意休息，多饮水\n2. 继续口服抗生素治疗5天\n3. 门诊复查胸部CT\n4. 如有不适及时就诊',
                    '出院诊断': '1. 社区获得性肺炎（右下肺）',
                    '病情摘要': '患者因发热3天入院，入院后完善相关检查，诊断为社区获得性肺炎，经抗感染治疗后症状缓解，病情稳定出院。',
                    '病历摘要': '患者中年男性，因发热3天入院。入院查体：T 38.5°C，双肺呼吸音粗，右下肺可闻及湿啰音。血常规示白细胞升高，胸部CT示右下肺斑片状高密度影。入院诊断：社区获得性肺炎。入院后给予抗感染治疗，症状缓解。',
                    '诊断依据': '1. 急性起病，发热、咳嗽、咳黄痰\n2. 右下肺闻及湿啰音\n3. 血常规示白细胞升高\n4. 胸部CT示右下肺斑片状高密度影',
                    '鉴别诊断': '1. 肺结核：常有午后低热、盗汗、消瘦，本例不支持\n2. 肺癌：常有咯血、消瘦，本例不支持\n3. 肺栓塞：常有下肢深静脉血栓，本例不支持',
                    '诊疗情况': '入院后给予头孢曲松抗感染治疗，体温逐渐下降，咳嗽咳痰症状明显改善，复查血常规正常。',
                    '病情记录': '患者今日精神可，体温正常，咳嗽咳痰较前明显减少。查体：双肺呼吸音清，未闻及干湿啰音。继续当前抗感染治疗。',
                    '查房意见': '患者诊断明确，抗感染治疗有效，继续当前治疗，监测体温变化，注意观察病情变化。',
                    '处理意见': '1. 继续抗感染治疗\n2. 监测体温变化\n3. 复查血常规、胸部CT\n4. 痰培养结果回报后调整抗生素'
                }
            };
            
            var defaultFieldContent = {
                '主诉': clinicalKeywords,
                '现病史': '患者因' + clinicalKeywords + '就诊，需进一步询问病史了解主要症状、发病时间、伴随症状等。',
                '既往史': '既往体健，否认高血压、糖尿病、冠心病病史。否认药物过敏史。',
                '体格检查': 'T: 36.5°C, P: 80次/分, R: 18次/分, BP: 120/80mmHg。神志清楚，精神可。心肺腹查体未见明显异常。',
                '辅助检查': '辅助检查待完善。',
                '初步诊断': clinicalKeywords + '待查',
                '诊断': clinicalKeywords + '待查',
                '诊疗计划': '1. 完善相关辅助检查\n2. 对症支持治疗\n3. 密切观察病情变化',
                '诊疗经过': '入院后完善相关检查，给予对症支持治疗，病情稳定。',
                '诊断分析': '根据患者病史、体格检查及辅助检查结果，需进一步明确诊断。',
                '鉴别诊断': '需结合病史及辅助检查结果进行鉴别诊断。',
                '诊断依据': '根据患者临床表现及辅助检查结果综合分析。',
                '婚育史': '适龄结婚，配偶体健。',
                '家族史': '否认家族遗传病史。',
                '个人史': '生于本地，久居本地，无疫区接触史。',
                '过敏史': '否认药物及食物过敏史。',
                '出院诊断': clinicalKeywords + '待查',
                '出院医嘱': '1. 注意休息，清淡饮食\n2. 规律服药\n3. 门诊随访\n4. 如有不适及时就诊',
                '病情摘要': '患者因' + clinicalKeywords + '入院，入院后完善相关检查，给予对症支持治疗，病情稳定出院。',
                '病历摘要': '患者因' + clinicalKeywords + '入院。入院后完善相关检查，给予对症支持治疗，病情稳定。',
                '诊疗情况': '入院后完善相关检查，给予对症支持治疗，病情稳定。',
                '病情记录': '患者今日精神可，一般情况良好。查体未见明显异常。继续当前治疗。',
                '查房意见': '患者病情稳定，继续当前治疗，注意观察病情变化。',
                '处理意见': '1. 继续当前治疗\n2. 完善相关检查\n3. 监测病情变化',
                '专科检查': '专科检查待完善。',
                '辅助检查结果': '辅助检查结果待回报。',
                '手术经过': '手术经过待记录。',
                '术后诊断': '术后诊断待明确。',
                '术后医嘱': '术后医嘱待开具。'
            };
            
            var baseData = mockDatabase[keyword] || defaultFieldContent;
            
            var result = {
                generatedAt: new Date().toISOString(),
                source: 'mock'
            };
            
            fields.forEach(function(field) {
                if (baseData[field]) {
                    result[field] = baseData[field];
                } else if (defaultFieldContent[field]) {
                    result[field] = defaultFieldContent[field];
                } else {
                    result[field] = field + '待完善';
                }
            });
            
            console.log('[AI Service] Mock 数据生成完成，字段数:', Object.keys(result).length);
            
            return result;
        },
        
        generateClinicalRecord: async function(clinicalKeywords) {
            return this.generateClinicalRecordDynamic(clinicalKeywords, [
                '主诉', '现病史', '既往史', '体格检查', '辅助检查', '初步诊断', '诊疗计划'
            ]);
        },
        
        parseClinicalResponse: function(content) {
            return this.parseDynamicResponse(content, [
                '主诉', '现病史', '既往史', '体格检查', '辅助检查', '初步诊断', '诊疗计划'
            ]);
        },
        
        getEmptyClinicalRecord: function() {
            return this.getEmptyClinicalRecordDynamic([
                '主诉', '现病史', '既往史', '体格检查', '辅助检查', '初步诊断', '诊疗计划'
            ]);
        },
        
        getMockClinicalRecord: function(clinicalKeywords) {
            return this.getMockClinicalRecordDynamic(clinicalKeywords, [
                '主诉', '现病史', '既往史', '体格检查', '辅助检查', '初步诊断', '诊疗计划'
            ]);
        },
        
        setApiKey: function(apiKey) {
            this.API_KEY = apiKey;
            console.log('[AI Service] API Key 已设置');
        },
        
        setApiUrl: function(apiUrl) {
            this.API_URL = apiUrl;
            console.log('[AI Service] API URL 已设置:', apiUrl);
        },
        
        setModel: function(model) {
            this.MODEL = model;
            console.log('[AI Service] Model 已设置:', model);
        },
        
        isConfigured: function() {
            return this.API_KEY !== 'YOUR_API_KEY';
        },
        
        generateWithTemplate: async function(templateId, clinicalKeywords, patientContext, hisData) {
            console.log('[AI Service] ========== 基于模板配置生成 ==========');
            
            var templateConfig = null;
            if (window.EmrTemplateConfig) {
                templateConfig = window.EmrTemplateConfig.getTemplate(templateId);
                if (!templateConfig) {
                    templateConfig = window.EmrTemplateConfig.detectTemplate(templateId);
                }
            }
            
            if (!templateConfig) {
                console.warn('[AI Service] 未找到模板配置，使用默认模式');
                return this.generateWithContext(clinicalKeywords, [], templateId, patientContext);
            }
            
            console.log('[AI Service] 模板配置:', templateConfig.templateName);
            console.log('[AI Service] 必需字段:', templateConfig.requiredFields);
            console.log('[AI Service] 临床要点:', templateConfig.clinicalFocus);
            
            if (this.API_KEY === 'YOUR_API_KEY') {
                console.warn('[AI Service] API Key 未配置，使用 Mock 数据');
                var mockResult = this.getMockClinicalRecordDynamic(clinicalKeywords, templateConfig.requiredFields);
                return this.sanitizeResponse(mockResult, templateConfig.requiredFields);
            }
            
            var systemPrompt = this.buildTemplateBasedSystemPrompt(templateConfig);
            var userPrompt = this.buildTemplateBasedUserPrompt(templateConfig, clinicalKeywords, patientContext, hisData);
            
            console.log('[AI Service] System Prompt 长度:', systemPrompt.length);
            console.log('[AI Service] User Prompt 长度:', userPrompt.length);
            
            var requestBody = {
                model: this.MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: this.MAX_TOKENS,
                temperature: this.TEMPERATURE,
                stream: false
            };
            
            try {
                var response = await fetch(this.API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + this.API_KEY
                    },
                    body: JSON.stringify(requestBody)
                });
                
                if (!response.ok) {
                    throw new Error('API 请求失败: ' + response.status);
                }
                
                var data = await response.json();
                var content = data.choices[0].message.content;
                
                console.log('[AI Service] AI 原始返回:', content);
                
                var parsed = this.parseDynamicResponse(content, templateConfig.requiredFields);
                
                var sanitized = this.sanitizeResponse(parsed, templateConfig.requiredFields);
                
                var validation = this.validateResponse(sanitized, templateConfig.requiredFields);
                if (validation.warnings.length > 0) {
                    console.warn('[AI Service] 校验警告:', validation.warnings);
                }
                
                console.log('[AI Service] ========== 模板生成完成 ==========');
                
                return sanitized;
                
            } catch (error) {
                console.error('[AI Service] API 调用失败:', error);
                var mockResult = this.getMockClinicalRecordDynamic(clinicalKeywords, templateConfig.requiredFields);
                return this.sanitizeResponse(mockResult, templateConfig.requiredFields);
            }
        }
    };
    
    window.AIService = AIService;
    
    console.log('[AI Service] 模块加载完成（支持动态结构识别）');
    console.log('[AI Service] API URL:', AIService.API_URL);
    console.log('[AI Service] Model:', AIService.MODEL);
    console.log('[AI Service] 是否已配置:', AIService.isConfigured());
    
})();
