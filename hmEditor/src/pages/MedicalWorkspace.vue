<template>
  <div class="medical-workspace" :class="{ 'focus-mode': isFocusMode }">
    <aside class="workspace-sidebar">
      <div class="sidebar-header">
        <h2>病历工作站</h2>
      </div>
      
      <nav class="sidebar-nav">
        <div class="nav-section">
          <div class="nav-section-title">病历文书</div>
          <ul class="nav-list">
            <li 
              v-for="doc in documentList" 
              :key="doc.id"
              class="nav-item"
              :class="{ active: currentDocId === doc.id }"
              @click="selectDocument(doc)"
            >
              <i class="fa fa-file-text-o"></i>
              <span>{{ doc.name }}</span>
            </li>
          </ul>
        </div>
        
        <div class="nav-section">
          <div class="nav-section-title">模板库</div>
          <ul class="nav-list">
            <li class="nav-item" @click="loadTemplate('admission')">
              <i class="fa fa-hospital-o"></i>
              <span>入院记录</span>
            </li>
            <li class="nav-item" @click="loadTemplate('progress')">
              <i class="fa fa-stethoscope"></i>
              <span>病程记录</span>
            </li>
            <li class="nav-item" @click="loadTemplate('discharge')">
              <i class="fa fa-sign-out"></i>
              <span>出院记录</span>
            </li>
          </ul>
        </div>
      </nav>
      
      <div class="sidebar-footer">
        <button class="focus-mode-toggle" @click="toggleFocusMode">
          <i :class="isFocusMode ? 'fa fa-compress' : 'fa fa-expand'"></i>
          <span>{{ isFocusMode ? '退出沉浸' : '沉浸模式' }}</span>
        </button>
      </div>
    </aside>
    
    <main class="workspace-main">
      <header class="main-header">
        <div class="patient-banner">
          <div class="patient-info-item">
            <span class="info-label">姓名</span>
            <span class="info-value">{{ patientInfo.name }}</span>
          </div>
          <div class="patient-info-item">
            <span class="info-label">性别</span>
            <span class="info-value">{{ patientInfo.gender }}</span>
          </div>
          <div class="patient-info-item">
            <span class="info-label">年龄</span>
            <span class="info-value">{{ patientInfo.age }}岁</span>
          </div>
          <div class="patient-info-item">
            <span class="info-label">住院号</span>
            <span class="info-value">#{{ patientInfo.admissionNo }}</span>
          </div>
          <div class="patient-info-item allergy-warning">
            <span class="info-label">过敏史</span>
            <span class="info-value">{{ patientInfo.allergy }}</span>
          </div>
        </div>
        
        <div class="toolbar">
          <button class="toolbar-btn" @click="saveDocument">
            <i class="fa fa-save"></i>
            <span>保存</span>
          </button>
          <button class="toolbar-btn" @click="submitToHis">
            <i class="fa fa-paper-plane"></i>
            <span>提交</span>
          </button>
          <button class="toolbar-btn" @click="exportPdf">
            <i class="fa fa-file-pdf-o"></i>
            <span>导出PDF</span>
          </button>
          <button class="toolbar-btn quality-control-btn" @click="submitQualityControl" :disabled="isQcLoading">
            <i :class="isQcLoading ? 'fa fa-spinner fa-spin' : 'fa fa-shield'"></i>
            <span>{{ isQcLoading ? '质控中...' : '提交质控' }}</span>
          </button>
        </div>
      </header>
      
      <div class="editor-container">
        <HmEditor
          ref="editorRef"
          :editor-id="editorId"
          :read-only="isReadOnly"
          :doc-id="currentDocId"
          width="100%"
          height="100%"
          @ready="onEditorReady"
          @error="onEditorError"
          @destroy="onEditorDestroy"
        />
      </div>
    </main>
    
    <aside class="workspace-ai-panel">
      <header class="ai-panel-header">
        <div class="ai-panel-title">
          <i class="fa fa-robot"></i>
          <span>临床 AI 辅助</span>
        </div>
        <div class="ai-status" :class="aiStatus">
          <i class="fa fa-circle"></i>
          <span>{{ aiStatusText }}</span>
        </div>
      </header>
      
      <div class="ai-panel-content">
        <section class="ai-section">
          <div class="ai-section-title">
            <i class="fa fa-search"></i>
            <span>症状检索</span>
          </div>
          <textarea 
            v-model="symptomInput" 
            class="symptom-input"
            placeholder="请输入患者症状描述..."
            rows="3"
          ></textarea>
        </section>
        
        <section class="ai-section">
          <div class="ai-section-title">
            <i class="fa fa-tags"></i>
            <span>证据标签</span>
          </div>
          <div class="evidence-tags">
            <label 
              v-for="evidence in evidenceList" 
              :key="evidence.id"
              class="evidence-tag"
              :class="{ checked: evidence.checked }"
            >
              <input type="checkbox" v-model="evidence.checked" />
              <span>{{ evidence.label }}</span>
            </label>
          </div>
        </section>
        
        <section class="ai-section">
          <button 
            class="generate-btn"
            @click="generateAiContent"
            :disabled="isGenerating"
          >
            <i :class="isGenerating ? 'fa fa-spinner fa-spin' : 'fa fa-magic'"></i>
            <span>{{ isGenerating ? 'AI 思考中...' : '生成建议' }}</span>
          </button>
        </section>
        
        <section v-if="aiResult" class="ai-section ai-result-section">
          <div class="ai-section-title">
            <i class="fa fa-file-text-o"></i>
            <span>AI 生成内容</span>
            <span class="edit-hint">（可编辑）</span>
          </div>
          
          <div class="ai-result-fields">
            <div 
              v-for="(field, index) in aiResult.fields" 
              :key="index"
              class="ai-result-field"
              draggable="true"
              @dragstart="onFieldDragStart($event, field)"
            >
              <div class="field-header">
                <span class="field-name">{{ field.name }}</span>
                <span class="field-chars">{{ field.content.length }} 字符</span>
              </div>
              <textarea 
                v-model="field.content"
                class="field-textarea"
                :style="{ minHeight: getFieldHeight(field.content) }"
              ></textarea>
              <button 
                class="inject-single-btn"
                @click="injectSingleField(field)"
                title="插入此字段"
              >
                <i class="fa fa-arrow-left"></i>
              </button>
            </div>
          </div>
          
          <div class="ai-disclaimer">
            <i class="fa fa-exclamation-triangle"></i>
            <span>临床决策必须由执业医师最终核实，AI 辅助内容仅供参考</span>
          </div>
          
          <button 
            class="inject-all-btn clinical-ai-btn-success"
            @click="handleInjectAllFields"
          >
            <i class="fa fa-check-circle"></i>
            <span>确认并注入病历</span>
          </button>
        </section>
      </div>
    </aside>

    <QualityControlPanel
      :result="qcResult"
      :is-loading="isQcLoading"
      :error="qcError"
      @retry="submitQualityControl"
      @apply-suggestion="onApplySuggestion"
      @highlight-field="onHighlightField"
    />
    
    <div v-if="showUnsavedModal" class="unsaved-modal-overlay" @click.self="cancelClose">
      <div class="unsaved-modal">
        <div class="unsaved-modal-header">
          <i class="fa fa-exclamation-triangle"></i>
          <span class="unsaved-modal-title">病历未保存</span>
        </div>
        <div class="unsaved-modal-body">
          <p class="unsaved-modal-message">
            当前病程记录未同步至 HIS 系统，关闭将丢失所有更改。是否确认丢弃？
          </p>
          <div class="unsaved-modal-warning">
            <i class="fa fa-info-circle"></i>
            <span>为保障医疗数据安全，建议先保存病历后再关闭标签页。</span>
          </div>
        </div>
        <div class="unsaved-modal-footer">
          <button class="modal-btn cancel-btn" @click="cancelClose">
            <i class="fa fa-times"></i>
            <span>取消</span>
          </button>
          <button class="modal-btn discard-btn" @click="confirmDiscard">
            <i class="fa fa-trash"></i>
            <span>确认丢弃</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import HmEditor from '../components/HmEditor.vue'
