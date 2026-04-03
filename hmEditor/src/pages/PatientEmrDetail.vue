<template>
  <div class="emr-workstation">
    <div class="left-panel">
      <div class="panel-header">
        <div class="toolbar-title">
          <i class="fa fa-hospital-o"></i>
          <span class="title-text">病历文书</span>
        </div>
        <el-button type="danger" size="small" @click="forceTestPhysicalExam">暴力测试体格检查</el-button>
      </div>
      
      <div class="panel-content">
        <div class="document-tree">
          <div class="tree-container">
            <div 
              v-for="category in documentCategories" 
              :key="category.id"
              class="tree-category"
            >
              <div 
                class="tree-category-header"
                @click="toggleCategory(category.id)"
              >
                <i :class="expandedCategories.includes(category.id) ? 'fa fa-caret-down' : 'fa fa-caret-right'"></i>
                <i :class="category.icon"></i>
                <span class="category-name">{{ category.name }}</span>
                <span class="category-count">({{ getCategoryDocCount(category.id) }})</span>
                <el-button 
                  type="primary" 
                  size="small" 
                  link
                  class="category-add-btn"
                  @click.stop="showAddDocMenu($event, category.id)"
                >
                  <i class="fa fa-plus"></i>
                </el-button>
              </div>
              
              <div 
                class="tree-category-children"
                v-show="expandedCategories.includes(category.id)"
              >
                <div 
                  v-for="doc in getCategoryDocuments(category.id)" 
                  :key="doc.id"
                  class="tree-item"
                  :class="{ active: currentDoc?.id === doc.id }"
                  @click="selectDocument(doc)"
                >
                  <i :class="getDocIcon(doc.category)"></i>
                  <span class="tree-item-name">{{ doc.name }}</span>
                  <el-tag 
                    :type="doc.status === 'signed' ? 'success' : 'warning'" 
                    size="small"
                    class="tree-item-status"
                  >
                    {{ doc.status === 'signed' ? '已签名' : '草稿' }}
                  </el-tag>
                </div>
                <div v-if="getCategoryDocuments(category.id).length === 0" class="tree-category-empty">
                  <span>暂无文书</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div 
        v-if="addDocMenuVisible"
        class="add-doc-menu-overlay"
        @click="closeAddDocMenu"
      >
        <div 
          class="add-doc-menu"
          :style="addDocMenuStyle"
          @click.stop
        >
          <div class="add-doc-menu-header">
            <i :class="currentCategory?.icon"></i>
            <span>{{ currentCategory?.name }}</span>
          </div>
          <div class="add-doc-menu-list">
            <div 
              v-for="item in currentCategoryDocs"
              :key="item.value"
              class="add-doc-menu-item"
              @click="handleSelectDocType(item)"
            >
              <i :class="item.icon"></i>
              <span>{{ item.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <div class="main-content">
      <div class="patient-banner">
        <div class="patient-banner-back" @click="goBack">
          <i class="fa fa-arrow-left"></i>
          <span>返回列表</span>
        </div>
        <div class="patient-banner-divider"></div>
        <div class="patient-banner-item">
          <span class="patient-banner-label">姓名</span>
          <span class="patient-banner-value">{{ patient?.name || '未知' }}</span>
        </div>
        <div class="patient-banner-item">
          <span class="patient-banner-label">性别</span>
          <span class="patient-banner-value">{{ patient?.gender || '-' }}</span>
        </div>
        <div class="patient-banner-item">
          <span class="patient-banner-label">年龄</span>
          <span class="patient-banner-value">{{ patient?.age || '-' }}岁</span>
        </div>
        <div class="patient-banner-item">
          <span class="patient-banner-label">床号</span>
          <span class="patient-banner-value">{{ patient?.bedNumber || '-' }}</span>
        </div>
        <div class="patient-banner-item">
          <span class="patient-banner-label">住院号</span>
          <span class="patient-banner-value">{{ patient?.inpatientId || '-' }}</span>
        </div>
        <div class="patient-banner-item">
          <span class="patient-banner-label">入院日期</span>
          <span class="patient-banner-value">{{ patient?.admissionDate || '-' }}</span>
        </div>
        <div class="patient-banner-item patient-banner-allergy" v-if="patient?.allergy">
          <span class="patient-banner-label">过敏史</span>
          <span class="patient-banner-value">{{ patient.allergy }}</span>
        </div>
        <div class="patient-banner-item patient-banner-diagnosis" v-if="patient?.diagnosis">
          <span class="patient-banner-label">诊断</span>
          <span class="patient-banner-value">{{ patient.diagnosis }}</span>
        </div>
      </div>

      <div class="main-page">
        <div class="editor-toolbar" v-if="currentDoc">
          <div class="toolbar-left">
            <span class="current-doc-name">
              <i :class="getDocIcon(currentDoc.category)"></i>
              {{ currentDoc.name }}
            </span>
            <el-tag :type="currentDoc.status === 'signed' ? 'success' : 'warning'" size="small">
              {{ currentDoc.status === 'signed' ? '已签名' : '草稿' }}
            </el-tag>
          </div>
          <div class="toolbar-right">
            <el-button type="primary" size="small" @click="saveDocument">
              <i class="fa fa-save"></i>
              保存
            </el-button>
            <el-button type="success" size="small" @click="signDocument" :disabled="currentDoc.status === 'signed'">
              <i class="fa fa-check-circle"></i>
              签名
            </el-button>
            <el-button size="small" @click="exportDocumentPdf">
              <i class="fa fa-file-pdf-o"></i>
              导出PDF
            </el-button>
            <el-button type="danger" size="small" @click="deleteCurrentDocument">
              <i class="fa fa-trash"></i>
              删除
            </el-button>
          </div>
        </div>

        <div class="editor-container">
          <div v-if="!currentDoc" class="editor-placeholder">
            <i class="fa fa-file-text-o"></i>
            <p>请从左侧选择或创建病历文书</p>
          </div>
          <HmEditor
            v-else
            :key="currentDoc.id"
            ref="editorRef"
            :editor-id="'editor-' + currentDoc.id"
            :doc-id="currentDoc.id"
            :data-url="currentDoc.templatePath || ''"
            width="100%"
            height="100%"
            @ready="onEditorReady"
            @error="onEditorError"
          />
        </div>
      </div>
    </div>

    <div class="side-panel">
      <div class="assistant-float-tab-col">
        <div 
          class="assistant-float-tab-btn" 
          :class="{ active: activeTab === 'ai' }"
          @click="activeTab = 'ai'"
        >
          <i class="fa fa-robot"></i>
          <span>AI 辅助</span>
        </div>
        <div 
          class="assistant-float-tab-btn" 
          :class="{ active: activeTab === 'context' }"
          @click="activeTab = 'context'"
        >
          <i class="fa fa-user-md"></i>
          <span>患者信息</span>
        </div>
      </div>

      <div class="assistant-block">
        <div class="assistant-header">
          <div class="assistant-title">
            <i :class="activeTab === 'ai' ? 'fa fa-robot' : 'fa fa-user-md'"></i>
            {{ activeTab === 'ai' ? '临床 AI 辅助' : '患者信息' }}
          </div>
        </div>

        <div class="assistant-panel" v-show="activeTab === 'ai'">
          <div class="clinical-ai-panel">
            <div class="clinical-ai-section">
              <div class="clinical-ai-section-title">
                <i class="fa fa-file-text-o"></i>
                <span>当前文书：{{ currentDoc?.name || '未选择' }}</span>
              </div>
              <div class="doc-type-hint" v-if="currentDoc">
                <el-tag size="small" type="info">{{ getDocTypeHint(currentDoc.docType) }}</el-tag>
              </div>
            </div>

            <div class="clinical-ai-section api-config-section">
              <div class="clinical-ai-section-title" @click="showApiConfig = !showApiConfig">
                <i class="fa fa-cog"></i>
                <span>API 配置</span>
                <i :class="showApiConfig ? 'fa fa-chevron-up' : 'fa fa-chevron-down'" class="toggle-icon"></i>
              </div>
              <div v-show="showApiConfig" class="api-config-content">
                <el-input
                  v-model="apiKeyInput"
                  type="password"
                  placeholder="输入 DeepSeek API Key"
                  show-password
                  size="small"
                />
                <div class="api-config-buttons">
                  <el-button 
                    type="primary" 
                    size="small" 
                    @click="saveApiKey"
                  >
                    保存配置
                  </el-button>
                  <el-button 
                    type="info" 
                    size="small" 
                    @click="testStorage"
                  >
                    测试存储
                  </el-button>
                </div>
                <div class="api-status">
                  <el-tag :type="hasApiKey ? 'success' : 'warning'" size="small">
                    {{ hasApiKey ? '已配置 API Key' : '使用模拟数据' }}
                  </el-tag>
                </div>
              </div>
            </div>

            <div class="clinical-ai-section">
              <div class="clinical-ai-section-title">
                <i class="fa fa-edit"></i>
                <span>临床描述</span>
              </div>
              <div class="clinical-search-wrapper">
                <el-input
                  v-model="aiSymptomInput"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入患者症状、体征、检查结果等临床信息...&#10;&#10;例如：患者发热3天，咳嗽咳痰，体温38.5℃，右下肺湿啰音"
                  @keyup.ctrl.enter="generateAiContent"
                />
              </div>
              <div class="input-hint">
                <span>Ctrl + Enter 快速生成</span>
              </div>
            </div>

            <div class="clinical-ai-section">
              <div class="clinical-ai-section-title">
                <i class="fa fa-file-text-o"></i>
                <span>AI 生成内容</span>
              </div>
              <div class="clinical-soap-result">
                <div v-if="!aiResult" class="clinical-soap-placeholder">
                  <i class="fa fa-clipboard"></i>
                  <p>请输入临床描述<br>点击"生成建议"查看 AI 分析结果</p>
                </div>
                <div v-else class="clinical-edit-area">
                  <el-input
                    v-model="aiResult"
                    type="textarea"
                    :rows="8"
                    placeholder="AI 生成内容..."
                  />
                  <div class="clinical-disclaimer">
                    <i class="fa fa-exclamation-triangle"></i>
                    <span>临床决策必须由执业医师最终核实，AI 辅助内容仅供参考</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="clinical-ai-section" v-if="hasStructuredContent">
              <div class="clinical-ai-section-title">
                <i class="fa fa-list-alt"></i>
                <span>字段级注入</span>
              </div>
              <div class="structured-fields-container">
                <div 
                  v-for="field in getStructuredFields" 
                  :key="field.key"
                  class="structured-field-card"
                >
                  <div class="structured-field-header">
                    <span class="structured-field-label">{{ field.label }}</span>
                    <el-button 
                      type="success" 
                      size="small"
                      class="inject-field-btn"
                      @click.prevent="forceRouteInject(field)"
                    >
                      <i class="fa fa-arrow-left"></i>
                      注入
                    </el-button>
                  </div>
                  <div class="structured-field-content">
                    {{ field.content.length > 100 ? field.content.substring(0, 100) + '...' : field.content }}
                  </div>
                </div>
              </div>
            </div>

            <div class="clinical-ai-actions">
              <el-button 
                type="primary" 
                :loading="isGenerating"
                :disabled="!hasSymptomInput"
                @click="generateAiContent"
              >
                <i v-if="!isGenerating" class="fa fa-magic"></i>
                {{ isGenerating ? 'AI 思考中...' : '生成建议' }}
              </el-button>
              <el-button
                type="success"
                :disabled="!aiResult || !currentDoc"
                @click="injectAiContent"
              >
                <i class="fa fa-check-circle"></i>
                注入病历
              </el-button>
              <el-button
                type="warning"
                @click="debugFields"
              >
                <i class="fa fa-bug"></i>
                调试字段
              </el-button>
            </div>
          </div>
        </div>

        <div class="assistant-panel" v-show="activeTab === 'context'">
          <div class="patient-context-panel">
            <div class="context-section">
              <div class="context-section-title">
                <i class="fa fa-user"></i>
                基本信息
              </div>
              <div class="context-info-grid">
                <div class="context-info-item">
                  <span class="context-label">姓名</span>
                  <span class="context-value">{{ patient?.name || '-' }}</span>
                </div>
                <div class="context-info-item">
                  <span class="context-label">性别</span>
                  <span class="context-value">{{ patient?.gender || '-' }}</span>
                </div>
                <div class="context-info-item">
                  <span class="context-label">年龄</span>
                  <span class="context-value">{{ patient?.age || '-' }}岁</span>
                </div>
                <div class="context-info-item">
                  <span class="context-label">床号</span>
                  <span class="context-value">{{ patient?.bedNumber || '-' }}</span>
                </div>
              </div>
            </div>

            <div class="context-section">
              <div class="context-section-title">
                <i class="fa fa-hospital-o"></i>
                住院信息
              </div>
              <div class="context-info-grid">
                <div class="context-info-item">
                  <span class="context-label">住院号</span>
                  <span class="context-value">{{ patient?.inpatientId || '-' }}</span>
                </div>
                <div class="context-info-item">
                  <span class="context-label">入院日期</span>
                  <span class="context-value">{{ patient?.admissionDate || '-' }}</span>
                </div>
                <div class="context-info-item">
                  <span class="context-label">科室</span>
                  <span class="context-value">{{ patient?.department || '-' }}</span>
                </div>
                <div class="context-info-item">
                  <span class="context-label">主治医师</span>
                  <span class="context-value">{{ patient?.doctor || '-' }}</span>
                </div>
              </div>
            </div>

            <div class="context-section" v-if="patient?.diagnosis">
              <div class="context-section-title">
                <i class="fa fa-stethoscope"></i>
                诊断信息
              </div>
              <div class="context-diagnosis">
                {{ patient.diagnosis }}
              </div>
            </div>

            <div class="context-section" v-if="patient?.allergy">
              <div class="context-section-title">
                <i class="fa fa-exclamation-triangle"></i>
                过敏史
              </div>
              <div class="context-allergy">
                <i class="fa fa-warning"></i>
                {{ patient.allergy }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePatientStore, type Patient } from '../stores/patient'
import HmEditor from '../components/HmEditor.vue'
import { parsePhysicalExam, isComplexField } from '../utils/emrParser'
import { generateMedicalRecord, setApiKey, getApiKey, testLocalStorage, type MedicalRecordResult, type PatientInfo } from '../utils/llmService'
import { documentApi } from '../utils/api'

interface DocumentRecord {
  id: string
  name: string
  category: string
  docType: string
  createTime: Date
  status: 'draft' | 'signed'
  content?: string
  templatePath?: string
}

interface DocumentType {
  value: string
  label: string
  children: {
    value: string
    label: string
    icon: string
    templatePath?: string
  }[]
}

interface HmEditorExpose {
  insertAiContent: (html: string, posTag?: string) => boolean
  insertText: (text: string) => boolean
  setStructuredData: (payload: { code: string; data: Array<{ keyCode: string; keyName: string; keyValue: string }> }) => void
  getHtml: () => string
  getText: () => string
  setData: (html: string) => boolean
  setReadOnly: (readOnly: boolean) => void
  focusField: (selector: string) => void
  exportPdf: () => void
  getEditorInstance: () => unknown
  appendRecordTemplate: (templateHtml: string, recordTitle?: string) => Promise<boolean>
  appendEditorHtml: (htmlContent: string) => boolean
  injectTextToSpecificField: (fieldName: string, textToInject: string) => Promise<boolean>
  setDocContent: (payload: { code: string; docTplName?: string; docContent: string }) => void
  debugAvailableFields: () => void
  iframeLoaded: boolean
}

const route = useRoute()
const router = useRouter()
const patientStore = usePatientStore()

const patient = ref<Patient | null>(null)
const editorRef = ref<HmEditorExpose | null>(null)

const documents = ref<DocumentRecord[]>([])
const currentDoc = ref<DocumentRecord | null>(null)
const activeTab = ref<'ai' | 'context'>('ai')
const editorReady = ref(false)
const expandedCategories = ref<string[]>(['medical_record', 'admission_record', 'progress_record', 'surgery_record', 'discharge_record'])
const pendingTemplatePath = ref<string | null>(null)

const aiSymptomInput = ref('')
const isGenerating = ref(false)
const aiResult = ref('')

const showApiConfig = ref(false)
const apiKeyInput = ref('')

const getDraftKey = (patientId: string, docType: string): string => {
  return `emr_draft_${patientId}_${docType}`
}

const saveDraftToLocalStorage = (patientId: string, docType: string, html: string): void => {
  try {
    const key = getDraftKey(patientId, docType)
    console.log(`[Draft] 保存草稿 Key: ${key}, HTML长度: ${html?.length || 0}`)
    localStorage.setItem(key, JSON.stringify({
      html,
      savedAt: new Date().toISOString()
    }))
    console.log('[Draft] 已保存草稿到 localStorage:', key)
  } catch (e) {
    console.warn('[Draft] 保存草稿失败:', e)
  }
}

const loadDraftFromLocalStorage = (patientId: string, docType: string): string | null => {
  try {
    const key = getDraftKey(patientId, docType)
    console.log(`[Draft] 查找草稿 Key: ${key}`)
    const data = localStorage.getItem(key)
    if (data) {
      const parsed = JSON.parse(data)
      console.log('[Draft] 从 localStorage 加载草稿:', key, '保存时间:', parsed.savedAt, '长度:', parsed.html?.length)
      return parsed.html
    } else {
      console.log('[Draft] 未找到草稿:', key)
    }
  } catch (e) {
    console.warn('[Draft] 加载草稿失败:', e)
  }
  return null
}

const clearDraftFromLocalStorage = (patientId: string, docType: string): void => {
  try {
    const key = getDraftKey(patientId, docType)
    localStorage.removeItem(key)
    console.log('[Draft] 已清除草稿:', key)
  } catch (e) {
    console.warn('[Draft] 清除草稿失败:', e)
  }
}

const restoreDraft = async (doc: DocumentRecord): Promise<boolean> => {
  if (!editorRef.value) {
    console.warn('[restoreDraft] 编辑器引用不存在')
    return false
  }
  
  const patientId = patient.value?.id
  const docType = doc.docType
  if (!patientId || !docType) {
    console.warn('[restoreDraft] 缺少 patientId 或 docType', { patientId, docType })
    return false
  }
  
  console.log(`[restoreDraft] 尝试恢复草稿 patientId=${patientId}, docType=${docType}`)
  
  const draftHtml = loadDraftFromLocalStorage(patientId, docType)
  if (draftHtml && draftHtml.length > 5) {
    console.log('[restoreDraft] 发现本地草稿，正在恢复... 长度:', draftHtml.length)
    const success = editorRef.value.setData?.(draftHtml)
    console.log('[restoreDraft] setData 结果:', success)
    return success === true
  }
  
  if (doc.id && !doc.id.startsWith('temp_') && doc.content && doc.content.length > 5) {
    console.log('[restoreDraft] 从后端加载已保存内容，长度:', doc.content?.length)
    editorRef.value.setDocContent?.({
      code: doc.id,
      docTplName: doc.name,
      docContent: doc.content
    })
    return true
  }
  
  console.log('[restoreDraft] 无草稿，无后端内容，尝试加载模板...')
  
  const templatePath = doc.templatePath
  if (templatePath) {
    try {
      const response = await fetch(templatePath)
      if (response.ok) {
        let templateHtml = await response.text()
        const bodyMatch = templateHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)
        if (bodyMatch) {
          templateHtml = bodyMatch[0]
        }
        if (templateHtml && templateHtml.length > 5) {
          console.log('[restoreDraft] 加载模板成功，长度:', templateHtml.length)
          editorRef.value.setDocContent?.({
            code: doc.id || docType,
            docTplName: doc.name,
            docContent: templateHtml
          })
          return true
        }
      }
    } catch (e) {
      console.warn('[restoreDraft] 加载模板失败:', e)
    }
  }
  
  console.warn('[restoreDraft] 启用兜底模板')
  const fallbackHtml = `
    <div style="padding: 20px; font-family: SimSun, serif;">
      <h2 style="text-align: center; font-size: 18px; margin-bottom: 20px;">${doc.name || docType}</h2>
      <div style="margin: 10px 0;">
        <span style="font-weight: bold;">主诉：</span>
        <span class="new-textbox" data-hm-name="主诉" data-hm-code="DE04.01.119.00">
          <span class="new-textbox-content" contenteditable="true" style="min-width: 300px; display: inline-block; border-bottom: 1px solid #333;">在此输入...</span>
        </span>
      </div>
      <div style="margin: 10px 0;">
        <span style="font-weight: bold;">现病史：</span>
        <span class="new-textbox" data-hm-name="现病史" data-hm-code="DE02.10.071.00">
          <span class="new-textbox-content" contenteditable="true" style="min-width: 100%; display: block; min-height: 100px; border: 1px solid #ccc; padding: 5px;">在此输入...</span>
        </span>
      </div>
    </div>
  `
  editorRef.value.setData?.(fallbackHtml)
  return true
}

const hasApiKey = computed(() => {
  return getApiKey() !== '' && getApiKey() !== 'YOUR_API_KEY_HERE'
})

const saveApiKey = (): void => {
  if (apiKeyInput.value.trim()) {
    setApiKey(apiKeyInput.value.trim())
    localStorage.setItem('llm_api_key', apiKeyInput.value.trim())
    ElMessage.success('API Key 已保存')
    showApiConfig.value = false
  } else {
    ElMessage.warning('请输入有效的 API Key')
  }
}

const testStorage = (): void => {
  const result = testLocalStorage()
  console.log('[本地存储测试]', result)
  
  if (result.success) {
    ElMessage.success(`本地存储正常，已保存的 API Key: ${result.savedKey || '无'}`)
  } else {
    ElMessage.error(result.message)
  }
}

const loadApiKey = (): void => {
  const savedKey = localStorage.getItem('llm_api_key')
  console.log('[加载 API Key] localStorage 中的值:', savedKey ? `${savedKey.substring(0, 8)}...` : '无')
  
  if (savedKey) {
    apiKeyInput.value = savedKey
    setApiKey(savedKey)
    console.log('[加载 API Key] 已设置到内存')
  }
}

interface StructuredAiResult {
  主诉?: string
  现病史?: string
  既往史?: string
  个人史?: string
  月经史?: string
  婚育史?: string
  家族史?: string
  生命体征?: string
  一般体查?: string
  专科体查?: string
  辅助检查?: string
  入院诊断?: string
  入院情况?: string
  诊疗经过?: string
  出院诊断?: string
  出院医嘱?: string
  抢救经过?: string
  死亡原因?: string
  死亡诊断?: string
  病情简介?: string
  讨论意见?: string
  主持人总结?: string
  手术经过?: string
  术前诊断?: string
  术后诊断?: string
  chiefComplaint?: string
  presentIllness?: string
  pastHistory?: string
  personalHistory?: string
  familyHistory?: string
  physicalExamination?: string
  auxiliaryExam?: string
  preliminaryDiagnosis?: string
  diagnosisBasis?: string
  differentialDiagnosis?: string
  treatmentPlan?: string
  historyFeature?: string
  caseType?: string
  diseaseProgress?: string
  physicalFindings?: string
  conditionAssessment?: string
  treatmentOpinion?: string
  attendingAnalysis?: string
  chiefAnalysis?: string
  diagnosisAnalysis?: string
  differentialAnalysis?: string
}

const structuredAiResult = ref<StructuredAiResult>({})

const aiFieldLabels: Record<keyof StructuredAiResult, string> = {
  主诉: '主诉',
  现病史: '现病史',
  既往史: '既往史',
  个人史: '个人史',
  月经史: '月经史',
  婚育史: '婚育史',
  家族史: '家族史',
  生命体征: '生命体征',
  一般体查: '一般体查',
  专科体查: '专科体查',
  辅助检查: '辅助检查',
  入院诊断: '入院诊断',
  入院情况: '入院情况',
  诊疗经过: '诊疗经过',
  出院诊断: '出院诊断',
  出院医嘱: '出院医嘱',
  抢救经过: '抢救经过',
  死亡原因: '死亡原因',
  死亡诊断: '死亡诊断',
  病情简介: '病情简介',
  讨论意见: '讨论意见',
  主持人总结: '主持人总结',
  手术经过: '手术经过',
  术前诊断: '术前诊断',
  术后诊断: '术后诊断',
  chiefComplaint: '主诉',
  presentIllness: '现病史',
  pastHistory: '既往史',
  personalHistory: '个人史',
  familyHistory: '家族史',
  physicalExamination: '体格检查',
  auxiliaryExam: '辅助检查',
  preliminaryDiagnosis: '初步诊断',
  diagnosisBasis: '诊断依据',
  differentialDiagnosis: '鉴别诊断',
  treatmentPlan: '诊疗计划',
  historyFeature: '病史特征',
  caseType: '病历分型',
  diseaseProgress: '病情演变',
  physicalFindings: '查体所见',
  conditionAssessment: '病情评估',
  treatmentOpinion: '处理意见',
  attendingAnalysis: '病情分析',
  chiefAnalysis: '主治医师分析',
  diagnosisAnalysis: '诊断分析',
  differentialAnalysis: '鉴别诊断分析'
}

const allFieldNames = ['主诉', '现病史', '既往史', '个人史', '月经史', '婚育史', '家族史', '生命体征', '一般体查', '专科体查', '辅助检查', '入院诊断', '入院情况', '诊疗经过', '出院诊断', '出院医嘱', '抢救经过', '死亡原因', '死亡诊断', '病情简介', '讨论意见', '主持人总结', '病史特征', '初步诊断', '鉴别诊断', '病历分型', '诊断依据', '诊疗计划']

const documentCategories = [
  { id: 'medical_record', name: '病案首页', icon: 'fa fa-folder' },
  { id: 'admission_record', name: '入院记录', icon: 'fa fa-folder' },
  { id: 'progress_record', name: '病程记录', icon: 'fa fa-folder' },
  { id: 'surgery_record', name: '手术记录', icon: 'fa fa-folder' },
  { id: 'discharge_record', name: '出院记录', icon: 'fa fa-folder' }
]

const documentTypes: DocumentType[] = [
  {
    value: 'medical_record',
    label: '病案首页',
    children: [
      { value: 'inpatient_record', label: '住院病案首页', icon: 'fa fa-file-text-o', templatePath: '/demo/file/inpatient_record.html' }
    ]
  },
  {
    value: 'admission_record',
    label: '入院记录',
    children: [
      { value: 'admission', label: '入院记录', icon: 'fa fa-hospital-o', templatePath: '/demo/file/admission_record.html' },
      { value: 'admission_24h', label: '24小时内入出院记录', icon: 'fa fa-clock-o', templatePath: '/demo/file/admission_24h.html' },
      { value: 'admission_24h_death', label: '24小时内死亡记录', icon: 'fa fa-file-text', templatePath: '/demo/file/admission_24h_death.html' }
    ]
  },
  {
    value: 'progress_record',
    label: '病程记录',
    children: [
      { value: 'first_progress', label: '首次病程记录', icon: 'fa fa-stethoscope', templatePath: '/demo/file/first_progress.html' },
      { value: 'daily_progress', label: '日常病程记录', icon: 'fa fa-calendar-check-o', templatePath: '/demo/file/daily_progress_record.html' },
      { value: 'attending_rounds', label: '主治医师查房记录', icon: 'fa fa-user-md', templatePath: '/demo/file/attending_physician_round_record.html' },
      { value: 'chief_rounds', label: '上级医师首次查房记录', icon: 'fa fa-users', templatePath: '/demo/file/first_ward_round_record.html' },
      { value: 'stage_summary', label: '阶段小结', icon: 'fa fa-file-text-o', templatePath: '/demo/file/daily_progress_7.html' },
      { value: 'handover', label: '交接班记录', icon: 'fa fa-exchange', templatePath: '/demo/file/daily_progress_6.html' },
      { value: 'consultation', label: '会诊记录', icon: 'fa fa-comments', templatePath: '/demo/file/daily_progress_5.html' }
    ]
  },
  {
    value: 'surgery_record',
    label: '手术记录',
    children: [
      { value: 'surgery', label: '手术记录', icon: 'fa fa-cut', templatePath: '/demo/file/surgery_record.html' },
      { value: 'preoperative', label: '术前小结', icon: 'fa fa-file-text-o', templatePath: '/demo/file/surgery_record_1.html' },
      { value: 'postoperative', label: '术后首次病程', icon: 'fa fa-file-text', templatePath: '/demo/file/postoperative_record.html' }
    ]
  },
  {
    value: 'discharge_record',
    label: '出院记录',
    children: [
      { value: 'discharge', label: '出院记录', icon: 'fa fa-sign-out', templatePath: '/demo/file/discharge_record.html' },
      { value: 'death', label: '死亡记录', icon: 'fa fa-file-text', templatePath: '/demo/file/discharge_record_1.html' },
      { value: 'death_discussion', label: '死亡病例讨论记录', icon: 'fa fa-users', templatePath: '/demo/file/discharge_record_2.html' }
    ]
  }
]

const hasSymptomInput = computed(() => {
  return aiSymptomInput.value.trim().length > 0
})

const getDocTypeHint = (docType: string): string => {
  const hints: Record<string, string> = {
    'inpatient_record': '病案首页格式',
    'admission': '入院记录格式：主诉、现病史、既往史、个人史、月经婚育史、家族史、体格检查、辅助检查、初步诊断、鉴别诊断',
    'admission_24h': '24小时入出院格式',
    'admission_24h_death': '24小时入出院死亡格式',
    'first_progress': '首次病程格式：病例特点、拟诊讨论、病历分型、诊疗计划',
    'daily_progress': '日常病程格式：病情变化、查体、辅助检查、病情评估、诊疗计划',
    'attending_rounds': '主治医师查房格式：病情评估、主治医师分析、处理意见',
    'chief_rounds': '上级医师首次查房格式：病史汇报、查体意见、诊断分析、鉴别诊断、诊疗计划',
    'stage_summary': '阶段小结格式',
    'handover': '交接班记录格式',
    'consultation': '会诊记录格式',
    'surgery': '手术记录格式：手术名称、术前诊断、术后诊断、手术经过、标本处理、术后医嘱',
    'preoperative': '术前小结格式',
    'postoperative': '术后首次病程格式',
    'discharge': '出院记录格式：入出院诊断、诊疗经过、出院医嘱',
    'death': '死亡记录格式',
    'death_discussion': '死亡讨论格式'
  }
  return hints[docType] || '通用格式'
}

const addDocMenuVisible = ref(false)
const addDocMenuStyle = ref<Record<string, string>>({})
const currentCategoryId = ref('')
const currentCategoryDocs = ref<{ value: string; label: string; icon: string; templatePath?: string }[]>([])

const currentCategory = computed(() => {
  return documentCategories.find(c => c.id === currentCategoryId.value)
})

const toggleCategory = (categoryId: string): void => {
  const index = expandedCategories.value.indexOf(categoryId)
  if (index > -1) {
    expandedCategories.value.splice(index, 1)
  } else {
    expandedCategories.value.push(categoryId)
  }
}

const getCategoryDocuments = (categoryId: string): DocumentRecord[] => {
  return documents.value
    .filter(doc => doc.category === categoryId)
    .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
}

const getCategoryDocCount = (categoryId: string): number => {
  return documents.value.filter(doc => doc.category === categoryId).length
}

const showAddDocMenu = (event: MouseEvent, categoryId: string): void => {
  const category = documentTypes.find(c => c.value === categoryId)
  if (!category) return
  
  currentCategoryId.value = categoryId
  currentCategoryDocs.value = category.children.map(child => ({
    label: child.label,
    value: child.value,
    templatePath: child.templatePath,
    icon: child.icon
  }))
  
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  addDocMenuStyle.value = {
    position: 'fixed',
    left: `${rect.right + 8}px`,
    top: `${rect.top}px`,
    minWidth: '180px'
  }
  
  addDocMenuVisible.value = true
}

const closeAddDocMenu = (): void => {
  addDocMenuVisible.value = false
  currentCategoryDocs.value = []
}

const handleSelectDocType = (item: { value: string; label: string; icon: string; templatePath?: string }): void => {
  handleAddDocument({
    category: currentCategoryId.value,
    doc: item.value,
    label: item.label,
    templatePath: item.templatePath
  })
  closeAddDocMenu()
}

const loadPatientData = async (): Promise<void> => {
  const patientId = route.params.id as string

  if (patientStore.currentPatient && patientStore.currentPatient.id === patientId) {
    patient.value = patientStore.currentPatient
  } else {
    const foundPatient = patientStore.getPatientById(patientId)
    if (foundPatient) {
      patient.value = foundPatient
      patientStore.setCurrentPatient(foundPatient)
    } else {
      patient.value = {
        id: patientId,
        bedNumber: 'A101',
        name: '张三',
        gender: '男',
        age: 45,
        inpatientId: 'ZY2024001',
        admissionDate: '2024-01-15',
        diagnosis: '社区获得性肺炎',
        allergy: '青霉素过敏',
        department: '呼吸内科',
        doctor: '李医生'
      }
      patientStore.setCurrentPatient(patient.value)
    }
  }

  try {
    const docs = await documentApi.getByPatientId(patientId)
    if (docs && docs.length > 0) {
      documents.value = docs.map((d: any) => {
        let content = d.content
        const draftHtml = loadDraftFromLocalStorage(patientId, d.id)
        if (draftHtml) {
          content = draftHtml
          console.log('[PatientEmrDetail] 文档', d.name, '有本地草稿，优先使用')
        }
        return {
          id: d.id,
          name: d.name,
          category: d.category || '',
          docType: d.docType || '',
          createTime: new Date(d.created_at || Date.now()),
          status: (d.status as 'draft' | 'signed') || 'draft',
          content
        }
      })
      console.log('[PatientEmrDetail] 从后端加载文档:', documents.value.length)
    }
  } catch (e) {
    console.warn('[PatientEmrDetail] 加载后端文档失败:', e)
  }
}

const goBack = (): void => {
  router.push('/workspace')
}

const getDocIcon = (category: string): string => {
  const iconMap: Record<string, string> = {
    'medical_record': 'fa fa-file-text-o',
    'admission_record': 'fa fa-hospital-o',
    'progress_record': 'fa fa-stethoscope',
    'surgery_record': 'fa fa-cut',
    'discharge_record': 'fa fa-sign-out',
    'other': 'fa fa-file-o'
  }
  return iconMap[category] || 'fa fa-file-o'
}

const cleanTemplateForAppend = (rawHtml: string): string => {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = rawHtml
  
  const allNodes = Array.from(tempDiv.querySelectorAll('*'))
  allNodes.forEach(node => {
    const text = node.textContent || ''
    if (text.includes('医疗机构名称') || text.includes('医院')) {
      if (node.tagName === 'P' || node.tagName === 'DIV' || node.tagName === 'H1' || node.tagName === 'H2') {
        node.remove()
      }
    }
  })
  
  const infoNodes = Array.from(tempDiv.querySelectorAll('*')).filter(el => {
    const text = el.textContent || ''
    return text.includes('床号') && text.includes('科室')
  })
  infoNodes.forEach(node => {
    const blockParent = node.closest('table') || node.closest('p') || node.closest('div')
    if (blockParent && blockParent !== tempDiv) {
      blockParent.remove()
    }
  })
  
  const headerTable = tempDiv.querySelector('table')
  if (headerTable) {
    const firstRow = headerTable.querySelector('tr')
    if (firstRow) {
      const cells = firstRow.querySelectorAll('td')
      if (cells.length > 3) {
        headerTable.remove()
      }
    }
  }
  
  return tempDiv.innerHTML
}

const getGlobalHeaderHtml = (): string => {
  return `
    <div class="emr-global-header" style="margin-bottom: 20px;">
      <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 10px;">[医疗机构名称]</h1>
      <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 15px;">
        <tr>
          <td style="width: 15%;">姓名：<span class="new-textbox" data-hm-name="姓名"><span class="new-textbox-content" contenteditable="true"></span></span></td>
          <td style="width: 15%;">性别：<span class="new-textbox" data-hm-name="性别"><span class="new-textbox-content" contenteditable="true"></span></span></td>
          <td style="width: 15%;">年龄：<span class="new-textbox" data-hm-name="年龄"><span class="new-textbox-content" contenteditable="true"></span></span></td>
          <td style="width: 25%;">科室：<span class="new-textbox" data-hm-name="科室"><span class="new-textbox-content" contenteditable="true"></span></span></td>
          <td style="width: 15%;">床号：<span class="new-textbox" data-hm-name="床号"><span class="new-textbox-content" contenteditable="true"></span></span></td>
          <td style="width: 15%;">住院号：<span class="new-textbox" data-hm-name="住院号"><span class="new-textbox-content" contenteditable="true"></span></span></td>
        </tr>
      </table>
    </div>
  `
}

const generateDocId = (): string => {
  return 'DOC' + Date.now() + Math.random().toString(36).substr(2, 9)
}

const getProgressNoteCount = (): number => {
  return documents.value.filter(doc => 
    doc.category === 'progress_record' || 
    doc.docType === 'daily_progress' || 
    doc.docType === 'first_progress' ||
    doc.docType === 'attending_rounds' ||
    doc.docType === 'chief_rounds'
  ).length
}

const handleAddDocument = async (command: { category: string; doc: string; label: string; templatePath?: string }): Promise<void> => {
  let actualDocType = command.doc
  let actualLabel = command.label
  let actualTemplatePath = command.templatePath
  
  const isProgressRecord = command.category === 'progress_record' || 
                           command.doc === 'daily_progress' || 
                           command.doc === 'first_progress' ||
                           command.doc === 'attending_rounds' ||
                           command.doc === 'chief_rounds'
  
  if (isProgressRecord) {
    const progressNoteCount = getProgressNoteCount()
    
    if (progressNoteCount === 0 && command.doc !== 'first_progress') {
      ElMessage.warning('根据病历书写规范，该患者暂无病程记录，已自动为您切换为【首次病程记录】')
      
      actualDocType = 'first_progress'
      actualLabel = '首次病程记录'
      actualTemplatePath = '/demo/file/first_progress.html'
      
      console.log('[首程强制拦截] 自动切换为首次病程记录')
    }
  }
  
  const hasExistingContent = editorRef.value && currentDoc.value
  console.log('[病程追加检查] hasExistingContent:', hasExistingContent)
  console.log('[病程追加检查] currentDoc:', currentDoc.value?.name)
  console.log('[病程追加检查] actualDocType:', actualDocType)
  console.log('[病程追加检查] editorRef:', editorRef.value ? '存在' : '不存在')
  console.log('[病程追加检查] editorReady:', editorReady.value)
  
  const isContinuousProgress = (actualDocType === 'daily_progress' || 
                                actualDocType === 'attending_rounds' ||
                                actualDocType === 'chief_rounds') && 
                               hasExistingContent
  
  console.log('[病程追加检查] isContinuousProgress:', isContinuousProgress)
  
  if (isContinuousProgress && editorRef.value) {
    try {
      if (actualTemplatePath) {
        console.log('[病程追加] 开始加载模板:', actualTemplatePath)
        const response = await fetch(actualTemplatePath)
        if (response.ok) {
          const html = await response.text()
          const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
          const rawTemplate = bodyMatch ? bodyMatch[1] : html
          
          const cleanTemplate = cleanTemplateForAppend(rawTemplate)
          console.log('[病程追加] 模板已清洗，准备追加')
          
          const success = await editorRef.value.appendRecordTemplate(cleanTemplate, actualLabel)
          
          if (success) {
            const newDoc: DocumentRecord = {
              id: generateDocId(),
              name: actualLabel,
              category: command.category,
              docType: actualDocType,
              createTime: new Date(),
              status: 'draft',
              templatePath: actualTemplatePath
            }
            documents.value.push(newDoc)
            
            console.log('[病程追加] 静默添加左侧节点，不触发编辑器重载')
            
            setTimeout(() => {
              fillPatientInfo()
              fillCurrentTime()
              console.log('[病程追加] 已触发患者信息和时间填充')
              
              const patientId = patient.value?.id
              const currentDocType = currentDoc.value?.docType
              if (patientId && currentDocType) {
                const fullHtml = editorRef.value?.getHtml()
                if (fullHtml && fullHtml.length > 5) {
                  saveDraftToLocalStorage(patientId, currentDocType, fullHtml)
                  console.log('[病程追加] 已自动保存合并后的完整病程')
                }
              }
            }, 300)
            
            ElMessage.success(`已追加「${actualLabel}」到当前病程记录`)
            console.log('[PatientEmrDetail] 追加病程记录成功:', actualLabel, 'docType:', actualDocType)
            return
          } else {
            console.warn('[病程追加] appendRecordTemplate 返回 false')
          }
        } else {
          console.warn('[病程追加] 模板加载失败:', response.status)
        }
      }
    } catch (err) {
      console.error('[PatientEmrDetail] 追加病程记录失败:', err)
    }
  }
  
  const newDoc: DocumentRecord = {
    id: generateDocId(),
    name: actualLabel,
    category: command.category,
    docType: actualDocType,
    createTime: new Date(),
    status: 'draft',
    templatePath: ''
  }
  
  documents.value.push(newDoc)
  currentDoc.value = newDoc
  
  if (editorReady.value && editorRef.value?.iframeLoaded) {
    console.log('[排版架构] 编辑器已就绪，拼装全局页眉与初始模板')
    
    try {
      const templateResponse = await fetch(actualTemplatePath || '')
      if (templateResponse.ok) {
        const html = await templateResponse.text()
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
        const templateContent = bodyMatch ? bodyMatch[1] : html
        
        const headerHtml = getGlobalHeaderHtml()
        const combinedHtml = headerHtml + templateContent
        
        editorRef.value.setData(combinedHtml)
        console.log('[排版架构] 已设置页眉+模板')
        
        setTimeout(() => {
          fillPatientInfo()
          fillCurrentTime()
        }, 300)
      }
    } catch (err) {
      console.error('[排版架构] 加载模板失败:', err)
    }
  } else {
    console.log('[排版架构] 编辑器未就绪，设置待加载模板路径')
    pendingTemplatePath.value = actualTemplatePath || null
  }
  
  ElMessage.success(`已创建「${actualLabel}」`)
  console.log('[PatientEmrDetail] 新增文书:', newDoc)
}

const selectDocument = async (doc: DocumentRecord): Promise<void> => {
  currentDoc.value = doc
  console.log('[PatientEmrDetail] 选择文书:', doc.name, 'docType:', doc.docType, 'id:', doc.id)

  if (editorReady.value && editorRef.value?.iframeLoaded) {
    console.log('[PatientEmrDetail] 编辑器已就绪，立即恢复草稿')
    const hasDraft = await restoreDraft(doc)
    if (!hasDraft) {
      console.log('[PatientEmrDetail] 无草稿，等待模板加载')
    }
  } else {
    console.log('[PatientEmrDetail] 编辑器未就绪，草稿恢复将推迟到 onReady 事件')
  }
}

const saveDocument = async (): Promise<void> => {
  if (!editorRef.value || !currentDoc.value) return

  const html = editorRef.value.getHtml()
  currentDoc.value.content = html

  console.log('[saveDocument] patient.value:', patient.value)
  console.log('[saveDocument] patient.value?.id:', patient.value?.id)
  console.log('[saveDocument] currentDoc.value.id:', currentDoc.value.id)
  console.log('[saveDocument] currentDoc.value.docType:', currentDoc.value.docType)

  const patientId = patient.value?.id || ''
  const docType = currentDoc.value.docType || ''
  const oldDocId = currentDoc.value.id
  const isNewDoc = !oldDocId || oldDocId.startsWith('DOC') || oldDocId.startsWith('temp_')

  if (patientId && docType && html && html.length > 5) {
    saveDraftToLocalStorage(patientId, docType, html)
  } else {
    console.warn('[saveDocument] 跳过保存草稿:', { patientId, docType, htmlLength: html?.length })
  }

  try {
    const docData = {
      patientId,
      name: currentDoc.value.name,
      category: currentDoc.value.category,
      docType: currentDoc.value.docType,
      content: html,
      status: currentDoc.value.status
    }
    console.log('[saveDocument] docData:', docData)

    if (!isNewDoc) {
      try {
        await documentApi.update(oldDocId, docData)
        console.log('[PatientEmrDetail] 更新文书到后端:', currentDoc.value.name)
      } catch (updateError: any) {
        if (updateError.message?.includes('不存在') || updateError.message?.includes('not exist')) {
          console.log('[PatientEmrDetail] 文档不存在，创建新文档')
          const created = await documentApi.create({ ...docData, patientId } as any)
          currentDoc.value.id = created.id
          const idx = documents.value.findIndex(d => d.name === currentDoc.value?.name)
          if (idx >= 0) documents.value[idx].id = created.id
          console.log('[PatientEmrDetail] 新建文书到后端:', created.id)
        } else {
          throw updateError
        }
      }
    } else {
      const created = await documentApi.create({ ...docData, patientId } as any)
      currentDoc.value.id = created.id
      const idx = documents.value.findIndex(d => d.name === currentDoc.value?.name)
      if (idx >= 0) documents.value[idx].id = created.id
      console.log('[PatientEmrDetail] 新建文书到后端:', created.id)
    }

    ElMessage.success('保存成功（已持久化）')
  } catch (error) {
    console.error('[PatientEmrDetail] 保存文书失败:', error)
    ElMessage.error('保存失败：' + (error instanceof Error ? error.message : '未知错误'))
  }
}

const signDocument = (): void => {
  if (!currentDoc.value) return
  
  ElMessageBox.confirm(
    '签名后将无法修改，确定要签名吗？',
    '签名确认',
    {
      confirmButtonText: '确定签名',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    currentDoc.value!.status = 'signed'
    ElMessage.success('签名成功')
  }).catch(() => {})
}

const exportDocumentPdf = (): void => {
  if (!editorRef.value) return
  editorRef.value.exportPdf()
}

const deleteCurrentDocument = async (): Promise<void> => {
  if (!currentDoc.value) return
  
  const docToDelete = currentDoc.value
  
  ElMessageBox.confirm(
    `确定要删除「${docToDelete.name}」吗？此操作不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    const patientId = patient.value?.id
    const docType = docToDelete.docType
    
    if (patientId && docType) {
      clearDraftFromLocalStorage(patientId, docType)
      console.log('[删除] 已清除本地草稿:', docType)
    }
    
    if (docToDelete.id && !docToDelete.id.startsWith('temp_') && !docToDelete.id.startsWith('DOC')) {
      try {
        await documentApi.delete(docToDelete.id)
        console.log('[删除] 已从后端删除:', docToDelete.id)
      } catch (err) {
        console.warn('[删除] 后端删除失败:', err)
      }
    }
    
    const index = documents.value.findIndex(d => d.id === docToDelete.id)
    if (index > -1) {
      documents.value.splice(index, 1)
      currentDoc.value = documents.value[0] || null
      ElMessage.success('已删除文书')
      
      if (currentDoc.value) {
        await selectDocument(currentDoc.value)
      }
    }
  }).catch(() => {})
}

const onEditorReady = async (editor: unknown): Promise<void> => {
  console.log('[PatientEmrDetail] 编辑器就绪:', editor)
  editorReady.value = true
  
  if (pendingTemplatePath.value && editorRef.value) {
    console.log('[排版架构] onEditorReady 检测到待加载模板:', pendingTemplatePath.value)
    
    try {
      const templateResponse = await fetch(pendingTemplatePath.value)
      if (templateResponse.ok) {
        const html = await templateResponse.text()
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
        const templateContent = bodyMatch ? bodyMatch[1] : html
        
        const headerHtml = getGlobalHeaderHtml()
        const combinedHtml = headerHtml + templateContent
        
        editorRef.value.setData(combinedHtml)
        console.log('[排版架构] onEditorReady 已设置页眉+模板')
        
        pendingTemplatePath.value = null
        
        setTimeout(() => {
          fillPatientInfo()
          fillCurrentTime()
        }, 300)
        return
      }
    } catch (err) {
      console.error('[排版架构] onEditorReady 加载模板失败:', err)
    }
  }
  
  if (currentDoc.value) {
    const hasDraft = await restoreDraft(currentDoc.value)
    if (hasDraft) {
      console.log('[PatientEmrDetail] 草稿已恢复，跳过默认填充')
      return
    }
  }
  
  setTimeout(() => {
    fillPatientInfo()
    fillCurrentTime()
  }, 800)
}

const fillPatientInfo = (): void => {
  if (!editorRef.value || !patient.value || !currentDoc.value) return
  
  const patientData = [
    { keyCode: 'DE02.01.039.00', keyName: '姓名', keyValue: patient.value.name },
    { keyCode: 'DE02.01.040.00', keyName: '性别', keyValue: patient.value.gender },
    { keyCode: 'DE02.01.026.00', keyName: '年龄', keyValue: String(patient.value.age) },
    { keyCode: 'DE01.00.014.00', keyName: '住院号', keyValue: patient.value.inpatientId },
    { keyCode: 'DE01.00.026.00', keyName: '床位号', keyValue: patient.value.bedNumber },
    { keyCode: 'DE08.10.026.00', keyName: '科室名称', keyValue: patient.value.department || '' },
    { keyCode: 'DE08.10.054.00', keyName: '病区名称', keyValue: patient.value.department || '' },
    { keyCode: 'DE02.01.009.00', keyName: '诊断', keyValue: patient.value.diagnosis || '' },
    { keyCode: 'DE02.10.022.00', keyName: '过敏史', keyValue: patient.value.allergy || '' },
    { keyCode: 'DE06.00.092.00', keyName: '入院时间', keyValue: patient.value.admissionDate || '' }
  ]
  
  editorRef.value.setStructuredData({
    code: currentDoc.value.id,
    data: patientData
  })
  
  console.log('[PatientEmrDetail] 已填充患者信息:', patient.value.name, '文档编号:', currentDoc.value.id)
}

const fillCurrentTime = (): void => {
  if (!editorRef.value || !currentDoc.value) return
  
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const currentTime = `${year}-${month}-${day} ${hours}:${minutes}`
  
  const timeData = [
    { keyCode: 'DE06.00.218.00', keyName: '记录时间', keyValue: currentTime },
    { keyCode: 'DE09.00.053.00', keyName: '记录日期', keyValue: `${year}-${month}-${day}` },
    { keyCode: 'DE99.00.053.00', keyName: '记录时间', keyValue: currentTime }
  ]
  
  editorRef.value.setStructuredData({
    code: currentDoc.value.id,
    data: timeData
  })
  
  console.log('[PatientEmrDetail] 已填充当前时间:', currentTime)
}

const onEditorError = (error: Error): void => {
  console.error('[PatientEmrDetail] 编辑器错误:', error)
}

const generateAiContent = async (): Promise<void> => {
  if (!hasSymptomInput.value) {
    ElMessage.warning('请输入临床描述')
    return
  }
  
  const input = aiSymptomInput.value.trim()
  const docType = currentDoc.value?.docType || ''
  
  console.log('[AI生成] 当前文书:', currentDoc.value?.name)
  console.log('[AI生成] 文书类型:', docType)
  console.log('[AI生成] 输入内容:', input)
  console.log('[AI生成] 当前患者:', patient.value)
  
  if (!docType) {
    ElMessage.warning('请先选择或创建一个文书')
    return
  }
  
  const patientInfo: PatientInfo = {
    name: patient.value?.name,
    gender: patient.value?.gender,
    age: patient.value?.age,
    admissionNumber: patient.value?.inpatientId,
    bedNumber: patient.value?.bedNumber,
    department: patient.value?.department,
    diagnosis: patient.value?.diagnosis
  }
  
  console.log('[AI生成] 传递给 LLM 的患者信息:', patientInfo)
  
  isGenerating.value = true
  
  try {
    console.log('[AI生成] 开始调用 LLM API...')
    
    const llmResult = await generateMedicalRecord(input, docType, patientInfo)
    
    console.log('[AI生成] LLM 返回结果:', llmResult)
    
    structuredAiResult.value = {}
    const textParts: string[] = []
    
    const fieldMapping: Record<string, keyof MedicalRecordResult> = {
      '主诉': '主诉',
      '现病史': '现病史',
      '既往史': '既往史',
      '个人史': '个人史',
      '家族史': '家族史',
      '体格检查': '体格检查',
      '辅助检查': '辅助检查',
      '初步诊断': '初步诊断',
      '鉴别诊断': '鉴别诊断',
      '病史特征': '病史特征',
      '诊断依据': '诊断依据',
      '病历分型': '病历分型',
      '诊疗计划': '诊疗计划',
      '病情演变': '病情演变',
      '查体所见': '查体所见',
      '病情评估': '病情评估',
      '处理意见': '处理意见',
      '病情现状及治疗反应': '病情现状及治疗反应',
      '病情分析': '病情分析',
      '病史及病情演变汇报': '病史及病情演变汇报',
      '补充阳性体征': '补充阳性体征',
      '诊断分析': '诊断分析',
      '鉴别诊断分析': '鉴别诊断分析',
      '诊疗计划及指示': '诊疗计划及指示'
    }
    
    for (const [chineseName, englishKey] of Object.entries(fieldMapping)) {
      const value = llmResult[englishKey]
      if (value) {
        structuredAiResult.value[englishKey as keyof typeof structuredAiResult.value] = value
        textParts.push(`${chineseName}：${value}`)
      }
    }
    
    aiResult.value = textParts.join('\n\n')
    
    console.log('[AI生成] 结构化结果:', structuredAiResult.value)
    console.log('[AI生成] 文本结果:', aiResult.value.substring(0, 100) + '...')
    
    ElMessage.success('AI 生成成功！')
  } catch (error) {
    console.error('[AI生成] 调用失败:', error)
    
    console.log('[AI生成] 使用本地模拟数据作为后备')
    const result = generateContentByDocType(docType, input)
    aiResult.value = result.text
    structuredAiResult.value = result.structured
    
    ElMessage.warning('AI 服务暂不可用，已使用本地模拟数据')
  } finally {
    isGenerating.value = false
  }
}

const extractChiefComplaint = (input: string): string => {
  const symptoms = ['发热', '胸痛', '胸闷', '心悸', '呼吸困难', '咳嗽', '咳痰', '咯血', '腹痛', '腹胀', '恶心', '呕吐', '腹泻', '便秘', '黄疸', '头晕', '头痛', '乏力', '水肿', '尿频', '尿急', '尿痛', '血尿', '泡沫尿', '皮疹', '关节痛', '腰痛', '意识障碍', '抽搐', '麻木', '视力下降', '听力下降', '鼻塞', '流涕', '咽痛']
  
  const timePatterns = [
    /(\d+)\s*[天日周月年小时h]+/gi,
    /(?:持续|发作|发病|出现|开始|发现)\s*(\d+\s*[天日周月年小时h]+)/gi,
    /(?:约|大概|大约)\s*(\d+\s*[天日周月年小时h]+)/gi
  ]
  
  let chiefComplaint = ''
  let foundSymptoms: string[] = []
  let foundTime = ''
  
  const lowerInput = input.toLowerCase()
  
  for (const symptom of symptoms) {
    if (lowerInput.includes(symptom.toLowerCase())) {
      foundSymptoms.push(symptom)
    }
  }
  
  for (const pattern of timePatterns) {
    const matches = input.match(pattern)
    if (matches && matches.length > 0) {
      foundTime = matches[0].replace(/[天日周月年小时h]/gi, (match) => {
        if (match.includes('天') || match.includes('日')) return '天'
        if (match.includes('周')) return '周'
        if (match.includes('月')) return '月'
        if (match.includes('年')) return '年'
        if (match.includes('小时') || match.includes('h')) return '小时'
        return match
      })
      break
    }
  }
  
  if (foundSymptoms.length > 0) {
    if (foundTime) {
      chiefComplaint = `${foundSymptoms[0]}${foundTime}`
    } else {
      const otherSymptoms = foundSymptoms.slice(1, 3)
      if (otherSymptoms.length > 0) {
        chiefComplaint = `${foundSymptoms[0]}，伴${otherSymptoms.join('、')}待查`
      } else {
        chiefComplaint = `${foundSymptoms[0]}待查`
      }
    }
  } else {
    if (foundTime) {
      chiefComplaint = `不适${foundTime}`
    } else {
      chiefComplaint = input.length > 30 ? input.substring(0, 30) + '...' : input
    }
  }
  
  return chiefComplaint
}

const generateContentByDocType = (docType: string, input: string): { text: string; structured: StructuredAiResult } => {
  console.log('[generateContentByDocType] 文书类型:', docType)
  
  const patientName = patient.value?.name || '患者'
  const patientGender = patient.value?.gender || '男'
  const patientAge = patient.value?.age || 45
  
  let text = ''
  let structured: StructuredAiResult = {}
  
  switch (docType) {
    case 'admission':
      const chiefComplaint = extractChiefComplaint(input)
      const marriageHistory = patientGender === '女' 
        ? `月经史：初潮年龄13岁，月经周期28-30天，经期5-7天，末次月经时间待补充。已婚，育有X子/女，子女体健。`
        : `已婚，育有X子/女，子女体健。`
      
      structured = {
        chiefComplaint: chiefComplaint,
        presentIllness: `${patientName}于本次入院前出现上述症状，遂来我院就诊。门诊完善相关检查后，拟收入我科进一步诊治。患者自发病以来，精神、食欲、睡眠尚可，大小便正常，体重无明显变化。`,
        pastHistory: '既往体健，否认高血压、糖尿病、冠心病病史，否认肝炎、结核等传染病史，否认手术、外伤史，否认输血史，否认药物、食物过敏史。',
        personalHistory: '生于原籍，无外地久居史，无疫区接触史，无牧区、矿山、高氟区、低碘区居住史，无化学性物质、放射性物质、工业毒物接触史，无吸毒史，无吸烟史，无饮酒史。',
        familyHistory: '父母健在，家族中无遗传性疾病史。',
        physicalExamination: `体温：36.5℃  脉搏：80次/分  呼吸：18次/分  血压：120/80mmHg
一般情况：神志清楚，精神可，步入病房，查体合作。
皮肤黏膜：全身皮肤黏膜无黄染、出血点，浅表淋巴结未触及肿大。
头颅五官：双瞳孔等大等圆，对光反射灵敏。
颈部：颈软，无抵抗。
胸部：双肺呼吸音清，未闻及干湿啰音。心率80次/分，律齐，各瓣膜听诊区未闻及病理性杂音。
腹部：腹平软，无压痛、反跳痛，肝脾肋下未触及，肠鸣音正常。
脊柱四肢：无畸形，活动自如。
神经系统：生理反射存在，病理反射未引出。
专科情况：待补充。`,
        preliminaryDiagnosis: '待明确。',
        differentialDiagnosis: '需结合相关检查进一步鉴别。'
      }
      
      text = `主诉：${structured.chiefComplaint}

现病史：${structured.presentIllness}

既往史：${structured.pastHistory}

个人史：${structured.personalHistory}

月经婚育史：${marriageHistory}

家族史：${structured.familyHistory}

体格检查
${structured.physicalExamination}

辅助检查：待完善。

初步诊断：${structured.preliminaryDiagnosis}

鉴别诊断：${structured.differentialDiagnosis}`
      break

    case 'first_progress':
      structured = {
        historyFeature: `${patientGender}，${patientAge}岁，急性起病，病程数天。`,
        presentIllness: input,
        pastHistory: '既往体健，否认相关病史，否认手术史、过敏史。',
        physicalExamination: `体温：36.5℃  脉搏：80次/分  呼吸：18次/分  血压：120/80mmHg
一般情况：神志清楚，精神可，查体合作。
专科情况：待补充。`,
        auxiliaryExam: '暂缺。',
        preliminaryDiagnosis: '待明确。',
        diagnosisBasis: '根据患者病史、体征及辅助检查，初步诊断考虑待明确。',
        differentialDiagnosis: '需结合相关检查进一步鉴别。',
        caseType: '普通病例。',
        treatmentPlan: `1. 完善相关检查（血常规、生化、影像学等）。
2. 对症支持治疗。
3. 密切观察病情变化。`
      }
      
      text = `病例特点：
1. 病史特征：${structured.historyFeature}
2. 现病史：${structured.presentIllness}
3. 既往史：${structured.pastHistory}
4. 体格检查：
体温：36.5℃  脉搏：80次/分  呼吸：18次/分  血压：120/80mmHg
一般情况：神志清楚，精神可，查体合作。
专科情况：待补充。
5. 辅助检查：${structured.auxiliaryExam}

拟诊讨论：
一、初步诊断：${structured.preliminaryDiagnosis}
二、诊断依据：
${structured.diagnosisBasis}
三、鉴别诊断：
${structured.differentialDiagnosis}

病历分型：${structured.caseType}

诊疗计划：
${structured.treatmentPlan}`
      break

    case 'daily_progress':
      structured = {
        diseaseProgress: `患者今日${input}，无发热、恶心、呕吐等不适，精神、食欲、睡眠尚可，大小便正常。`,
        physicalExamination: `体温：36.5℃  脉搏：80次/分  呼吸：18次/分  血压：120/80mmHg`,
        physicalFindings: '神志清楚，精神可。双肺呼吸音清，未闻及干湿啰音。心率齐，各瓣膜听诊区未闻及病理性杂音。腹平软，无压痛。',
        auxiliaryExam: '暂缺。',
        conditionAssessment: '患者病情稳定，继续当前治疗方案。',
        treatmentOpinion: '继续当前治疗，密切观察病情变化。'
      }
      
      text = `病情演变：${structured.diseaseProgress}

查体：
${structured.physicalExamination}
查体所见：${structured.physicalFindings}

辅助检查：${structured.auxiliaryExam}

病情评估：${structured.conditionAssessment}

处理意见：${structured.treatmentOpinion}`
      break

    case 'attending_rounds':
      structured = {
        presentIllness: `${input}，病情稳定，治疗效果良好。`,
        attendingAnalysis: '患者诊断明确，治疗方案合理，目前病情稳定，继续当前治疗。',
        treatmentOpinion: `1. 继续当前治疗方案。
2. 密切观察病情变化。
3. 必要时完善相关检查。`
      }
      
      text = `病情现状及治疗反应：${structured.presentIllness}

病情分析：${structured.attendingAnalysis}

处理意见：
${structured.treatmentOpinion}`
      break

    case 'chief_rounds':
      structured = {
        presentIllness: `${input}。`,
        diagnosisAnalysis: '患者诊断明确，需结合辅助检查进一步确认。',
        differentialAnalysis: '需排除相关疾病。',
        treatmentOpinion: `完善检查，对症治疗，密切观察病情。`
      }
      
      text = `病史及病情演变汇报：${structured.presentIllness}

补充阳性体征：待补充。

诊断分析：${structured.diagnosisAnalysis}

鉴别诊断分析：${structured.differentialAnalysis}

诊疗计划及指示：
${structured.treatmentOpinion}`
      break

    case 'surgery':
      structured = {
        preliminaryDiagnosis: input,
        treatmentPlan: `1. 一级护理
2. 禁食水
3. 抗感染、补液等对症治疗`
      }
      
      text = `手术名称：待定

手术日期：${new Date().toLocaleDateString('zh-CN')}

术前诊断：${structured.preliminaryDiagnosis}

术后诊断：待术后确定

麻醉方式：全身麻醉

手术经过：患者取合适体位，常规消毒铺巾。麻醉满意后，开始手术。手术过程顺利，出血约XX ml，未输血。术后患者安返病房。

标本处理：标本送病理检查。

术后医嘱：
${structured.treatmentPlan}`
      break

    case 'postoperative':
      structured = {
        surgeryName: input.includes('手术') ? input : '待确定手术',
        preliminaryDiagnosis: patient.value?.diagnosis || '待确定诊断'
      }
      
      text = `手术名称：${structured.surgeryName}

手术日期：${new Date().toLocaleDateString('zh-CN')}

术后诊断：${structured.preliminaryDiagnosis}

病程正文：患者今日在全麻下行${structured.surgeryName}，手术顺利，麻醉满意，术中出血约XXml，未输血。术中探查见[术中发现]。手术切除[病变组织]后，检查无活动性出血，术毕安返病房。术后患者清醒，生命体征平稳。术后医嘱：1. 一级护理 2. 禁食6小时 3. 持续吸氧 4. 心电监护 5. 抗感染、补液治疗`
      break

    case 'discharge':
      structured = {
        preliminaryDiagnosis: patient.value?.diagnosis || input,
        presentIllness: `${patientName}因"${input}"入院。入院后完善相关检查，明确诊断，给予相应治疗。经治疗后病情好转，准予出院。`,
        treatmentPlan: `1. 注意休息，避免劳累。
2. 继续口服药物治疗。
3. 门诊随诊。`
      }
      
      text = `入院日期：${patient.value?.admissionDate || new Date().toLocaleDateString('zh-CN')}

出院日期：${new Date().toLocaleDateString('zh-CN')}

入院诊断：${structured.preliminaryDiagnosis}

出院诊断：${structured.preliminaryDiagnosis}

诊疗经过：${structured.presentIllness}

出院医嘱：
${structured.treatmentPlan}`
      break

    default:
      structured = {
        presentIllness: input
      }
      
      text = `${input}

分析：根据患者临床表现，需进一步完善相关检查明确诊断。

建议：
1. 完善相关检查。
2. 对症支持治疗。
3. 密切观察病情变化。`
  }
  
  return { text, structured }
}

const debugFields = (): void => {
  if (!editorRef.value) {
    ElMessage.warning('编辑器未就绪')
    return
  }
  editorRef.value.debugAvailableFields()
}

const handleInjectPhysicalExam = (rawText: string): void => {
  if (!rawText) return
  console.log("【智能分发】全面拆分体格检查...")

  const parsedData = parsePhysicalExam(rawText)
  
  for (const [subKey, subValue] of Object.entries(parsedData)) {
    editorRef.value?.injectTextToSpecificField(subKey, subValue)
  }

  console.log('【智能分发】体格检查全面拆分完成，共注入', Object.keys(parsedData).length, '个字段')
}

const routeInject = async (title: string, text: string): Promise<boolean> => {
  if (!title || !text || !editorRef.value) return false
  
  console.log(`【路由分发】处理模块: ${title}`)
  
  if (title === '查体' || title === '生命体征') {
    console.log(`【路由分发】查体模块，执行生命体征拆分注入`)
    const vitalSignsMatch = text.match(/体温[：:\s]*([\d\.]+).*脉搏[：:\s]*(\d+).*呼吸[：:\s]*(\d+).*血压[：:\s]*(\d+)[\/|](\d+)/)
    if (vitalSignsMatch) {
      await editorRef.value!.injectTextToSpecificField('体温', vitalSignsMatch[1])
      await editorRef.value!.injectTextToSpecificField('脉搏', vitalSignsMatch[2])
      await editorRef.value!.injectTextToSpecificField('呼吸', vitalSignsMatch[3])
      await editorRef.value!.injectTextToSpecificField('收缩压', vitalSignsMatch[4])
      await editorRef.value!.injectTextToSpecificField('舒张压', vitalSignsMatch[5])
      console.log(`【路由分发】生命体征注入完成`)
      return true
    }
    return false
  }
  
  if (title === '体格检查' || title.includes('体格')) {
    console.log(`【路由分发】体格检查模块，执行拆分注入`)
    const parsedData = parsePhysicalExam(text)
    let injectedCount = 0
    for (const [subKey, subValue] of Object.entries(parsedData)) {
      const success = await editorRef.value!.injectTextToSpecificField(subKey, subValue)
      if (success) injectedCount++
    }
    console.log(`【路由分发】体格检查拆分完成，注入 ${injectedCount} 个子字段`)
    return injectedCount > 0
  }
  else if (title === '病例特点' || title === 'caseCharacteristics') {
    console.log(`【路由分发】病例特点模块，执行双重注入策略`)
    
    const mainSuccess = await editorRef.value.injectTextToSpecificField('病例特点', text)
    if (mainSuccess) {
      console.log(`【路由分发】病例特点主体已注入`)
    }
    
    console.log(`【路由分发】从病例特点中提取生命体征...`)
    const parsedData = parsePhysicalExam(text)
    let vitalSignsCount = 0
    
    const vitalSignsKeys = ['体温', '脉搏', '呼吸', '收缩压', '舒张压', '一般情况', '专科情况']
    for (const subKey of vitalSignsKeys) {
      const subValue = parsedData[subKey]
      if (subValue) {
        const success = await editorRef.value!.injectTextToSpecificField(subKey, subValue)
        if (success) {
          vitalSignsCount++
          console.log(`【路由分发】从病例特点提取「${subKey}」注入成功: ${subValue}`)
        }
      }
    }
    
    console.log(`【路由分发】病例特点双重注入完成，主体: ${mainSuccess}, 体征: ${vitalSignsCount}`)
    return mainSuccess || vitalSignsCount > 0
  }
  else if (isComplexField(title)) {
    console.log(`【通用路由】触发复合字段拆分: ${title}`)
    const parsedData = parsePhysicalExam(text)
    let injectedCount = 0
    for (const [subKey, subValue] of Object.entries(parsedData)) {
      const success = await editorRef.value!.injectTextToSpecificField(subKey, subValue)
      if (success) injectedCount++
    }
    console.log(`【通用路由】复合字段拆分完成，注入 ${injectedCount} 个子字段`)
    return injectedCount > 0
  } else {
    console.log(`【通用路由】常规单点注入: ${title}`)
    return await editorRef.value.injectTextToSpecificField(title, text)
  }
}

const injectAiContent = async (): Promise<void> => {
  if (!editorRef.value || !currentDoc.value) {
    ElMessage.warning('编辑器未就绪')
    return
  }
  
  const docType = currentDoc.value?.docType || ''
  console.log(`[PatientEmrDetail] injectAiContent 文书类型: ${docType}`)
  
  if (docType === 'first_progress') {
    await injectFirstProgressContent()
    return
  }
  
  if (docType === 'daily_progress') {
    await injectDailyProgressContent()
    return
  }
  
  if (docType === 'attending_rounds') {
    await injectAttendingRoundContent()
    return
  }
  
  if (docType === 'chief_rounds') {
    await injectChiefRoundContent()
    return
  }
  
  console.log("【一键导入】开始处理")
  console.log("【一键导入】structuredAiResult:", structuredAiResult.value)
  console.log("【一键导入】aiResult:", aiResult.value)
  
  let injectedCount = 0
  let failedCount = 0
  
  if (structuredAiResult.value && Object.keys(structuredAiResult.value).length > 0) {
    console.log("【一键导入】使用结构化数据模式")
    
    for (const [key, text] of Object.entries(structuredAiResult.value)) {
      if (!text) continue
      
      const fieldName = aiFieldLabels[key as keyof StructuredAiResult] || key
      console.log(`【一键导入】处理字段: ${fieldName}`)
      
      const success = await routeInject(fieldName, text as string)
      if (success) {
        injectedCount++
      } else {
        failedCount++
      }
    }
  } else if (aiResult.value) {
    console.log("【一键导入】使用文本解析模式")
    
    const lines = aiResult.value.split('\n')
    const fieldMapping: Record<string, string[]> = {
      '主诉': ['主诉'],
      '现病史': ['现病史'],
      '既往史': ['既往史'],
      '个人史': ['个人史'],
      '月经史': ['月经史'],
      '婚育史': ['婚育史'],
      '家族史': ['家族史'],
      '生命体征': ['生命体征'],
      '一般体查': ['一般体查'],
      '专科体查': ['专科体查'],
      '体格检查': ['体格检查'],
      '辅助检查': ['辅助检查'],
      '入院诊断': ['入院诊断'],
      '入院情况': ['入院情况'],
      '诊疗经过': ['诊疗经过'],
      '出院诊断': ['出院诊断'],
      '出院医嘱': ['出院医嘱'],
      '抢救经过': ['抢救经过'],
      '死亡原因': ['死亡原因'],
      '死亡诊断': ['死亡诊断'],
      '病情简介': ['病情简介'],
      '讨论意见': ['讨论意见'],
      '主持人总结': ['主持人总结'],
      '初步诊断': ['初步诊断'],
      '鉴别诊断': ['鉴别诊断']
    }
    
    let currentField = ''
    let currentContent = ''
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue
      
      let matchedField = ''
      for (const [fieldName, aliases] of Object.entries(fieldMapping)) {
        const patterns = [fieldName, ...aliases].map(f => `^${f}[：:]|^\\d+\\.\\s*${f}`)
        for (const pattern of patterns) {
          if (new RegExp(pattern).test(trimmedLine)) {
            matchedField = fieldName
            break
          }
        }
        if (matchedField) break
      }
      
      if (matchedField) {
        if (currentField && currentContent) {
          const success = await routeInject(currentField, currentContent.trim())
          if (success) {
            injectedCount++
          } else {
            failedCount++
          }
        }
        currentField = matchedField
        const colonIdx = trimmedLine.indexOf('：')
        if (colonIdx > -1) {
          currentContent = trimmedLine.substring(colonIdx + 1).trim()
        } else {
          currentContent = ''
        }
      } else if (currentField) {
        currentContent += (currentContent ? '\n' : '') + trimmedLine
      }
    }
    
    if (currentField && currentContent) {
      const success = await routeInject(currentField, currentContent.trim())
      if (success) {
        injectedCount++
      } else {
        failedCount++
      }
    }
  }
  
  if (injectedCount > 0) {
    ElMessage.success(`已注入 ${injectedCount} 个字段`)
  }
  
  if (failedCount > 0) {
    ElMessage.warning(`${failedCount} 个字段未找到（模板中可能不存在该字段）`)
  }
  
  if (injectedCount === 0 && failedCount === 0) {
    console.log('[PatientEmrDetail] 未识别到结构化字段，使用整体插入')
    if (aiResult.value) {
      const htmlContent = aiResult.value.split('\n').map(line =>
        line.trim() ? `<p>${line}</p>` : ''
      ).join('')
      const success = editorRef.value.insertAiContent(htmlContent)
      if (success) {
        ElMessage.success('AI 内容已注入病历')
      } else {
        ElMessage.error('注入失败，请稍后重试')
      }
    }
  }
}

const forceTestPhysicalExam = () => {
  console.log("【暴力测试】无视任何规则，直接向底层字段开火！")
  
  if (!editorRef.value) {
    console.error("编辑器实例未找到！")
    ElMessage.error("编辑器实例未找到！")
    return
  }

  editorRef.value.injectTextToSpecificField('体温', '37.2')
  editorRef.value.injectTextToSpecificField('脉搏', '88')
  editorRef.value.injectTextToSpecificField('呼吸', '19')
  editorRef.value.injectTextToSpecificField('收缩压', '125')
  editorRef.value.injectTextToSpecificField('舒张压', '85')
  editorRef.value.injectTextToSpecificField('一般情况', '硬核测试：神志清楚，精神极佳！')
  
  console.log("【暴力测试】注入完成！")
  ElMessage.success("暴力测试完成，请检查字段是否被填充")
}

const forceRouteInject = (aiItem: { key: string; label: string; content: string }) => {
  const title = aiItem.label || aiItem.key
  const text = aiItem.content
  
  console.log(`【强制路由】点击了绿按钮，模块名称: ${title}`)
  console.log(`【强制路由】文本内容前50字: ${text?.substring(0, 50)}...`)
  
  if (!text || !editorRef.value) {
    console.error("【强制路由失败】没有文本或找不到编辑器实例")
    ElMessage.error("注入失败：无内容或编辑器未就绪")
    return
  }

  if (title === '体格检查' || title.includes('体格')) {
    console.log('【通道切换】成功拦截，进入体格检查专属拆分通道')
    handleInjectPhysicalExam(text)
    ElMessage.success('体格检查已精准注入')
  } else {
    console.log('【通道切换】进入普通单字段注入通道')
    editorRef.value.injectTextToSpecificField(title, text)
    ElMessage.success(`已注入「${title}」`)
  }
}

const injectFieldToEditor = async (fieldKey: keyof StructuredAiResult): Promise<void> => {
  console.log(`[PatientEmrDetail] ========== injectFieldToEditor 开始 ==========`)
  console.log(`[PatientEmrDetail] fieldKey: ${fieldKey}`)
  console.log(`[PatientEmrDetail] fieldKey 类型: ${typeof fieldKey}`)
  
  if (!editorRef.value) {
    ElMessage.warning('编辑器未就绪')
    return
  }
  
  const content = structuredAiResult.value[fieldKey]
  console.log(`[PatientEmrDetail] content:`, content)
  
  if (!content) {
    ElMessage.warning('该字段暂无内容')
    return
  }

  const fieldName = aiFieldLabels[fieldKey]
  console.log(`[PatientEmrDetail] fieldName: ${fieldName}`)
  console.log(`[PatientEmrDetail] 尝试注入字段「${fieldName}」: ${content.substring(0, 50)}...`)

  if (fieldKey === 'physicalExamination') {
    console.log(`[PatientEmrDetail] ★★★ 检测到体格检查，调用 handleInjectPhysicalExam ★★★`)
    handleInjectPhysicalExam(content)
    ElMessage.success('体格检查已注入')
    return
  }

  console.log(`[PatientEmrDetail] 非体格检查，调用 injectTextToSpecificField`)
  let success = await editorRef.value.injectTextToSpecificField(fieldName, content)

  if (success) {
    ElMessage.success(`已注入「${fieldName}」`)
    return
  }

  const fieldAliases: Record<string, string[]> = {
    '主诉': ['主诉'],
    '现病史': ['现病史'],
    '既往史': ['既往史'],
    '个人史': ['个人史'],
    '月经史': ['月经史'],
    '婚育史': ['婚育史'],
    '家族史': ['家族史'],
    '生命体征': ['生命体征'],
    '一般体查': ['一般体查'],
    '专科体查': ['专科体查'],
    '体格检查': ['体格检查', '体检'],
    '病史特征': ['病史特征'],
    '入院诊断': ['入院诊断'],
    '入院情况': ['入院情况'],
    '诊疗经过': ['诊疗经过'],
    '出院诊断': ['出院诊断'],
    '出院医嘱': ['出院医嘱'],
    '抢救经过': ['抢救经过'],
    '死亡原因': ['死亡原因'],
    '死亡诊断': ['死亡诊断'],
    '病情简介': ['病情简介'],
    '讨论意见': ['讨论意见'],
    '主持人总结': ['主持人总结'],
    '初步诊断': ['初步诊断'],
    '鉴别诊断': ['鉴别诊断'],
    '病历分型': ['病历分型', '病历分析'],
    '诊断依据': ['诊断依据'],
    '诊疗计划': ['诊疗计划'],
    '辅助检查': ['辅助检查']
  }

  const aliases = fieldAliases[fieldName] || [fieldName]

  for (const alias of aliases) {
    if (alias === fieldName) continue
    console.log(`[PatientEmrDetail] 尝试别名「${alias}」...`)
    success = await editorRef.value.injectTextToSpecificField(alias, content)
    if (success) {
      ElMessage.success(`已注入「${fieldName}」(${alias})`)
      return
    }
  }

  console.warn(`[PatientEmrDetail] 未找到字段「${fieldName}」及其别名，尝试插入到文档末尾`)
  const fallbackSuccess = editorRef.value.insertAiContent(`<p><strong>${fieldName}：</strong>${content}</p>`)
  if (fallbackSuccess) {
    ElMessage.warning(`未找到「${fieldName}」字段，已插入到文档末尾`)
  } else {
    ElMessage.error('注入失败，请稍后重试')
  }
}

const hasStructuredContent = computed(() => {
  return Object.keys(structuredAiResult.value).length > 0
})

const getStructuredFields = computed(() => {
  const fields: Array<{ key: keyof StructuredAiResult; label: string; content: string }> = []
  
  for (const [key, label] of Object.entries(aiFieldLabels)) {
    const content = structuredAiResult.value[key as keyof StructuredAiResult]
    if (content) {
      fields.push({
        key: key as keyof StructuredAiResult,
        label,
        content
      })
    }
  }
  
  return fields
})

const injectFirstProgressContent = async (): Promise<void> => {
  if (!editorRef.value || !aiResult.value) {
    ElMessage.warning('编辑器未就绪或无内容')
    return
  }
  
  const lines = aiResult.value.split('\n')
  let currentField = ''
  let currentContent = ''
  
  const fieldMapping: Record<string, string> = {
    '病史特征': '病史特征',
    '现病史': '现病史',
    '既往史': '既往史',
    '体格检查': '体格检查',
    '辅助检查': '辅助检查',
    '初步诊断': '初步诊断',
    '诊断依据': '诊断依据',
    '鉴别诊断': '鉴别诊断',
    '病历分型': '病历分型',
    '诊疗计划': '诊疗计划'
  }
  
  const skipKeywords = ['病例特点', '拟诊讨论']
  
  const injectedFields: string[] = []
  const failedFields: string[] = []
  
  const processFieldInjection = async (fieldName: string, content: string): Promise<boolean> => {
    if (isComplexField(fieldName)) {
      console.log(`[首程注入] 检测到复合字段「${fieldName}」，进行拆分注入`)
      const parsedData = parsePhysicalExam(content)
      let injectedCount = 0
      for (const [subKey, subValue] of Object.entries(parsedData)) {
        const success = await editorRef.value!.injectTextToSpecificField(subKey, subValue)
        if (success) {
          injectedCount++
          console.log(`[首程注入] 子字段「${subKey}」注入成功`)
        }
      }
      return injectedCount > 0
    } else {
      return await editorRef.value!.injectTextToSpecificField(fieldName, content)
    }
  }
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (!trimmedLine) continue
    
    let shouldSkip = false
    for (const skipKey of skipKeywords) {
      if (trimmedLine === skipKey || trimmedLine === skipKey + '：' || trimmedLine === skipKey + ':') {
        shouldSkip = true
        break
      }
    }
    if (shouldSkip) continue
    
    let matchedField = ''
    for (const [key, fieldName] of Object.entries(fieldMapping)) {
      const patterns = [
        `^\\d+\\.\\s*${key}[：:]`,
        `^${key}[：:]`,
        `^[一二三四五六七八九十]+[、.]\\s*${key}[：:]`
      ]
      for (const pattern of patterns) {
        if (new RegExp(pattern).test(trimmedLine)) {
          matchedField = fieldName
          break
        }
      }
      if (matchedField) break
    }
    
    if (matchedField) {
      if (currentField && currentContent) {
        console.log(`[PatientEmrDetail] 注入字段「${currentField}」: ${currentContent.substring(0, 30)}...`)
        const success = await processFieldInjection(currentField, currentContent.trim())
        if (success) {
          injectedFields.push(currentField)
        } else {
          failedFields.push(currentField)
        }
      }
      
      currentField = matchedField
      const colonIndex = trimmedLine.indexOf('：')
      const colonIndex2 = trimmedLine.indexOf(':')
      const colonIdx = colonIndex > -1 ? colonIndex : colonIndex2
      if (colonIdx > -1) {
        currentContent = trimmedLine.substring(colonIdx + 1).trim()
      } else {
        currentContent = ''
      }
    } else if (currentField) {
      currentContent += (currentContent ? '\n' : '') + trimmedLine
    }
  }
  
  if (currentField && currentContent) {
    console.log(`[PatientEmrDetail] 注入字段「${currentField}」: ${currentContent.substring(0, 30)}...`)
    const success = await processFieldInjection(currentField, currentContent.trim())
    if (success) {
      injectedFields.push(currentField)
    } else {
      failedFields.push(currentField)
    }
  }
  
  if (injectedFields.length > 0) {
    ElMessage.success(`已注入 ${injectedFields.length} 个字段`)
  }
  
  if (failedFields.length > 0) {
    ElMessage.warning(`以下字段未找到: ${failedFields.join('、')}`)
  }
  
  if (injectedFields.length === 0 && failedFields.length === 0) {
    ElMessage.warning('未能识别任何字段，尝试整体注入')
    const htmlContent = aiResult.value.split('\n').map(line =>
      line.trim() ? `<p>${line}</p>` : ''
    ).join('')
    const success = editorRef.value.insertAiContent(htmlContent)
    if (success) {
      ElMessage.success('AI 内容已注入病历')
    }
  }
}

const injectDailyProgressContent = async (): Promise<void> => {
  if (!editorRef.value || !aiResult.value) {
    ElMessage.warning('编辑器未就绪或无内容')
    return
  }
  
  console.log('[日常病程注入] 开始解析AI内容')
  console.log('[日常病程注入] 原始内容:', aiResult.value)
  
  const lines = aiResult.value.split('\n')
  let currentField = ''
  let currentContent = ''
  
  const fieldMapping: Record<string, string> = {
    '病情演变': '病情演变',
    '查体所见': '查体所见',
    '辅助检查': '辅助检查',
    '病情评估': '病情评估',
    '处理意见': '处理意见'
  }
  
  const injectedFields: string[] = []
  const failedFields: string[] = []
  
  let inPhysicalExam = false
  let physicalExamContent = ''
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (!trimmedLine) continue
    
    if (trimmedLine === '查体：' || trimmedLine === '查体:') {
      inPhysicalExam = true
      physicalExamContent = ''
      continue
    }
    
    if (inPhysicalExam) {
      if (trimmedLine.startsWith('查体所见') || 
          trimmedLine.startsWith('辅助检查') || 
          trimmedLine.startsWith('病情评估') ||
          trimmedLine.startsWith('处理意见')) {
        console.log('[日常病程注入] 查体内容收集完成:', physicalExamContent)
        
        const vitalSignsMatch = physicalExamContent.match(/体温[：:\s]*([\d\.]+).*脉搏[：:\s]*(\d+).*呼吸[：:\s]*(\d+).*血压[：:\s]*(\d+)[\/|](\d+)/)
        if (vitalSignsMatch) {
          console.log('[日常病程注入] 提取生命体征:', vitalSignsMatch)
          await editorRef.value!.injectTextToSpecificField('体温', vitalSignsMatch[1])
          await editorRef.value!.injectTextToSpecificField('脉搏', vitalSignsMatch[2])
          await editorRef.value!.injectTextToSpecificField('呼吸', vitalSignsMatch[3])
          await editorRef.value!.injectTextToSpecificField('收缩压', vitalSignsMatch[4])
          await editorRef.value!.injectTextToSpecificField('舒张压', vitalSignsMatch[5])
          injectedFields.push('体温', '脉搏', '呼吸', '收缩压', '舒张压')
        }
        
        inPhysicalExam = false
      } else {
        physicalExamContent += (physicalExamContent ? ' ' : '') + trimmedLine
        continue
      }
    }
    
    let matchedField = ''
    for (const [key, fieldName] of Object.entries(fieldMapping)) {
      const patterns = [
        `^${key}[：:]`,
        `^\\d+\\.\\s*${key}[：:]`
      ]
      for (const pattern of patterns) {
        if (new RegExp(pattern).test(trimmedLine)) {
          matchedField = fieldName
          break
        }
      }
      if (matchedField) break
    }
    
    if (matchedField) {
      if (currentField && currentContent) {
        console.log(`[日常病程注入] 注入字段「${currentField}」: ${currentContent.substring(0, 30)}...`)
        const success = await editorRef.value!.injectTextToSpecificField(currentField, currentContent.trim())
        if (success) {
          injectedFields.push(currentField)
        } else {
          failedFields.push(currentField)
        }
      }
      
      currentField = matchedField
      const colonIdx = trimmedLine.indexOf('：')
      if (colonIdx > -1) {
        currentContent = trimmedLine.substring(colonIdx + 1).trim()
      } else {
        currentContent = ''
      }
    } else if (currentField) {
      currentContent += (currentContent ? '\n' : '') + trimmedLine
    }
  }
  
  if (currentField && currentContent) {
    console.log(`[日常病程注入] 注入字段「${currentField}」: ${currentContent.substring(0, 30)}...`)
    const success = await editorRef.value!.injectTextToSpecificField(currentField, currentContent.trim())
    if (success) {
      injectedFields.push(currentField)
    } else {
      failedFields.push(currentField)
    }
  }
  
  if (injectedFields.length > 0) {
    ElMessage.success(`已注入 ${injectedFields.length} 个字段`)
  }
  
  if (failedFields.length > 0) {
    ElMessage.warning(`以下字段未找到: ${failedFields.join('、')}`)
  }
}

const injectAttendingRoundContent = async (): Promise<void> => {
  if (!editorRef.value || !aiResult.value) {
    ElMessage.warning('编辑器未就绪或无内容')
    return
  }
  
  const lines = aiResult.value.split('\n')
  let currentField = ''
  let currentContent = ''
  
  const fieldMapping: Record<string, string> = {
    '病情现状及治疗反应': '病情现状及治疗反应',
    '病情分析': '病情分析',
    '处理意见': '处理意见'
  }
  
  const injectedFields: string[] = []
  const failedFields: string[] = []
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (!trimmedLine) continue
    
    let matchedField = ''
    for (const [key, fieldName] of Object.entries(fieldMapping)) {
      const patterns = [
        `^${key}[：:]`,
        `^\\d+\\.\\s*${key}[：:]`
      ]
      for (const pattern of patterns) {
        if (new RegExp(pattern).test(trimmedLine)) {
          matchedField = fieldName
          break
        }
      }
      if (matchedField) break
    }
    
    if (matchedField) {
      if (currentField && currentContent) {
        console.log(`[主治查房注入] 注入字段「${currentField}」: ${currentContent.substring(0, 30)}...`)
        const success = await editorRef.value!.injectTextToSpecificField(currentField, currentContent.trim())
        if (success) {
          injectedFields.push(currentField)
        } else {
          failedFields.push(currentField)
        }
      }
      
      currentField = matchedField
      const colonIdx = trimmedLine.indexOf('：')
      if (colonIdx > -1) {
        currentContent = trimmedLine.substring(colonIdx + 1).trim()
      } else {
        currentContent = ''
      }
    } else if (currentField) {
      currentContent += (currentContent ? '\n' : '') + trimmedLine
    }
  }
  
  if (currentField && currentContent) {
    console.log(`[主治查房注入] 注入字段「${currentField}」: ${currentContent.substring(0, 30)}...`)
    const success = await editorRef.value!.injectTextToSpecificField(currentField, currentContent.trim())
    if (success) {
      injectedFields.push(currentField)
    } else {
      failedFields.push(currentField)
    }
  }
  
  if (injectedFields.length > 0) {
    ElMessage.success(`已注入 ${injectedFields.length} 个字段`)
  }
  
  if (failedFields.length > 0) {
    ElMessage.warning(`以下字段未找到: ${failedFields.join('、')}`)
  }
}

const injectChiefRoundContent = async (): Promise<void> => {
  if (!editorRef.value || !aiResult.value) {
    ElMessage.warning('编辑器未就绪或无内容')
    return
  }
  
  const lines = aiResult.value.split('\n')
  let currentField = ''
  let currentContent = ''
  
  const fieldMapping: Record<string, string> = {
    '病史及病情演变汇报': '病史及病情演变汇报',
    '补充阳性体征': '补充阳性体征',
    '诊断分析': '诊断分析',
    '鉴别诊断分析': '鉴别诊断分析',
    '诊疗计划及指示': '诊疗计划及指示'
  }
  
  const skipKeywords = ['上级医师分析与指示']
  
  const injectedFields: string[] = []
  const failedFields: string[] = []
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (!trimmedLine) continue
    
    let shouldSkip = false
    for (const skipKey of skipKeywords) {
      if (trimmedLine === skipKey || trimmedLine === skipKey + '：' || trimmedLine === skipKey + ':') {
        shouldSkip = true
        break
      }
    }
    if (shouldSkip) continue
    
    let matchedField = ''
    for (const [key, fieldName] of Object.entries(fieldMapping)) {
      const patterns = [
        `^${key}[：:]`,
        `^\\d+\\.\\s*${key}[：:]`,
        `^[一二三四五六七八九十]+[、.]\\s*${key}[：:]`
      ]
      for (const pattern of patterns) {
        if (new RegExp(pattern).test(trimmedLine)) {
          matchedField = fieldName
          break
        }
      }
      if (matchedField) break
    }
    
    if (matchedField) {
      if (currentField && currentContent) {
        console.log(`[上级查房注入] 注入字段「${currentField}」: ${currentContent.substring(0, 30)}...`)
        const success = await editorRef.value!.injectTextToSpecificField(currentField, currentContent.trim())
        if (success) {
          injectedFields.push(currentField)
        } else {
          failedFields.push(currentField)
        }
      }
      
      currentField = matchedField
      const colonIdx = trimmedLine.indexOf('：')
      if (colonIdx > -1) {
        currentContent = trimmedLine.substring(colonIdx + 1).trim()
      } else {
        currentContent = ''
      }
    } else if (currentField) {
      currentContent += (currentContent ? '\n' : '') + trimmedLine
    }
  }
  
  if (currentField && currentContent) {
    console.log(`[上级查房注入] 注入字段「${currentField}」: ${currentContent.substring(0, 30)}...`)
    const success = await editorRef.value!.injectTextToSpecificField(currentField, currentContent.trim())
    if (success) {
      injectedFields.push(currentField)
    } else {
      failedFields.push(currentField)
    }
  }
  
  if (injectedFields.length > 0) {
    ElMessage.success(`已注入 ${injectedFields.length} 个字段`)
  }
  
  if (failedFields.length > 0) {
    ElMessage.warning(`以下字段未找到: ${failedFields.join('、')}`)
  }
}

watch(() => route.params.id, () => {
  if (route.params.id) {
    loadPatientData()
  }
})

onMounted(() => {
  loadPatientData()
  loadApiKey()
})
</script>

<style scoped>
.emr-workstation {
  display: flex;
  flex-direction: row;
  height: 100vh;
  width: 100%;
  position: relative;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.left-panel {
  width: 260px;
  min-width: 260px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
  background: white;
}

.toolbar-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-title i {
  color: #3b82f6;
  font-size: 16px;
}

.title-text {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.panel-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.document-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.tree-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tree-category {
  margin-bottom: 4px;
}

.tree-category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #e2e8f0;
  user-select: none;
}

.tree-category-header:hover {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
}

.tree-category-header > i:first-child {
  color: #64748b;
  font-size: 12px;
  width: 12px;
  transition: transform 0.2s ease;
}

.tree-category-header .fa-folder {
  color: #f59e0b;
  font-size: 14px;
}

.category-name {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.category-count {
  font-size: 12px;
  color: #94a3b8;
  font-weight: normal;
}

.category-add-btn {
  padding: 2px 6px;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.tree-category-header:hover .category-add-btn {
  opacity: 1;
}

.tree-category-children {
  padding-left: 20px;
  margin-top: 2px;
}

.tree-category-empty {
  padding: 8px 12px;
  font-size: 12px;
  color: #94a3b8;
  font-style: italic;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
  border: 1px solid transparent;
  margin: 2px 0;
}

.tree-item:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
}

.tree-item.active {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.tree-item i {
  color: #64748b;
  font-size: 13px;
}

.tree-item.active i {
  color: #3b82f6;
}

.tree-item-name {
  flex: 1;
  font-size: 13px;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-item-status {
  flex-shrink: 0;
  font-size: 11px;
}

.tree-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #94a3b8;
}

.tree-empty i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.tree-empty p {
  margin: 0;
  font-size: 14px;
}

.tree-empty-hint {
  margin-top: 8px !important;
  font-size: 12px !important;
  color: #cbd5e1;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.patient-banner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.patient-banner-back {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  color: #475569;
  user-select: none;
}

.patient-banner-back:hover {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.patient-banner-back i {
  font-size: 12px;
}

.patient-banner-divider {
  width: 1px;
  height: 24px;
  background: #e2e8f0;
  margin: 0 4px;
}

.patient-banner-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.patient-banner-label {
  font-size: 12px;
  color: #94a3b8;
}

.patient-banner-value {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.patient-banner-allergy {
  background: #fef2f2;
  padding: 4px 10px;
  border-radius: 4px;
}

.patient-banner-allergy .patient-banner-label,
.patient-banner-allergy .patient-banner-value {
  color: #dc2626;
}

.patient-banner-diagnosis {
  background: #eff6ff;
  padding: 4px 10px;
  border-radius: 4px;
}

.patient-banner-diagnosis .patient-banner-label {
  color: #3b82f6;
}

.patient-banner-diagnosis .patient-banner-value {
  color: #1e40af;
}

.main-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: white;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.current-doc-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.current-doc-name i {
  color: #3b82f6;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.editor-container {
  flex: 1;
  overflow: hidden;
}

.editor-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #94a3b8;
}

.editor-placeholder i {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.3;
}

.editor-placeholder p {
  font-size: 16px;
}

.side-panel {
  width: 340px;
  min-width: 340px;
  background: linear-gradient(135deg, #1a2535 0%, #1e2a38 100%);
  display: flex;
  border-left: 1px solid #334155;
}

.assistant-float-tab-col {
  width: 48px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  gap: 4px;
}

.assistant-float-tab-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 4px;
  cursor: pointer;
  color: #94a3b8;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.assistant-float-tab-btn:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.05);
}

.assistant-float-tab-btn.active {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  border-left-color: #3b82f6;
}

.assistant-float-tab-btn i {
  font-size: 18px;
  margin-bottom: 4px;
}

.assistant-float-tab-btn span {
  font-size: 10px;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.assistant-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.assistant-header {
  padding: 16px;
  border-bottom: 1px solid #334155;
}

.assistant-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: #e2e8f0;
}

.assistant-title i {
  color: #3b82f6;
}

.assistant-panel {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.clinical-ai-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.clinical-ai-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.clinical-ai-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.clinical-ai-section-title i {
  color: #3b82f6;
}

.clinical-search-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.doc-type-hint {
  margin-top: 4px;
}

.input-hint {
  font-size: 11px;
  color: #909399;
  text-align: right;
  margin-top: 4px;
}

.clinical-evidence-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.clinical-soap-result {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 12px;
  min-height: 120px;
}

.clinical-soap-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: #64748b;
  text-align: center;
}

.clinical-soap-placeholder i {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.clinical-soap-placeholder p {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
}

.clinical-edit-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.clinical-disclaimer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 6px;
  font-size: 11px;
  color: #fbbf24;
}

.clinical-disclaimer i {
  color: #f59e0b;
}

.clinical-ai-actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #334155;
}

.clinical-ai-actions .el-button {
  flex: 1;
}

.structured-fields-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
}

.structured-field-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 10px;
  transition: all 0.2s ease;
}

.structured-field-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(16, 185, 129, 0.3);
}

.structured-field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.structured-field-label {
  font-size: 13px;
  font-weight: 600;
  color: #10b981;
}

.inject-field-btn {
  padding: 4px 10px !important;
  font-size: 11px !important;
}

.inject-field-btn i {
  margin-right: 4px;
}

.structured-field-content {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.patient-context-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.context-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.context-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  padding-bottom: 6px;
  border-bottom: 1px solid #334155;
}

.context-section-title i {
  color: #3b82f6;
}

.context-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.context-info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.context-label {
  font-size: 11px;
  color: #64748b;
}

.context-value {
  font-size: 13px;
  color: #e2e8f0;
  font-weight: 500;
}

.context-diagnosis {
  padding: 10px 12px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px;
  font-size: 13px;
  color: #93c5fd;
  line-height: 1.6;
}

.context-allergy {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
  font-size: 13px;
  color: #fca5a5;
}

.context-allergy i {
  color: #ef4444;
}

.doc-type-dropdown {
  max-height: 400px;
  overflow-y: auto;
}

.dropdown-category {
  padding: 8px 16px 4px;
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  background: #f5f7fa;
}

.add-doc-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
}

.add-doc-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: menuFadeIn 0.15s ease;
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.add-doc-menu-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.add-doc-menu-header i {
  color: #f59e0b;
}

.add-doc-menu-list {
  padding: 4px 0;
}

.add-doc-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 13px;
  color: #334155;
}

.add-doc-menu-item:hover {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  color: #3b82f6;
}

.add-doc-menu-item i {
  color: #64748b;
  font-size: 14px;
  width: 16px;
  text-align: center;
}

.add-doc-menu-item:hover i {
  color: #3b82f6;
}

.api-config-section {
  background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%);
  border: 1px solid #fde047;
}

.api-config-section .clinical-ai-section-title {
  cursor: pointer;
  user-select: none;
}

.api-config-section .clinical-ai-section-title:hover {
  background: rgba(0, 0, 0, 0.05);
}

.api-config-section .toggle-icon {
  margin-left: auto;
  font-size: 12px;
  color: #94a3b8;
  transition: transform 0.3s ease;
}

.api-config-content {
  padding: 12px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  margin-top: 8px;
}

.api-config-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.api-config-buttons .el-button {
  flex: 1;
}

.api-status {
  margin-top: 8px;
  text-align: center;
}
</style>
