<template>
  <div class="clinical-editor-page">
    <div class="editor-section">
      <HmEditor
        ref="editorRef"
        :editor-id="editorId"
        :read-only="readOnly"
        :doc-id="docId"
        :width="'100%'"
        :height="'100%'"
        @ready="onEditorReady"
        @error="onEditorError"
        @destroy="onEditorDestroy"
      />
    </div>
    
    <div class="ai-panel">
      <div class="ai-panel-header">
        <h3>临床 AI 辅助</h3>
      </div>
      
      <div class="ai-panel-content">
        <div class="ai-input-section">
          <label>症状描述</label>
          <textarea 
            v-model="symptomInput" 
            placeholder="请输入患者症状..."
            rows="3"
          ></textarea>
        </div>
        
        <div class="ai-evidence-section">
          <label>证据勾选</label>
          <div class="evidence-tags">
            <label 
              v-for="evidence in evidenceList" 
              :key="evidence.id"
              class="evidence-tag"
            >
              <input type="checkbox" v-model="evidence.checked" />
              <span>{{ evidence.label }}</span>
            </label>
          </div>
        </div>
        
        <button 
          class="generate-btn"
          @click="generateAiContent"
          :disabled="generating"
        >
          <i class="fa fa-magic"></i>
          <span>{{ generating ? '生成中...' : '生成建议' }}</span>
        </button>
        
        <div v-if="aiResult" class="ai-result-section">
          <label>AI 生成结果</label>
          <div class="ai-result-content">
            <div 
              v-for="(item, index) in aiResult" 
              :key="index"
              class="ai-result-item"
            >
              <div class="item-label">{{ item.field }}</div>
              <div class="item-content">{{ item.content }}</div>
              <button 
                class="inject-btn"
                @click="injectSingleField(item)"
              >
                <i class="fa fa-arrow-left"></i>
                插入
              </button>
            </div>
          </div>
          
          <button 
            class="inject-all-btn"
            @click="injectAllFields"
          >
            <i class="fa fa-check-circle"></i>
            确认并注入病历
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import HmEditor from './HmEditor.vue'

interface EvidenceItem {
  id: string
  label: string
  checked: boolean
}

interface AiResultItem {
  field: string
  content: string
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
}

const editorRef = ref<HmEditorExpose | null>(null)
const editorId = ref('clinical-editor-' + Date.now())
const docId = ref('')
const readOnly = ref(false)

const symptomInput = ref('')
const generating = ref(false)
const aiResult = ref<AiResultItem[] | null>(null)

const evidenceList = reactive<EvidenceItem[]>([
  { id: 'fever', label: '发热', checked: false },
  { id: 'chest-pain', label: '胸痛', checked: false },
  { id: 'd-dimer', label: 'D-二聚体升高', checked: false },
  { id: 'hypertension', label: '高血压病史', checked: false },
  { id: 'diabetes', label: '糖尿病病史', checked: false },
  { id: 'dyspnea', label: '呼吸困难', checked: false }
])

const onEditorReady = (editor: unknown): void => {
  console.log('[ClinicalPage] 编辑器已就绪:', editor)
}

const onEditorError = (error: Error): void => {
  console.error('[ClinicalPage] 编辑器错误:', error)
}

const onEditorDestroy = (): void => {
  console.log('[ClinicalPage] 编辑器已销毁')
}

const generateAiContent = async (): Promise<void> => {
  if (!symptomInput.value.trim()) {
    alert('请输入症状描述')
    return
  }
  
  generating.value = true
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const checkedEvidence = evidenceList.filter(e => e.checked).map(e => e.label)
    const keywords = [symptomInput.value, ...checkedEvidence].join('、')
    
    aiResult.value = [
      {
        field: '主诉',
        content: `患者主诉${symptomInput.value}2小时。`
      },
      {
        field: '现病史',
        content: `患者于2小时前无明显诱因出现${keywords}症状，伴胸闷、气促，无恶心、呕吐，无头晕、头痛，遂来我院就诊。`
      },
      {
        field: '既往史',
        content: checkedEvidence.includes('高血压病史') 
          ? '既往有高血压病史5年，规律服用降压药物，血压控制尚可。'
          : '否认高血压、糖尿病、冠心病等慢性病史。'
      },
      {
        field: '体格检查',
        content: 'T: 36.5℃, P: 88次/分, R: 20次/分, BP: 140/90mmHg。神志清楚，精神可，查体合作。双肺呼吸音清，未闻及干湿啰音。心率88次/分，律齐，各瓣膜听诊区未闻及病理性杂音。'
      }
    ]
    
  } catch (error) {
    console.error('生成 AI 内容失败:', error)
    alert('生成失败，请重试')
  } finally {
    generating.value = false
  }
}

const injectSingleField = (item: AiResultItem): void => {
  if (!editorRef.value) {
    alert('编辑器未初始化')
    return
  }
  
  const htmlContent = `<p><strong>${item.field}：</strong>${item.content}</p>`
  const success = editorRef.value.insertAiContent(htmlContent)
  
  if (success) {
    console.log('[ClinicalPage] 单字段已注入:', item.field)
  } else {
    alert('插入失败')
  }
}

const injectAllFields = (): void => {
  if (!editorRef.value || !aiResult.value) {
    alert('无内容可注入')
    return
  }
  
  const dataItems = aiResult.value.map(item => ({
    keyCode: '',
    keyName: item.field,
    keyValue: item.content
  }))
  
  editorRef.value.setStructuredData({
    code: 'DOC001',
    data: dataItems
  })
  
  console.log('[ClinicalPage] 所有字段已注入')
  alert('病历已成功注入')
}

onMounted(() => {
  console.log('[ClinicalPage] 页面已挂载')
})
</script>

<style scoped>
.clinical-editor-page {
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.editor-section {
  flex: 1;
  padding: 20px;
  min-width: 0;
}

.ai-panel {
  width: 360px;
  background: linear-gradient(135deg, #1a2535 0%, #1e2a38 100%);
  color: #ecf0f1;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #34495e;
}

.ai-panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid #34495e;
}

.ai-panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #3498db;
}

.ai-panel-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.ai-input-section,
.ai-evidence-section,
.ai-result-section {
  margin-bottom: 20px;
}

.ai-input-section label,
.ai-evidence-section label,
.ai-result-section label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 8px;
}

.ai-input-section textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #34495e;
  border-radius: 8px;
  background-color: #243447;
  color: #ecf0f1;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
}

.ai-input-section textarea:focus {
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
}

.evidence-tag:hover {
  background-color: #2c3e50;
}

.evidence-tag input {
  accent-color: #3498db;
}

.evidence-tag span {
  font-size: 13px;
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

.ai-result-content {
  background-color: #243447;
  border: 1px solid #34495e;
  border-radius: 8px;
  overflow: hidden;
}

.ai-result-item {
  padding: 12px;
  border-bottom: 1px solid #34495e;
  position: relative;
}

.ai-result-item:last-child {
  border-bottom: none;
}

.item-label {
  font-size: 12px;
  font-weight: 600;
  color: #3498db;
  margin-bottom: 6px;
}

.item-content {
  font-size: 13px;
  line-height: 1.6;
  color: #ecf0f1;
  padding-right: 60px;
}

.inject-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  padding: 6px 12px;
  background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.inject-btn:hover {
  transform: translateY(-50%) scale(1.05);
}

.inject-all-btn {
  width: 100%;
  margin-top: 16px;
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
</style>