import QualityControlPanel from '../components/QualityControlPanel.vue'
import { parsePhysicalExam, isComplexField } from '../utils/emrParser'
import { auditMedicalRecord, AuditResult } from '../utils/llmService'

interface DocumentItem {
  id: string
  name: string
  type: string
}

interface EvidenceItem {
  id: string
  label: string
  checked: boolean
}

interface AiResultField {
  name: string
  content: string
}

interface AiResult {
  fields: AiResultField[]
}

interface HmEditorExpose {
  insertAiContent: (html: string, posTag?: string) => boolean
  insertText: (text: string) => boolean
  setStructuredData: (payload: { code: string; data: Array<{ keyCode: string; keyName: string; keyValue: string }> }) => void
  getHtml: () => string
  getText: () => string
  setReadOnly: (readOnly: boolean) => void
  focusField: (selector: string) => void
  exportPdf: () => void
  getEditorInstance: () => unknown
  injectTextToSpecificField: (fieldName: string, text: string) => Promise<boolean>
}

const editorRef = ref<HmEditorExpose | null>(null)
const editorId = ref('medical-workspace-editor')
const currentDocId = ref('')
const isReadOnly = ref(false)
const isDirty = ref(false)
const isFocusMode = ref(false)

const isQcLoading = ref(false)
const qcResult = ref<AuditResult | null>(null)
const qcError = ref<string | null>(null)

