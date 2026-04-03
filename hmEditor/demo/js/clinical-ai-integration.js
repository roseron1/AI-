(function() {
    'use strict';
    
    var currentClinicalContent = null;
    var currentSchema = null;
    var currentDocTitle = '';
    
    console.log('[Clinical AI Integration] 模块加载完成');
    
    function init() {
        console.log('[Clinical AI Integration] 开始初始化...');
        
        initSymptomInput();
        initGenerateButton();
        initInjectButton();
        initTabSwitch();
        initContextExtraction();
        initContextButtons();
        initSubmitButton();
        initSyncHisButton();
        
        if (window.FocusMode) {
            window.FocusMode.init();
        }
        
        if (window.UnsavedConfirmDialog) {
            window.UnsavedConfirmDialog.init();
        }
        
        console.log('[Clinical AI Integration] 初始化完成');
    }
    
    function initContextButtons() {
        console.log('[Clinical AI Integration] 初始化上下文管理按钮');
        
        var viewBtn = document.getElementById('viewContextBtn');
        var clearBtn = document.getElementById('clearContextBtn');
        
        if (viewBtn) {
            viewBtn.addEventListener('click', function() {
                if (window.PatientContextStore) {
                    console.log('[Clinical AI Integration] ========== 查看患者上下文 ==========');
                    window.PatientContextStore.logCurrentState();
                    
                    var state = window.PatientContextStore.getState();
                    var summary = window.PatientContextStore.getContextSummary();
                    
                    if (summary) {
                        alert('患者上下文:\n\n' + summary + '\n\n详细信息请查看控制台 (F12)');
                    } else {
                        alert('患者上下文为空\n\n请先填写入院记录并注入病历');
                    }
                }
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                if (window.PatientContextStore) {
                    if (confirm('确定要清空患者上下文吗？\n\n这将删除所有已保存的患者病史信息。')) {
                        window.PatientContextStore.clear();
                        updateContextDisplay();
                        alert('患者上下文已清空');
                    }
                }
            });
        }
    }
    
    function initContextExtraction() {
        console.log('[Clinical AI Integration] 初始化上下文提取监听');
        
        if (window.tabManager) {
            var originalLoadDoc = window.tabManager.loadDoc;
            if (originalLoadDoc) {
                window.tabManager.loadDoc = async function() {
                    await extractAndSaveContext();
                    var result = await originalLoadDoc.apply(this, arguments);
                    setTimeout(async function() {
                        await extractCurrentDocTitle();
                        updateContextDisplay();
                    }, 500);
                    return result;
                };
            }
        }
        
        setTimeout(async function() {
            await extractCurrentDocTitle();
            updateContextDisplay();
        }, 2000);
    }
    
    async function extractAndSaveContext() {
        console.log('[Clinical AI Integration] 保存当前文档上下文...');
        
        if (!window.tabManager) return;
        
        try {
            var editor = await window.tabManager.getCurrentEditor();
            if (editor && window.GlobalPatientContext) {
                var docTitle = await getDocTitle(editor);
                
                if (window.GlobalPatientContext.isAdmissionRecord(docTitle)) {
                    console.log('[Clinical AI Integration] 检测到入院记录，提取患者上下文');
                    await window.GlobalPatientContext.extractFromEditor(editor);
                }
            }
        } catch (error) {
            console.error('[Clinical AI Integration] 提取上下文失败:', error);
        }
    }
    
    function initSubmitButton() {
        console.log('[Clinical AI Integration] 初始化提交病历按钮');
        
        var submitBtn = document.getElementById('submitEmrBtn');
        
        if (!submitBtn) {
            console.warn('[Clinical AI Integration] 未找到提交按钮');
            return;
        }
        
        submitBtn.addEventListener('click', async function() {
            console.log('[Clinical AI Integration] ========== 点击提交病历 ==========');
            
            if (!window.tabManager) {
                alert('编辑器管理器未初始化');
                return;
            }
            
            if (!window.EmrExportService) {
                alert('导出服务未加载');
                return;
            }
            
            submitBtn.classList.add('submitting');
            submitBtn.innerHTML = '<i class="fa fa-spinner"></i><span>正在提交...</span>';
            
            try {
                var editor = await window.tabManager.getCurrentEditor();
                
                if (!editor) {
                    throw new Error('无法获取当前编辑器实例');
                }
                
                var payload = await window.EmrExportService.extractAllData(editor);
                
                if (!payload) {
                    throw new Error('数据提取失败');
                }
                
                var response = await window.EmrExportService.submitToHis(payload);
                
                if (response.success) {
                    showSubmitSuccess(response);
                    
                    submitBtn.innerHTML = '<i class="fa fa-check"></i><span>已提交</span>';
                    submitBtn.disabled = true;
                    
                    if (window.UnsavedConfirmDialog) {
                        window.UnsavedConfirmDialog.setDirty(false);
                    }
                    
                    updateStatus('病历已提交至 HIS 系统');
                } else {
                    throw new Error(response.message || '提交失败');
                }
                
            } catch (error) {
                console.error('[Clinical AI Integration] 提交失败:', error);
                alert('提交失败: ' + error.message);
                
                submitBtn.classList.remove('submitting');
                submitBtn.innerHTML = '<i class="fa fa-paper-plane"></i><span>保存并提交病历</span>';
            }
        });
    }
    
    function showSubmitSuccess(response) {
        var overlay = document.createElement('div');
        overlay.className = 'clinical-submit-overlay';
        
        var successDiv = document.createElement('div');
        successDiv.className = 'clinical-submit-success';
        successDiv.innerHTML = 
            '<i class="fa fa-check-circle"></i>' +
            '<h3>提交成功</h3>' +
            '<p>' + response.message + '</p>' +
            '<p style="margin-top: 8px; font-size: 12px;">文档 ID: ' + response.document_id + '</p>';
        
        document.body.appendChild(overlay);
        document.body.appendChild(successDiv);
        
        setTimeout(function() {
            overlay.addEventListener('click', function() {
                document.body.removeChild(overlay);
                document.body.removeChild(successDiv);
            });
            
            successDiv.addEventListener('click', function() {
                document.body.removeChild(overlay);
                document.body.removeChild(successDiv);
            });
        }, 100);
        
        setTimeout(function() {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
            if (document.body.contains(successDiv)) {
                document.body.removeChild(successDiv);
            }
        }, 5000);
    }
    
    function initSyncHisButton() {
        console.log('[Clinical AI Integration] 初始化 Sync HIS 按钮');
        
        var syncBtn = document.getElementById('syncHisBtn');
        
        if (!syncBtn) {
            console.warn('[Clinical AI Integration] 未找到 Sync HIS 按钮');
            return;
        }
        
        syncBtn.addEventListener('click', async function() {
            console.log('[Clinical AI Integration] ========== 点击同步 HIS 数据 ==========');
            
            if (!window.HISIntegrationService) {
                alert('HIS 集成服务未加载');
                return;
            }
            
            syncBtn.classList.add('syncing');
            syncBtn.innerHTML = '<i class="fa fa-sync-alt"></i><span>同步中...</span>';
            
            try {
                var patientId = 'P' + Date.now().toString().slice(-8);
                
                if (window.PatientContextStore) {
                    var state = window.PatientContextStore.getState();
                    if (state.patientId) {
                        patientId = state.patientId;
                    }
                }
                
                var patientData = await window.HISIntegrationService.fetchPatientData(patientId);
                
                renderHisData(patientData);
                
                syncBtn.classList.remove('syncing');
                syncBtn.classList.add('synced');
                syncBtn.innerHTML = '<i class="fa fa-check"></i><span>已同步</span>';
                
                updateStatus('HIS 数据同步成功');
                
            } catch (error) {
                console.error('[Clinical AI Integration] 同步 HIS 数据失败:', error);
                alert('同步失败: ' + error.message);
                
                syncBtn.classList.remove('syncing');
                syncBtn.innerHTML = '<i class="fa fa-sync-alt"></i><span>Sync HIS</span>';
            }
        });
    }
    
    function renderHisData(data) {
        var hisDataDiv = document.getElementById('clinicalHisData');
        var hisPatientId = document.getElementById('clinicalHisPatientId');
        var hisContent = document.getElementById('clinicalHisContent');
        
        if (!hisDataDiv || !hisContent) return;
        
        hisDataDiv.style.display = 'block';
        
        if (hisPatientId && data.patientInfo) {
            hisPatientId.textContent = data.patientInfo.patientId;
        }
        
        var html = '';
        
        if (data.vitalSigns) {
            html += '<div class="clinical-his-section">';
            html += '<div class="clinical-his-section-title"><i class="fa fa-heartbeat"></i>生命体征</div>';
            html += '<div class="clinical-his-item"><span class="clinical-his-item-name">体温</span><span class="clinical-his-item-value">' + data.vitalSigns.temperature + '℃</span></div>';
            html += '<div class="clinical-his-item"><span class="clinical-his-item-name">心率</span><span class="clinical-his-item-value">' + data.vitalSigns.heartRate + '次/分</span></div>';
            html += '<div class="clinical-his-item"><span class="clinical-his-item-name">血压</span><span class="clinical-his-item-value">' + data.vitalSigns.bloodPressure.systolic + '/' + data.vitalSigns.bloodPressure.diastolic + 'mmHg</span></div>';
            html += '<div class="clinical-his-item"><span class="clinical-his-item-name">血氧</span><span class="clinical-his-item-value">' + data.vitalSigns.oxygenSaturation + '%</span></div>';
            html += '</div>';
        }
        
        var normalizedLab = window.HISIntegrationService.normalizeLabResults(data);
        
        if (normalizedLab.abnormalItems.length > 0) {
            html += '<div class="clinical-his-section">';
            html += '<div class="clinical-his-section-title"><i class="fa fa-vial"></i>异常检验指标 (' + normalizedLab.abnormalItems.length + '项)</div>';
            
            normalizedLab.abnormalItems.forEach(function(item) {
                var valueClass = item.direction === 'high' ? 'high' : 'low';
                var flag = item.direction === 'high' ? '↑' : '↓';
                html += '<div class="clinical-his-item">';
                html += '<span class="clinical-his-item-name">' + item.name + '</span>';
                html += '<span class="clinical-his-item-value ' + valueClass + '">' + flag + ' ' + item.value + ' ' + item.unit + '</span>';
                html += '</div>';
            });
            
            html += '<div class="clinical-his-summary"><i class="fa fa-exclamation-triangle"></i>' + normalizedLab.summary + '</div>';
            html += '</div>';
        }
        
        if (data.imagingResults && data.imagingResults.length > 0) {
            html += '<div class="clinical-his-section">';
            html += '<div class="clinical-his-section-title"><i class="fa fa-x-ray"></i>影像学检查</div>';
            
            data.imagingResults.forEach(function(img) {
                html += '<div class="clinical-his-imaging">';
                html += '<div class="clinical-his-imaging-title">' + img.examType + '</div>';
                html += '<div class="clinical-his-imaging-content">' + img.report + '</div>';
                html += '</div>';
            });
            
            html += '</div>';
        }
        
        hisContent.innerHTML = html;
        
        console.log('[Clinical AI Integration] HIS 数据已渲染');
    }
    
    async function extractCurrentDocTitle() {
        if (!window.tabManager) return '';
        
        try {
            var editor = await window.tabManager.getCurrentEditor();
            if (editor) {
                currentDocTitle = await getDocTitle(editor);
                console.log('[Clinical AI Integration] 当前文档标题:', currentDocTitle);
            }
        } catch (error) {
            console.error('[Clinical AI Integration] 提取文档标题失败:', error);
        }
        
        return currentDocTitle;
    }
    
    async function getDocTitle(editor) {
        if (!editor || !editor.editor) return '';
        
        try {
            var $body = $(editor.editor.document.getBody().$);
            var $titleElements = $body.find('strong span[style*="font-size:22px"], strong span[style*="font-size: 22px"]');
            
            if ($titleElements.length > 0) {
                return $titleElements.first().text().trim();
            }
            
            var $boldElements = $body.find('strong');
            for (var i = 0; i < $boldElements.length; i++) {
                var text = $($boldElements[i]).text().trim();
                if (text.indexOf('记录') !== -1 || text.indexOf('病历') !== -1) {
                    return text;
                }
            }
            
            return '';
        } catch (error) {
            return '';
        }
    }
    
    function updateContextDisplay() {
        var contextInfo = document.getElementById('clinicalContextInfo');
        if (!contextInfo) return;
        
        var ctx = null;
        
        if (window.PatientContextStore && window.PatientContextStore.hasValidContext()) {
            ctx = window.PatientContextStore.getState();
        } else if (window.GlobalPatientContext && window.GlobalPatientContext.hasValidContext()) {
            ctx = window.GlobalPatientContext.getContext();
        }
        
        if (!ctx) {
            contextInfo.style.display = 'none';
            return;
        }
        
        var html = '<div class="context-header"><i class="fa fa-history"></i> 患者背景</div>';
        
        if (ctx.patientName || ctx.gender || ctx.age) {
            html += '<div class="context-item">';
            if (ctx.patientName) html += ctx.patientName;
            if (ctx.gender) html += ' / ' + ctx.gender;
            if (ctx.age) html += ' / ' + ctx.age;
            html += '</div>';
        }
        
        if (ctx.primaryDiagnosis || ctx.diagnosis) {
            var diagnosis = ctx.primaryDiagnosis || ctx.diagnosis;
            html += '<div class="context-item"><span class="context-label">诊断：</span>' + 
                diagnosis.substring(0, 50) + (diagnosis.length > 50 ? '...' : '') + '</div>';
        }
        
        if (ctx.chiefComplaint) {
            html += '<div class="context-item"><span class="context-label">主诉：</span>' + 
                ctx.chiefComplaint.substring(0, 30) + (ctx.chiefComplaint.length > 30 ? '...' : '') + '</div>';
        }
        
        if (ctx.lastUpdateTime) {
            var updateTime = new Date(ctx.lastUpdateTime);
            html += '<div class="context-item" style="font-size:11px;color:#546e7a;">更新于: ' + 
                updateTime.toLocaleString() + '</div>';
        }
        
        contextInfo.innerHTML = html;
        contextInfo.style.display = 'block';
    }
    
    function initSymptomInput() {
        var symptomInput = document.getElementById('clinicalSymptomInput');
        var searchBtn = document.getElementById('clinicalSearchBtn');
        
        if (!symptomInput || !searchBtn) {
            console.warn('[Clinical AI Integration] 未找到症状输入框或搜索按钮');
            return;
        }
        
        searchBtn.addEventListener('click', function() {
            var symptom = symptomInput.value.trim();
            if (symptom) {
                addSymptomTag(symptom);
                symptomInput.value = '';
            }
        });
        
        symptomInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchBtn.click();
            }
        });
    }
    
    function addSymptomTag(symptom) {
        var tagsContainer = document.getElementById('clinicalEvidenceTags');
        if (!tagsContainer) return;
        
        var existingTags = tagsContainer.querySelectorAll('.clinical-tag-label');
        for (var i = 0; i < existingTags.length; i++) {
            if (existingTags[i].textContent === symptom) {
                console.log('[Clinical AI Integration] 症状标签已存在:', symptom);
                return;
            }
        }
        
        var label = document.createElement('label');
        label.className = 'clinical-evidence-tag';
        label.innerHTML = '<input type="checkbox" value="' + symptom + '" checked><span class="clinical-tag-label">' + symptom + '</span>';
        
        tagsContainer.appendChild(label);
        
        console.log('[Clinical AI Integration] 添加症状标签:', symptom);
    }
    
    function initGenerateButton() {
        var generateBtn = document.getElementById('clinicalGenerateBtn');
        
        if (!generateBtn) {
            console.warn('[Clinical AI Integration] 未找到生成按钮');
            return;
        }
        
        generateBtn.addEventListener('click', async function() {
            console.log('[Clinical AI Integration] 点击生成建议按钮');
            
            var clinicalKeywords = collectClinicalKeywords();
            
            if (!clinicalKeywords) {
                alert('请输入症状或勾选证据标签');
                return;
            }
            
            console.log('[Clinical AI Integration] 临床关键词:', clinicalKeywords);
            
            showLoading(true);
            updateStatus('正在读取文档结构...');
            
            try {
                var schema = await extractDocumentSchema();
                
                if (!schema || schema.fields.length === 0) {
                    console.warn('[Clinical AI Integration] 未提取到文档结构，使用默认字段');
                    schema = {
                        docCode: 'DOC001',
                        fields: ['主诉', '现病史', '既往史', '体格检查', '辅助检查', '初步诊断', '诊疗计划'],
                        fieldMap: {}
                    };
                }
                
                currentSchema = schema;
                
                console.log('[Clinical AI Integration] 提取到的文档结构:', schema);
                
                await extractCurrentDocTitle();
                
                if (window.PromptRouter) {
                    var templateType = window.PromptRouter.setCurrentTemplate(currentDocTitle, schema.fields);
                    console.log('[Clinical AI Integration] 模板类型:', templateType);
                    console.log('[Clinical AI Integration] 模板描述:', window.PromptRouter.getTemplateDescription());
                }
                
                var patientContext = null;
                if (window.PatientContextStore) {
                    var storeState = window.PatientContextStore.getState();
                    patientContext = {
                        hasValidContext: window.PatientContextStore.hasValidContext(),
                        patientSummary: window.PatientContextStore.getContextSummary(),
                        chiefComplaint: storeState.chiefComplaint,
                        presentIllness: storeState.presentIllness,
                        pastHistory: storeState.pastHistory,
                        primaryDiagnosis: storeState.primaryDiagnosis,
                        admissionDate: storeState.admissionDate
                    };
                } else if (window.GlobalPatientContext) {
                    patientContext = {
                        hasValidContext: window.GlobalPatientContext.hasValidContext(),
                        patientSummary: window.GlobalPatientContext.getPatientSummary(),
                        chiefComplaint: window.GlobalPatientContext.getChiefComplaint(),
                        presentIllness: window.GlobalPatientContext.getPresentIllness(),
                        pastHistory: window.GlobalPatientContext.getPastHistory(),
                        diagnosis: window.GlobalPatientContext.getDiagnosis(),
                        treatmentPlan: window.GlobalPatientContext.getContext().treatmentPlan,
                        vitalSigns: window.GlobalPatientContext.getContext().vitalSigns
                    };
                }
                
                console.log('[Clinical AI Integration] 患者上下文:', patientContext);
                
                var hisData = null;
                if (window.HISIntegrationService && window.HISIntegrationService.hasCurrentData()) {
                    hisData = window.HISIntegrationService.getFormattedDataForPrompt(window.HISIntegrationService.getCurrentPatientData());
                    console.log('[Clinical AI Integration] HIS 数据已获取，将注入 Prompt');
                }
                
                if (window.PromptRouter) {
                    var templateDesc = window.PromptRouter.getTemplateDescription();
                    if (hisData) {
                        updateStatus('AI 正在分析 (' + templateDesc + ', 含检验数据)...');
                    } else {
                        updateStatus('AI 正在分析 (' + templateDesc + ')...');
                    }
                } else {
                    updateStatus('AI 正在分析 (' + schema.fields.length + ' 个字段)...');
                }
                
                var result = await generateWithPromptRouter(clinicalKeywords, schema.fields, currentDocTitle, patientContext, hisData);
                
                console.log('[Clinical AI Integration] AI 返回结果:', result);
                
                currentClinicalContent = result;
                
                if (window.AuditLogger) {
                    window.AuditLogger.setTemplate(currentDocTitle);
                    window.AuditLogger.setAiRawOutput(result);
                    console.log('[Clinical AI Integration] 已记录 AI 原始输出到审计日志');
                }
                
                renderSOAPContentDynamic(result, schema.fields);
                
                var injectBtn = document.getElementById('clinicalInjectBtn');
                if (injectBtn) {
                    injectBtn.disabled = false;
                }
                
                if (window.PromptRouter) {
                    updateStatus('AI 分析完成 (' + window.PromptRouter.getTemplateDescription() + ')');
                } else {
                    updateStatus('AI 分析完成');
                }
                
            } catch (error) {
                console.error('[Clinical AI Integration] 生成失败:', error);
                alert('AI 生成失败: ' + error.message);
                updateStatus('AI 服务异常');
            } finally {
                showLoading(false);
            }
        });
    }
    
    async function generateWithPromptRouter(clinicalKeywords, fields, docTitle, patientContext, lisData) {
        console.log('[Clinical AI Integration] ========== 使用模板配置生成 ==========');
        
        var templateConfig = null;
        if (window.EmrTemplateConfig) {
            templateConfig = window.EmrTemplateConfig.detectTemplate(docTitle);
        }
        
        if (templateConfig && window.AIService && window.AIService.generateWithTemplate) {
            console.log('[Clinical AI Integration] 使用模板配置生成:', templateConfig.templateName);
            
            var result = await window.AIService.generateWithTemplate(
                templateConfig.templateId,
                clinicalKeywords,
                patientContext,
                lisData
            );
            
            return result;
        }
        
        console.log('[Clinical AI Integration] 未找到模板配置，使用 PromptRouter 生成');
        
        if (!window.PromptRouter) {
            console.warn('[Clinical AI Integration] PromptRouter 未加载，使用默认生成');
            return window.AIService.generateClinicalRecordDynamic(clinicalKeywords, fields);
        }
        
        var prompts = window.PromptRouter.buildPrompt(clinicalKeywords, patientContext, lisData);
        
        console.log('[Clinical AI Integration] 场景感知 System Prompt:');
        console.log(prompts.systemPrompt);
        console.log('[Clinical AI Integration] 场景感知 User Prompt:');
        console.log(prompts.userPrompt);
        
        if (window.AIService && window.AIService.API_KEY !== 'YOUR_API_KEY') {
            try {
                var response = await fetch(window.AIService.API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + window.AIService.API_KEY
                    },
                    body: JSON.stringify({
                        model: window.AIService.MODEL,
                        messages: [
                            { role: 'system', content: prompts.systemPrompt },
                            { role: 'user', content: prompts.userPrompt }
                        ],
                        max_tokens: window.AIService.MAX_TOKENS,
                        temperature: window.AIService.TEMPERATURE,
                        stream: false
                    })
                });
                
                if (!response.ok) {
                    throw new Error('API 请求失败: ' + response.status);
                }
                
                var data = await response.json();
                var content = data.choices[0].message.content;
                
                console.log('[Clinical AI Integration] AI 原始返回:', content);
                
                var parsed = window.AIService.parseDynamicResponse(content, fields);
                
                if (window.AIService.sanitizeResponse) {
                    parsed = window.AIService.sanitizeResponse(parsed, fields);
                }
                
                return parsed;
                
            } catch (error) {
                console.error('[Clinical AI Integration] API 调用失败:', error);
                return getMockByTemplateType(clinicalKeywords, fields, prompts.templateType, patientContext);
            }
        } else {
            console.log('[Clinical AI Integration] 使用 Mock 数据');
            return getMockByTemplateType(clinicalKeywords, fields, prompts.templateType, patientContext);
        }
    }
    
    function getMockByTemplateType(clinicalKeywords, fields, templateType, patientContext) {
        console.log('[Clinical AI Integration] 生成模板类型 Mock 数据:', templateType);
        
        var result = window.AIService.getMockClinicalRecordDynamic(clinicalKeywords, fields);
        
        if (templateType === 'progress' || templateType === 'first_progress') {
            if (patientContext && patientContext.hasValidContext) {
                console.log('[Clinical AI Integration] 注入患者背景到病程记录 Mock');
                
                if (patientContext.primaryDiagnosis && fields.indexOf('诊断') !== -1) {
                    result['诊断'] = patientContext.primaryDiagnosis;
                }
                
                if (fields.indexOf('病情记录') !== -1) {
                    var progressContent = '患者今日精神可';
                    if (patientContext.chiefComplaint) {
                        progressContent += '，诉' + patientContext.chiefComplaint.replace(/^[0-9]+天?/, '症状较前好转');
                    }
                    progressContent += '。查体：生命体征平稳，心肺腹查体未见明显异常。继续当前治疗，病情稳定。';
                    result['病情记录'] = progressContent;
                }
                
                if (fields.indexOf('查房意见') !== -1) {
                    var roundsOpinion = '患者';
                    if (patientContext.primaryDiagnosis) {
                        roundsOpinion += patientContext.primaryDiagnosis.split('\n')[0];
                    }
                    roundsOpinion += '诊断明确，治疗方案合理，继续当前治疗，监测病情变化。';
                    result['查房意见'] = roundsOpinion;
                }
            }
        }
        
        if (templateType === 'discharge') {
            if (patientContext && patientContext.hasValidContext) {
                if (fields.indexOf('出院诊断') !== -1 && patientContext.primaryDiagnosis) {
                    result['出院诊断'] = patientContext.primaryDiagnosis;
                }
            }
        }
        
        result.templateType = templateType;
        
        return result;
    }
    
    async function extractDocumentSchema() {
        console.log('[Clinical AI Integration] ========== 开始提取文档结构 ==========');
        
        if (!window.tabManager) {
            console.error('[Clinical AI Integration] window.tabManager 不存在');
            return null;
        }
        
        try {
            var editor = await window.tabManager.getCurrentEditor();
            
            if (!editor || !editor.editor) {
                console.error('[Clinical AI Integration] 编辑器实例不存在');
                return null;
            }
            
            console.log('[Clinical AI Integration] 获取到编辑器实例');
            
            var docCode = await getDocCode(editor);
            var $body = $(editor.editor.document.getBody().$);
            
            var fields = [];
            var fieldMap = {};
            
            var $dataElements = $body.find('[data-hm-name]');
            
            console.log('[Clinical AI Integration] 找到数据元数量:', $dataElements.length);
            
            var excludedNames = ['医疗机构名称', '姓名', '性别', '年龄', '科室名称', '床位号', '住院号', '入院时间', '记录时间', '主治医师', '住院医师', '上级医师', '入院记录', '病程记录', '出院记录', '手术记录', '首次病程记录', '日常病程记录', '上级医师查房记录'];
            
            $dataElements.each(function() {
                var $el = $(this);
                var name = $el.attr('data-hm-name');
                var code = $el.attr('data-hm-code');
                var id = $el.attr('data-hm-id');
                
                if (name && excludedNames.indexOf(name) === -1 && fields.indexOf(name) === -1) {
                    fields.push(name);
                    fieldMap[name] = {
                        code: code || '',
                        id: id || ''
                    };
                    console.log('[Clinical AI Integration] 提取字段:', name, 'code:', code, 'id:', id);
                }
            });
            
            var schema = {
                docCode: docCode,
                fields: fields,
                fieldMap: fieldMap
            };
            
            console.log('[Clinical AI Integration] ========== 文档结构提取完成 ==========');
            console.log('[Clinical AI Integration] 最终结构:', schema);
            
            return schema;
            
        } catch (error) {
            console.error('[Clinical AI Integration] 提取文档结构失败:', error);
            return null;
        }
    }
    
    function collectClinicalKeywords() {
        var symptomInput = document.getElementById('clinicalSymptomInput');
        var tagsContainer = document.getElementById('clinicalEvidenceTags');
        
        var keywords = [];
        
        if (symptomInput && symptomInput.value.trim()) {
            keywords.push(symptomInput.value.trim());
        }
        
        if (tagsContainer) {
            var checkedTags = tagsContainer.querySelectorAll('input[type="checkbox"]:checked');
            for (var i = 0; i < checkedTags.length; i++) {
                keywords.push(checkedTags[i].value);
            }
        }
        
        return keywords.length > 0 ? keywords.join('、') : null;
    }
    
    function renderSOAPContentDynamic(content, fields) {
        var placeholder = document.getElementById('clinicalSoapPlaceholder');
        var editArea = document.getElementById('clinicalEditArea');
        var editFields = document.getElementById('clinicalEditFields');
        
        if (!placeholder || !editArea || !editFields) return;
        
        placeholder.style.display = 'none';
        editArea.style.display = 'block';
        
        var html = '';
        
        fields.forEach(function(field) {
            if (content[field]) {
                var fieldId = 'edit_field_' + field.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
                var value = content[field];
                var lineCount = (value.match(/\n/g) || []).length + 1;
                var minHeight = Math.max(80, lineCount * 24);
                
                html += '<div class="clinical-edit-field clinical-draggable-field" draggable="true" data-field-name="' + field + '" data-drag-text="' + escapeAttr(value) + '">';
                html += '<div class="clinical-drag-handle" draggable="false">⋮⋮</div>';
                html += '<div class="clinical-edit-label"><i class="fa fa-edit"></i><span>' + field + '</span></div>';
                html += '<textarea class="clinical-edit-textarea" id="' + fieldId + '" data-field-name="' + field + '" style="min-height:' + minHeight + 'px;">' + escapeHtml(value) + '</textarea>';
                html += '<div class="clinical-char-count">' + value.length + ' 字符</div>';
                html += '</div>';
            }
        });
        
        editFields.innerHTML = html;
        
        var textareas = editFields.querySelectorAll('.clinical-edit-textarea');
        textareas.forEach(function(textarea) {
            textarea.addEventListener('input', function() {
                var countDiv = this.parentElement.querySelector('.clinical-char-count');
                if (countDiv) {
                    countDiv.textContent = this.value.length + ' 字符';
                }
                var fieldDiv = this.closest('.clinical-draggable-field');
                if (fieldDiv) {
                    fieldDiv.setAttribute('data-drag-text', this.value);
                }
            });
        });
        
        console.log('[Clinical AI Integration] 可编辑表单已生成，字段数:', fields.length);
    }
    
    function escapeAttr(text) {
        return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function getEditedContent() {
        var editFields = document.getElementById('clinicalEditFields');
        if (!editFields) return null;
        
        var editedContent = {};
        var textareas = editFields.querySelectorAll('.clinical-edit-textarea');
        
        textareas.forEach(function(textarea) {
            var fieldName = textarea.getAttribute('data-field-name');
            var value = textarea.value.trim();
            if (fieldName && value) {
                editedContent[fieldName] = value;
            }
        });
        
        console.log('[Clinical AI Integration] 获取编辑后的内容:', editedContent);
        
        return editedContent;
    }
    
    function initInjectButton() {
        var injectBtn = document.getElementById('clinicalInjectBtn');
        
        if (!injectBtn) {
            console.warn('[Clinical AI Integration] 未找到注入按钮');
            return;
        }
        
        injectBtn.addEventListener('click', async function() {
            console.log('[Clinical AI Integration] ========== 开始人工审核后注入 ==========');
            
            var editedContent = getEditedContent();
            
            if (!editedContent || Object.keys(editedContent).length === 0) {
                alert('无有效内容，请先生成并确认 AI 建议');
                return;
            }
            
            if (!currentSchema) {
                alert('文档结构信息丢失，请重新生成建议');
                return;
            }
            
            if (!window.tabManager) {
                console.error('[Clinical AI Integration] window.tabManager 不存在');
                alert('编辑器管理器未初始化');
                return;
            }
            
            try {
                var editor = await window.tabManager.getCurrentEditor();
                
                if (!editor) {
                    console.error('[Clinical AI Integration] 无法获取当前编辑器实例');
                    alert('无法获取当前编辑器实例');
                    return;
                }
                
                console.log('[Clinical AI Integration] 获取到编辑器实例:', editor);
                
                var dataItems = [];
                
                currentSchema.fields.forEach(function(fieldName) {
                    if (editedContent[fieldName]) {
                        var fieldInfo = currentSchema.fieldMap[fieldName] || {};
                        dataItems.push({
                            keyCode: fieldInfo.code || '',
                            keyName: fieldName,
                            keyValue: editedContent[fieldName]
                        });
                        console.log('[Clinical AI Integration] 准备注入字段:', fieldName, '长度:', editedContent[fieldName].length);
                    }
                });
                
                var targetedData = {
                    code: currentSchema.docCode,
                    data: dataItems
                };
                
                console.log('[Clinical AI Integration] 最终注入数据:', targetedData);
                
                if (typeof editor.setDocData === 'function') {
                    editor.setDocData(targetedData);
                    console.log('[Clinical AI Integration] ✅ 人工审核后注入成功！');
                    
                    if (window.UnsavedConfirmDialog) {
                        window.UnsavedConfirmDialog.setDirty(true);
                    }
                    
                    if (window.AuditLogger) {
                        window.AuditLogger.logAudit(editedContent);
                    }
                    
                    updateStatus('已注入 ' + dataItems.length + ' 个字段（经医师确认）');
                    
                    setTimeout(async function() {
                        if (window.PatientContextStore) {
                            console.log('[Clinical AI Integration] 注入成功后保存患者上下文...');
                            await extractCurrentDocTitle();
                            window.PatientContextStore.saveFromEditor(editor, currentDocTitle);
                        }
                        updateStatus('AI 服务就绪');
                    }, 500);
                } else {
                    console.error('[Clinical AI Integration] 编辑器不支持 setDocData 方法');
                    alert('编辑器不支持精准注入功能');
                }
                
            } catch (error) {
                console.error('[Clinical AI Integration] 注入失败:', error);
                alert('注入失败: ' + error.message);
            }
            
            console.log('[Clinical AI Integration] ========== 人工审核后注入完成 ==========');
        });
    }
    
    async function getDocCode(editor) {
        var defaultCode = 'DOC001';
        
        try {
            if (editor && editor.editor) {
                var $body = $(editor.editor.document.getBody().$);
                var $firstWidget = $body.find('div[data-hm-widgetid]').first();
                if ($firstWidget.length > 0) {
                    var widgetId = $firstWidget.attr('data-hm-widgetid');
                    if (widgetId && widgetId.trim()) {
                        return widgetId.trim();
                    }
                }
            }
        } catch (error) {
            console.log('[Clinical AI Integration] 获取文档编码失败:', error);
        }
        
        return defaultCode;
    }
    
    function initTabSwitch() {
        var clinicalTab = document.querySelector('.assistant-float-tab-btn[data-tab="clinical"]');
        
        if (clinicalTab) {
            clinicalTab.addEventListener('click', function() {
                console.log('[Clinical AI Integration] 切换到临床 AI 面板');
                
                var allTabs = document.querySelectorAll('.assistant-float-tab-btn');
                allTabs.forEach(function(tab) {
                    tab.classList.remove('active');
                });
                clinicalTab.classList.add('active');
                
                var allPanels = document.querySelectorAll('.assistant-panel');
                allPanels.forEach(function(panel) {
                    panel.style.display = 'none';
                });
                
                var clinicalPanel = document.getElementById('assistantClinicalPanel');
                if (clinicalPanel) {
                    clinicalPanel.style.display = 'block';
                }
                
                var assistantBlock = document.querySelector('.assistant-block');
                if (assistantBlock) {
                    assistantBlock.style.display = 'flex';
                }
            });
        }
    }
    
    function showLoading(show) {
        var overlay = document.getElementById('clinicalLoadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }
    
    function updateStatus(message) {
        var status = document.getElementById('clinicalAiStatus');
        if (status) {
            status.innerHTML = '<i class="fa fa-circle"></i><span>' + message + '</span>';
        }
    }
    
    window.AIInjectAnimation = {
        injectWithAnimation: function(editor, text, position) {
            if (!editor) {
                console.error('[AIInjectAnimation] 编辑器实例不存在');
                return false;
            }
            
            var wrappedHtml = '<span class="ai-injected-text">' + text + '</span>';
            
            console.log('[AIInjectAnimation] 注入文本:', text);
            
            if (typeof editor.insertHtml === 'function') {
                editor.insertHtml(wrappedHtml);
                console.log('[AIInjectAnimation] ✅ 文本已注入，动画播放中...');
                return true;
            } else if (typeof editor.insertDataAtCursor === 'function') {
                editor.insertDataAtCursor(wrappedHtml);
                console.log('[AIInjectAnimation] ✅ 文本已注入（insertDataAtCursor），动画播放中...');
                return true;
            } else {
                console.warn('[AIInjectAnimation] 编辑器不支持 insertHtml 或 insertDataAtCursor');
                return false;
            }
        },
        
        injectMultipleFields: function(editor, fields) {
            if (!editor || !fields || fields.length === 0) {
                console.error('[AIInjectAnimation] 参数无效');
                return;
            }
            
            var self = this;
            var delay = 0;
            
            fields.forEach(function(field, index) {
                setTimeout(function() {
                    var text = field.name + ': ' + field.value;
                    self.injectWithAnimation(editor, text);
                }, delay);
                delay += 500;
            });
        },
        
        mockInjectDemo: function() {
            console.log('[AIInjectAnimation] ========== Mock 注入演示 ==========');
            
            var mockTexts = [
                '患者主诉胸痛2小时',
                '既往有高血压病史5年',
                '查体：血压 160/90mmHg，心率 98次/分'
            ];
            
            var demoContainer = document.createElement('div');
            demoContainer.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #1a2535; padding: 20px; border-radius: 8px; z-index: 10000; max-width: 400px;';
            
            var title = document.createElement('div');
            title.style.cssText = 'color: #3498db; font-weight: 600; margin-bottom: 16px;';
            title.textContent = 'AI 注入动画演示';
            demoContainer.appendChild(title);
            
            var content = document.createElement('div');
            content.style.cssText = 'color: #ecf0f1; line-height: 1.8;';
            demoContainer.appendChild(content);
            
            document.body.appendChild(demoContainer);
            
            mockTexts.forEach(function(text, index) {
                setTimeout(function() {
                    var span = document.createElement('span');
                    span.className = 'ai-injected-text';
                    span.textContent = text;
                    content.appendChild(span);
                    content.appendChild(document.createElement('br'));
                }, index * 1000);
            });
            
            setTimeout(function() {
                demoContainer.remove();
                console.log('[AIInjectAnimation] ========== 演示结束 ==========');
            }, 6000);
        }
    };
    
    window.ClinicalDragDrop = {
        init: function() {
            console.log('[ClinicalDragDrop] 初始化拖拽功能...');
            this.initDraggableFields();
            this.initDropZone();
        },
        
        showDropZone: function() {
            var dropZone = document.getElementById('editorDropZone');
            if (dropZone) {
                dropZone.style.display = 'block';
            }
        },
        
        hideDropZone: function() {
            var dropZone = document.getElementById('editorDropZone');
            if (dropZone) {
                dropZone.style.display = 'none';
                dropZone.classList.remove('drag-over');
            }
        },
        
        initDraggableFields: function() {
            var self = this;
            
            document.addEventListener('dragstart', function(e) {
                var field = e.target.closest('.clinical-draggable-field');
                if (!field) return;
                
                field.classList.add('dragging');
                
                var textContent = field.getAttribute('data-drag-text') || field.textContent.trim();
                
                e.dataTransfer.setData('text/plain', textContent);
                e.dataTransfer.setData('application/json', JSON.stringify({
                    fieldName: field.getAttribute('data-field-name') || '',
                    text: textContent
                }));
                
                e.dataTransfer.effectAllowed = 'copy';
                
                self.showDropZone();
                
                console.log('[ClinicalDragDrop] 开始拖拽:', textContent.substring(0, 50) + '...');
            });
            
            document.addEventListener('dragend', function(e) {
                var field = e.target.closest('.clinical-draggable-field');
                if (field) {
                    field.classList.remove('dragging');
                }
                self.hideDropZone();
            });
        },
        
        initDropZone: function() {
            var self = this;
            
            document.addEventListener('dragover', function(e) {
                var dropZone = e.target.closest('.editor-drop-zone');
                if (!dropZone) return;
                
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                dropZone.classList.add('drag-over');
            });
            
            document.addEventListener('dragleave', function(e) {
                var dropZone = e.target.closest('.editor-drop-zone');
                if (dropZone && !dropZone.contains(e.relatedTarget)) {
                    dropZone.classList.remove('drag-over');
                }
            });
            
            document.addEventListener('drop', function(e) {
                var dropZone = e.target.closest('.editor-drop-zone');
                if (!dropZone) return;
                
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                
                var text = e.dataTransfer.getData('text/plain');
                var jsonData = e.dataTransfer.getData('application/json');
                
                console.log('[ClinicalDragDrop] ========== 文本已放置 ==========');
                console.log('[ClinicalDragDrop] 纯文本:', text);
                
                if (jsonData) {
                    try {
                        var data = JSON.parse(jsonData);
                        console.log('[ClinicalDragDrop] 字段名:', data.fieldName);
                        console.log('[ClinicalDragDrop] 完整数据:', data);
                    } catch (err) {
                        console.warn('[ClinicalDragDrop] JSON 解析失败');
                    }
                }
                
                self.handleDrop(dropZone, text, jsonData);
            });
        },
        
        handleDrop: function(dropZone, text, jsonData) {
            var insertEvent = new CustomEvent('clinical-text-drop', {
                detail: {
                    text: text,
                    jsonData: jsonData,
                    dropZone: dropZone
                },
                bubbles: true
            });
            dropZone.dispatchEvent(insertEvent);
            
            console.log('[ClinicalDragDrop] ✅ 已触发 clinical-text-drop 事件');
        },
        
        makeFieldDraggable: function(fieldElement, fieldName, text) {
            fieldElement.classList.add('clinical-draggable-field');
            fieldElement.setAttribute('draggable', 'true');
            fieldElement.setAttribute('data-field-name', fieldName);
            
            if (text) {
                fieldElement.setAttribute('data-drag-text', text);
            }
            
            var handle = document.createElement('div');
            handle.className = 'clinical-drag-handle';
            handle.innerHTML = '⋮⋮';
            handle.setAttribute('draggable', 'false');
            fieldElement.insertBefore(handle, fieldElement.firstChild);
        },
        
        createDropZone: function(container) {
            var dropZone = document.createElement('div');
            dropZone.className = 'editor-drop-zone';
            dropZone.style.cssText = 'position: relative; padding: 20px; margin: 10px 0; border-radius: 8px; background: rgba(255,255,255,0.5);';
            dropZone.innerHTML = '<div style="color: #94a3b8; text-align: center;">拖拽 AI 内容到此处</div>';
            
            if (container) {
                container.appendChild(dropZone);
            }
            
            return dropZone;
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                window.ClinicalDragDrop.init();
            }, 500);
        });
    } else {
        setTimeout(function() {
            window.ClinicalDragDrop.init();
        }, 500);
    }
    
    window.FocusMode = {
        isFocusMode: false,
        
        init: function() {
            var self = this;
            var btn = document.getElementById('btnFocusMode');
            
            if (!btn) {
                console.warn('[FocusMode] 未找到沉浸模式按钮');
                return;
            }
            
            btn.addEventListener('click', function() {
                self.toggle();
            });
            
            document.addEventListener('keydown', function(e) {
                if (e.key === 'F11' || (e.key === 'Escape' && self.isFocusMode)) {
                    e.preventDefault();
                    self.toggle();
                }
            });
            
            console.log('[FocusMode] 沉浸式模式已初始化');
        },
        
        toggle: function() {
            var container = document.querySelector('.container');
            var btn = document.getElementById('btnFocusMode');
            
            if (!container) return;
            
            this.isFocusMode = !this.isFocusMode;
            
            if (this.isFocusMode) {
                container.classList.add('focus-mode');
                if (btn) {
                    btn.classList.add('active');
                    btn.innerHTML = '<i class="fa fa-compress"></i><span>退出沉浸</span>';
                }
                console.log('[FocusMode] 进入沉浸式模式');
            } else {
                container.classList.remove('focus-mode');
                if (btn) {
                    btn.classList.remove('active');
                    btn.innerHTML = '<i class="fa fa-expand"></i><span>沉浸模式</span>';
                }
                console.log('[FocusMode] 退出沉浸式模式');
            }
        },
        
        enter: function() {
            if (!this.isFocusMode) {
                this.toggle();
            }
        },
        
        exit: function() {
            if (this.isFocusMode) {
                this.toggle();
            }
        }
    };
    
    window.UnsavedConfirmDialog = {
        isDirty: false,
        pendingTabId: null,
        modalElement: null,
        originalCloseTab: null,
        
        init: function() {
            var self = this;
            
            setTimeout(function() {
                if (window.tabManager && window.tabManager.closeTab) {
                    self.originalCloseTab = window.tabManager.closeTab.bind(window.tabManager);
                    
                    window.tabManager.closeTab = function(tabId) {
                        if (self.isDirty) {
                            self.pendingTabId = tabId;
                            self.show();
                            return;
                        }
                        self.originalCloseTab(tabId);
                    };
                    
                    console.log('[UnsavedConfirmDialog] 标签页关闭拦截已初始化');
                }
            }, 1000);
        },
        
        setDirty: function(dirty) {
            this.isDirty = dirty;
            console.log('[UnsavedConfirmDialog] 文档状态:', dirty ? '已修改' : '未修改');
        },
        
        show: function() {
            var self = this;
            
            if (this.modalElement) {
                this.modalElement.remove();
            }
            
            var overlay = document.createElement('div');
            overlay.className = 'unsaved-modal-overlay';
            overlay.innerHTML = 
                '<div class="unsaved-modal">' +
                    '<div class="unsaved-modal-header">' +
                        '<i class="fa fa-exclamation-triangle"></i>' +
                        '<span class="unsaved-modal-title">病历未保存</span>' +
                    '</div>' +
                    '<div class="unsaved-modal-body">' +
                        '<p class="unsaved-modal-message">当前病程记录未同步至 HIS 系统，关闭将丢失所有更改。是否确认丢弃？</p>' +
                        '<div class="unsaved-modal-warning">' +
                            '<i class="fa fa-info-circle"></i>' +
                            '<span>为保障医疗数据安全，建议先保存病历后再关闭标签页。</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="unsaved-modal-footer">' +
                        '<button class="unsaved-modal-btn unsaved-modal-btn-cancel" id="unsavedModalCancel">' +
                            '<i class="fa fa-times"></i>' +
                            '<span>取消</span>' +
                        '</button>' +
                        '<button class="unsaved-modal-btn unsaved-modal-btn-discard" id="unsavedModalDiscard">' +
                            '<i class="fa fa-trash"></i>' +
                            '<span>确认丢弃</span>' +
                        '</button>' +
                    '</div>' +
                '</div>';
            
            document.body.appendChild(overlay);
            this.modalElement = overlay;
            
            var cancelBtn = overlay.querySelector('#unsavedModalCancel');
            var discardBtn = overlay.querySelector('#unsavedModalDiscard');
            
            cancelBtn.focus();
            
            cancelBtn.addEventListener('click', function() {
                self.hide();
            });
            
            discardBtn.addEventListener('click', function() {
                self.hide();
                self.confirmClose();
            });
            
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) {
                    self.hide();
                }
            });
            
            this.keydownHandler = function(e) {
                if (e.key === 'Escape') {
                    self.hide();
                } else if (e.key === 'Enter') {
                    self.hide();
                }
            };
            document.addEventListener('keydown', this.keydownHandler);
            
            console.log('[UnsavedConfirmDialog] 显示未保存确认对话框');
        },
        
        hide: function() {
            if (this.modalElement) {
                this.modalElement.remove();
                this.modalElement = null;
            }
            if (this.keydownHandler) {
                document.removeEventListener('keydown', this.keydownHandler);
            }
            this.pendingTabId = null;
            console.log('[UnsavedConfirmDialog] 关闭确认对话框');
        },
        
        confirmClose: function() {
            var tabId = this.pendingTabId;
            this.isDirty = false;
            this.pendingTabId = null;
            
            if (this.originalCloseTab && tabId) {
                this.originalCloseTab(tabId);
            }
            
            console.log('[UnsavedConfirmDialog] 用户确认丢弃更改，关闭标签页:', tabId);
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }
})();