const patientInfo = reactive({
  name: '张三',
  gender: '男',
  age: 45,
  admissionNo: '102938',
  allergy: '青霉素过敏'
})

const documentList = reactive<DocumentItem[]>([
  { id: 'doc-001', name: '入院记录', type: 'admission' },
  { id: 'doc-002', name: '首次病程记录', type: 'progress' },
  { id: 'doc-003', name: '日常病程记录', type: 'progress' }
])

const symptomInput = ref('')
const isGenerating = ref(false)
const aiResult = ref<AiResult | null>(null)
const aiStatus = ref<'ready' | 'generating' | 'error'>('ready')

const aiStatusText = computed(() => {
  switch (aiStatus.value) {
    case 'generating': return 'AI 思考中'
    case 'error': return '服务异常'
    default: return 'AI 服务就绪'
  }
})

const evidenceList = reactive<EvidenceItem[]>([
  { id: 'fever', label: '发热', checked: false },
  { id: 'chest-pain', label: '胸痛', checked: false },
  { id: 'd-dimer', label: 'D-二聚体升高', checked: false },
  { id: 'hypertension', label: '高血压病史', checked: false },
  { id: 'diabetes', label: '糖尿病病史', checked: false },
  { id: 'dyspnea', label: '呼吸困难', checked: false },
  { id: 'cough', label: '咳嗽', checked: false },
  { id: 'fatigue', label: '乏力', checked: false }
])

const showUnsavedModal = ref(false)

const selectDocument = (doc: DocumentItem): void => {
  if (isDirty.value) {
    showUnsavedModal.value = true
    return
  }
  currentDocId.value = doc.id
  console.log('[MedicalWorkspace] 选择文档:', doc.name)
}

const loadTemplate = (type: string): void => {
  console.log('[MedicalWorkspace] 加载模板:', type)
}

const toggleFocusMode = (): void => {
  isFocusMode.value = !isFocusMode.value
}

const saveDocument = (): void => {
  if (!editorRef.value) return
  
  const html = editorRef.value.getHtml()
  console.log('[MedicalWorkspace] 保存文档:', html.length, '字符')
  isDirty.value = false
}

const submitToHis = (): void => {
  if (!editorRef.value) return
  
  console.log('[MedicalWorkspace] 提交至 HIS')
  isDirty.value = false
}

const exportPdf = (): void => {
  if (!editorRef.value) return
  editorRef.value.exportPdf()
}

const onEditorReady = (editor: unknown): void => {
  console.log('[MedicalWorkspace] 编辑器就绪:', editor)
  aiStatus.value = 'ready'
}

const onEditorError = (error: Error): void => {
  console.error('[MedicalWorkspace] 编辑器错误:', error)
  aiStatus.value = 'error'
}

const onEditorDestroy = (): void => {
  console.log('[MedicalWorkspace] 编辑器销毁')
}

const submitQualityControl = async (): Promise<void> => {
  if (!editorRef.value) {
    ElMessage.warning('编辑器未初始化')
    return
  }
  
  const content = editorRef.value.getHtml()
  if (!content || content.length < 50) {
    ElMessage.warning('病历内容过少，无法进行质控')
    return
  }
  
  isQcLoading.value = true
  qcError.value = null
  qcResult.value = null
  
  try {
    const docType = currentDocId.value.includes('progress') ? 'daily_progress' : 'discharge'
    const result = await auditMedicalRecord(content, docType)
    qcResult.value = result
    ElMessage.success(`质控完成，评分：${result.score}分`)
  } catch (error) {
    console.error('[MedicalWorkspace] 质控失败:', error)
    qcError.value = error instanceof Error ? error.message : '质控服务异常'
    ElMessage.error('质控失败，请重试')
  } finally {
    isQcLoading.value = false
  }
}

const onApplySuggestion = async (suggestion: { field?: string; suggestion: string }): Promise<void> => {
  if (!editorRef.value) return
  
  if (suggestion.field) {
    const success = await editorRef.value.injectTextToSpecificField(suggestion.field, suggestion.suggestion)
    if (success) {
      isDirty.value = true
      ElMessage.success(`已应用到「${suggestion.field}」`)
    } else {
      ElMessage.warning('未找到对应字段')
    }
  } else {
    ElMessage.info('该建议无指定字段，请手动处理')
  }
}

const onHighlightField = (fieldName: string): void => {
  if (!editorRef.value) return
  editorRef.value.focusField(`[data-hm-name="${fieldName}"]`)
}

const generateAiContent = async (): Promise<void> => {
  if (!symptomInput.value.trim()) {
    alert('请输入症状描述')
    return
  }
  
  isGenerating.value = true
  aiStatus.value = 'generating'
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const checkedEvidence = evidenceList.filter(e => e.checked).map(e => e.label)
    const keywords = [symptomInput.value, ...checkedEvidence].join('、')
    
    aiResult.value = {
      fields: [
        {
          name: '主诉',
          content: `患者主诉${symptomInput.value}2小时。`
        },
        {
          name: '现病史',
          content: `患者于2小时前无明显诱因出现${keywords}症状，伴胸闷、气促，无恶心、呕吐，无头晕、头痛，遂来我院就诊。急诊查心电图示窦性心律，未见明显ST-T改变。为求进一步诊治，拟"胸痛待查"收入我科。`
        },
        {
          name: '既往史',
          content: checkedEvidence.includes('高血压病史')
            ? '既往有高血压病史5年，规律服用降压药物（苯磺酸氨氯地平5mg qd），血压控制尚可。否认糖尿病、冠心病病史。否认肝炎、结核等传染病史。否认手术、外伤史。否认输血史。'
            : '否认高血压、糖尿病、冠心病等慢性病史。否认肝炎、结核等传染病史。否认手术、外伤史。否认输血史。'
        },
        {
          name: '体格检查',
          content: 'T: 36.5℃, P: 88次/分, R: 20次/分, BP: 140/90mmHg。神志清楚，精神可，查体合作。全身皮肤黏膜无黄染、出血点，浅表淋巴结未触及肿大。双肺呼吸音清，未闻及干湿啰音。心率88次/分，律齐，各瓣膜听诊区未闻及病理性杂音。腹平软，无压痛、反跳痛，肝脾肋下未触及。双下肢无水肿。'
        },
        {
          name: '诊疗计划',
          content: '1. 完善血常规、生化、心肌酶谱、D-二聚体、凝血功能等检查；\n2. 完善心电图、心脏彩超、胸部CT检查；\n3. 给予吸氧、心电监护；\n4. 根据检查结果调整治疗方案。'
        }
      ]
    }
    
    aiStatus.value = 'ready'
    
  } catch (error) {
    console.error('[MedicalWorkspace] AI 生成失败:', error)
    aiStatus.value = 'error'
  } finally {
    isGenerating.value = false
  }
}

const getFieldHeight = (content: string): string => {
  const lines = content.split('\n').length
  const height = Math.max(60, lines * 24)
  return `${height}px`
}

const wrapWithAnimation = (content: string): string => {
  return `<span class="ai-injected-text">${content}</span>`
}

const injectPhysicalExamGranular = (rawText: string): void => {
  if (!rawText) return
  console.log("【智能分发】全面拆分体格检查...")

  const parsedData = parsePhysicalExam(rawText)
  
  for (const [subKey, subValue] of Object.entries(parsedData)) {
    editorRef.value?.injectTextToSpecificField(subKey, subValue)
  }

  console.log('【智能分发】体格检查全面拆分完成，共注入', Object.keys(parsedData).length, '个字段')
}

const injectSingleField = async (field: AiResultField): Promise<void> => {
  if (!editorRef.value) {
    console.warn('[MedicalWorkspace] 编辑器未初始化')
    return
  }
  
  console.log(`[MedicalWorkspace] injectSingleField 被调用，字段名: ${field.name}`)
  
  if (isComplexField(field.name)) {
    console.log('[MedicalWorkspace] 检测到复合字段，走拆分通道')
    const parsedData = parsePhysicalExam(field.content)
    let injectedCount = 0
    for (const [subKey, subValue] of Object.entries(parsedData)) {
      const success = await editorRef.value!.injectTextToSpecificField(subKey, subValue)
      if (success) injectedCount++
    }
    console.log(`[MedicalWorkspace] 复合字段拆分完成，注入 ${injectedCount} 个子字段`)
    isDirty.value = true
    return
  }
  
  const success = editorRef.value.injectTextToSpecificField(field.name, field.content)
  
  if (success) {
    isDirty.value = true
    console.log('[MedicalWorkspace] 单字段已精准注入:', field.name)
  } else {
    console.warn('[MedicalWorkspace] 精准注入失败，尝试整体插入')
    const htmlContent = wrapWithAnimation(
      `<p><strong>${field.name}：</strong>${field.content}</p>`
    )
    const fallbackSuccess = editorRef.value.insertAiContent(htmlContent)
    if (fallbackSuccess) {
      isDirty.value = true
      console.log('[MedicalWorkspace] 已整体插入:', field.name)
    }
  }
}

const handleInjectAllFields = async (): Promise<void> => {
  if (!editorRef.value || !aiResult.value) {
    console.warn('[MedicalWorkspace] 无内容可注入')
    return
  }
  
  let injectedCount = 0
  let failedCount = 0
  
  for (const field of aiResult.value.fields) {
    if (!field.content) continue
    
    if (isComplexField(field.name)) {
      console.log(`[一键注入] 检测到复合字段「${field.name}」，进行拆分注入`)
      const parsedData = parsePhysicalExam(field.content)
      for (const [subKey, subValue] of Object.entries(parsedData)) {
        const success = await editorRef.value!.injectTextToSpecificField(subKey, subValue)
        if (success) {
          injectedCount++
          console.log(`[一键注入] 子字段「${subKey}」注入成功`)
        }
      }
    } else {
      const success = await editorRef.value.injectTextToSpecificField(field.name, field.content)
      if (success) {
        injectedCount++
      } else {
        failedCount++
      }
    }
  }
  
  isDirty.value = true
  console.log(`[MedicalWorkspace] 注入完成: 成功 ${injectedCount}，失败 ${failedCount}`)
  
  if (injectedCount > 0) {
    ElMessage.success(`已注入 ${injectedCount} 个字段`)
  }
  if (failedCount > 0) {
    ElMessage.warning(`${failedCount} 个字段未找到`)
  }
}

const onFieldDragStart = (event: DragEvent, field: AiResultField): void => {
  if (!event.dataTransfer) return
  
  const textContent = `${field.name}：${field.content}`
  event.dataTransfer.setData('text/plain', textContent)
  event.dataTransfer.setData('application/json', JSON.stringify({
    fieldName: field.name,
    content: field.content
  }))
  event.dataTransfer.effectAllowed = 'copy'
}

const cancelClose = (): void => {
  showUnsavedModal.value = false
}

const confirmDiscard = (): void => {
  isDirty.value = false
  showUnsavedModal.value = false
}

const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
  if (isDirty.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  console.log('[MedicalWorkspace] 页面已挂载')
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  console.log('[MedicalWorkspace] 页面卸载')
})
</script>

<style scoped>
.medical-workspace {
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  transition: all 0.3s ease;
}

.medical-workspace.focus-mode .workspace-sidebar {
  transform: translateX(-100%);
  width: 0;
  opacity: 0;
}

.workspace-sidebar {
  width: 240px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.nav-section {
  margin-bottom: 24px;
}

.nav-section-title {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding: 0 12px;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #475569;
  font-size: 14px;
}

.nav-item:hover {
  background-color: #f1f5f9;
}

.nav-item.active {
  background-color: #dbeafe;
  color: #2563eb;
}

.nav-item i {
  width: 16px;
  text-align: center;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e2e8f0;
}

.focus-mode-toggle {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.focus-mode-toggle:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.workspace-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.main-header {
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.patient-banner {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 12px;
}

.patient-info-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.info-value {
  font-size: 13px;
  color: #1e293b;
  font-weight: 600;
}

.allergy-warning {
  background-color: #fee2e2;
  padding: 4px 12px;
  border-radius: 4px;
  margin-left: auto;
}

.allergy-warning .info-label,
.allergy-warning .info-value {
  color: #dc2626;
  font-weight: 700;
}

.toolbar {
  display: flex;
  gap: 8px;
}

.toolbar-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #475569;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  background-color: #f8fafc;
  border-color: #cbd5e1;
}

.toolbar-btn.quality-control-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: transparent;
  color: white;
}

.toolbar-btn.quality-control-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.toolbar-btn.quality-control-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.editor-container {
  flex: 1;
  padding: 16px;
  min-height: 0;
}

.workspace-ai-panel {
  width: 360px;
  background: linear-gradient(135deg, #1a2535 0%, #1e2a38 100%);
  color: #ecf0f1;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #34495e;
  box-shadow: inset 4px 0 8px rgba(0, 0, 0, 0.15);
}

.ai-panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid #34495e;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ai-panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
}

.ai-panel-title i {
  color: #3498db;
}

.ai-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
}

.ai-status.ready i {
  color: #22c55e;
}

.ai-status.generating i {
  color: #f59e0b;
  animation: pulse 1s infinite;
}

.ai-status.error i {
  color: #ef4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.ai-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.ai-section {
  margin-bottom: 20px;
}

.ai-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 10px;
}

.ai-section-title i {
  color: #3498db;
}

.edit-hint {
  font-size: 12px;
  color: #64748b;
  font-weight: 400;
}

.symptom-input {
  width: 100%;
  padding: 12px;
  background-color: #243447;
  border: 1px solid #34495e;
  border-radius: 8px;
  color: #ecf0f1;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
}

.symptom-input:focus {
  outline: none;
  border-color: #3498db;
}

.evidence-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.evidence-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: #243447;
  border: 1px solid #34495e;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
}

.evidence-tag:hover {
  background-color: #2c3e50;
}

.evidence-tag.checked {
  background-color: rgba(52, 152, 219, 0.2);
  border-color: #3498db;
}

.evidence-tag input {
  display: none;
}

.generate-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ai-result-section {
  background-color: #243447;
  border: 1px solid #34495e;
  border-radius: 8px;
  padding: 16px;
  font-variant-numeric: tabular-nums;
}

.ai-result-fields {
  margin-bottom: 16px;
}

.ai-result-field {
  position: relative;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #34495e;
  padding-left: 28px;
}

.ai-result-field:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.field-name {
  font-size: 13px;
  font-weight: 600;
  color: #3498db;
}

.field-chars {
  font-size: 11px;
  color: #64748b;
}

.field-textarea {
  width: 100%;
  padding: 10px;
  background-color: #1a2535;
  border: 1px solid #34495e;
  border-radius: 6px;
  color: #ecf0f1;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
}

.field-textarea:focus {
  outline: none;
  border-color: #3498db;
}

.inject-single-btn {
  position: absolute;
  left: 0;
  top: 28px;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s ease;
}

.ai-result-field:hover .inject-single-btn {
  opacity: 1;
}

.inject-single-btn:hover {
  color: #3498db;
}

.ai-disclaimer {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background-color: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
  margin-bottom: 16px;
}

.ai-disclaimer i {
  color: #ef4444;
  font-size: 14px;
  margin-top: 2px;
}

.ai-disclaimer span {
  font-size: 12px;
  color: #fca5a5;
  line-height: 1.5;
}

.inject-all-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.inject-all-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.4);
}

.unsaved-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.unsaved-modal {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 420px;
  width: 90%;
  overflow: hidden;
}

.unsaved-modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.unsaved-modal-header i {
  font-size: 24px;
  color: #f59e0b;
}

.unsaved-modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.unsaved-modal-body {
  padding: 20px 24px;
}

.unsaved-modal-message {
  font-size: 14px;
  line-height: 1.7;
  color: #475569;
  margin: 0;
}

.unsaved-modal-warning {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 16px;
  padding: 12px 16px;
  background-color: #fef3c7;
  border-radius: 8px;
  border-left: 4px solid #f59e0b;
}

.unsaved-modal-warning i {
  color: #d97706;
  font-size: 16px;
  margin-top: 2px;
}

.unsaved-modal-warning span {
  font-size: 13px;
  color: #92400e;
  line-height: 1.5;
}

.unsaved-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px 20px;
  background-color: #f8fafc;
}

.modal-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  transition: all 0.2s ease;
}

.cancel-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.cancel-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.discard-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.discard-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}
</style>
