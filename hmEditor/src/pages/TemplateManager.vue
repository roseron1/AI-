<template>
  <div class="template-manager">
    <div class="template-header">
      <h2>病历模板管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="createNewTemplate">
          <i class="fa fa-plus"></i>
          新建模板
        </el-button>
        <el-button @click="goBack">
          <i class="fa fa-arrow-left"></i>
          返回
        </el-button>
      </div>
    </div>

    <div class="template-content">
      <div class="template-sidebar">
        <div class="sidebar-header">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索模板..."
            prefix-icon="Search"
            clearable
          />
        </div>
        
        <div class="template-categories">
          <div
            v-for="category in templateCategories"
            :key="category.id"
            class="category-item"
            :class="{ active: selectedCategory === category.id }"
            @click="selectCategory(category.id)"
          >
            <i :class="category.icon"></i>
            <span>{{ category.name }}</span>
            <el-badge :value="getCategoryCount(category.id)" type="primary" />
          </div>
        </div>

        <div class="template-list">
          <div
            v-for="template in filteredTemplates"
            :key="template.id"
            class="template-item"
            :class="{ active: selectedTemplate?.id === template.id }"
            @click="selectTemplate(template)"
          >
            <div class="template-info">
              <i :class="template.icon || 'fa fa-file-o'"></i>
              <div class="template-details">
                <span class="template-name">{{ template.name }}</span>
                <span class="template-meta">{{ template.updateTime }}</span>
              </div>
            </div>
            <div class="template-actions">
              <el-button size="small" text @click.stop="editTemplate(template)">
                <i class="fa fa-edit"></i>
              </el-button>
              <el-button size="small" text type="danger" @click.stop="deleteTemplate(template)">
                <i class="fa fa-trash"></i>
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <div class="template-editor">
        <div v-if="!selectedTemplate" class="empty-state">
          <i class="fa fa-file-text-o"></i>
          <p>请从左侧选择一个模板进行编辑</p>
        </div>

        <template v-else>
          <div class="editor-toolbar">
            <div class="toolbar-left">
              <span class="template-title">
                <i :class="selectedTemplate.icon || 'fa fa-file-o'"></i>
                {{ selectedTemplate.name }}
              </span>
              <el-tag v-if="hasChanges" type="warning" size="small">已修改</el-tag>
            </div>
            <div class="toolbar-right">
              <el-button type="primary" @click="saveTemplate" :disabled="!hasChanges">
                <i class="fa fa-save"></i>
                保存
              </el-button>
              <el-button @click="resetTemplate" :disabled="!hasChanges">
                <i class="fa fa-undo"></i>
                重置
              </el-button>
              <el-button @click="previewTemplate">
                <i class="fa fa-eye"></i>
                预览
              </el-button>
            </div>
          </div>

          <div class="editor-container">
            <HmEditor
              v-if="editorKey"
              :key="editorKey"
              ref="editorRef"
              :editor-id="'template-editor-' + selectedTemplate.id"
              :doc-id="selectedTemplate.id"
              :data-url="selectedTemplate.path"
              width="100%"
              height="100%"
              @ready="onEditorReady"
              @error="onEditorError"
            />
          </div>
        </template>
      </div>
    </div>

    <el-dialog
      v-model="showCreateDialog"
      title="新建模板"
      width="500px"
    >
      <el-form :model="newTemplateForm" label-width="80px">
        <el-form-item label="模板名称">
          <el-input v-model="newTemplateForm.name" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="模板分类">
          <el-select v-model="newTemplateForm.category" placeholder="请选择分类">
            <el-option
              v-for="cat in templateCategories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="基础模板">
          <el-select v-model="newTemplateForm.baseTemplate" placeholder="选择基础模板（可选）" clearable>
            <el-option
              v-for="t in templates"
              :key="t.id"
              :label="t.name"
              :value="t.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmCreateTemplate">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import HmEditor from '../components/HmEditor.vue'

interface Template {
  id: string
  name: string
  category: string
  path: string
  icon: string
  createTime: string
  updateTime: string
}

interface Category {
  id: string
  name: string
  icon: string
}

const router = useRouter()

const searchKeyword = ref('')
const selectedCategory = ref('all')
const selectedTemplate = ref<Template | null>(null)
const hasChanges = ref(false)
const editorKey = ref('')
const editorRef = ref<InstanceType<typeof HmEditor> | null>(null)
const originalContent = ref('')

const showCreateDialog = ref(false)
const newTemplateForm = ref({
  name: '',
  category: 'progress',
  baseTemplate: ''
})

const templateCategories = ref<Category[]>([
  { id: 'all', name: '全部模板', icon: 'fa fa-folder' },
  { id: 'admission', name: '入院记录', icon: 'fa fa-hospital-o' },
  { id: 'progress', name: '病程记录', icon: 'fa fa-file-text' },
  { id: 'surgery', name: '手术记录', icon: 'fa fa-cut' },
  { id: 'discharge', name: '出院记录', icon: 'fa fa-sign-out' },
  { id: 'other', name: '其他文书', icon: 'fa fa-file-o' }
])

const templates = ref<Template[]>([
  { id: 'admission_record', name: '入院记录', category: 'admission', path: 'demo/file/admission_record.html', icon: 'fa fa-hospital-o', createTime: '2024-01-01', updateTime: '2024-03-15' },
  { id: 'first_progress', name: '首次病程记录', category: 'progress', path: 'demo/file/first_progress.html', icon: 'fa fa-file-text', createTime: '2024-01-01', updateTime: '2024-03-10' },
  { id: 'daily_progress_record', name: '日常病程记录', category: 'progress', path: 'demo/file/daily_progress_record.html', icon: 'fa fa-file-text', createTime: '2024-01-01', updateTime: '2024-03-29' },
  { id: 'first_ward_round_record', name: '上级医师首次查房记录', category: 'progress', path: 'demo/file/first_ward_round_record.html', icon: 'fa fa-user-md', createTime: '2024-01-01', updateTime: '2024-03-29' },
  { id: 'attending_physician_round_record', name: '主治医师查房记录', category: 'progress', path: 'demo/file/attending_physician_round_record.html', icon: 'fa fa-user-md', createTime: '2024-01-01', updateTime: '2024-03-29' },
  { id: 'surgery_record', name: '手术记录', category: 'surgery', path: 'demo/file/surgery_record.html', icon: 'fa fa-cut', createTime: '2024-01-01', updateTime: '2024-02-20' },
  { id: 'discharge_record', name: '出院记录', category: 'discharge', path: 'demo/file/discharge_record.html', icon: 'fa fa-sign-out', createTime: '2024-01-01', updateTime: '2024-03-01' },
  { id: 'inpatient_record', name: '住院病案首页', category: 'other', path: 'demo/file/inpatient_record.html', icon: 'fa fa-folder-open', createTime: '2024-01-01', updateTime: '2024-02-15' },
  { id: 'admission_24h', name: '24小时内入出院记录', category: 'admission', path: 'demo/file/admission_24h.html', icon: 'fa fa-hospital-o', createTime: '2024-01-01', updateTime: '2024-02-10' },
  { id: 'nursing_form_1', name: '护理表单', category: 'other', path: 'demo/file/nursing_form_1.html', icon: 'fa fa-heartbeat', createTime: '2024-01-01', updateTime: '2024-02-05' }
])

const filteredTemplates = computed(() => {
  let result = templates.value
  
  if (selectedCategory.value !== 'all') {
    result = result.filter(t => t.category === selectedCategory.value)
  }
  
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(t => t.name.toLowerCase().includes(keyword))
  }
  
  return result
})

const getCategoryCount = (categoryId: string): number => {
  if (categoryId === 'all') return templates.value.length
  return templates.value.filter(t => t.category === categoryId).length
}

const selectCategory = (categoryId: string) => {
  selectedCategory.value = categoryId
}

const selectTemplate = (template: Template) => {
  if (hasChanges.value) {
    ElMessageBox.confirm('当前模板已修改，是否放弃修改？', '提示', {
      confirmButtonText: '放弃',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      loadTemplate(template)
    }).catch(() => {})
  } else {
    loadTemplate(template)
  }
}

const loadTemplate = (template: Template) => {
  selectedTemplate.value = template
  hasChanges.value = false
  editorKey.value = ''
  nextTick(() => {
    editorKey.value = 'editor-' + template.id + '-' + Date.now()
  })
}

const editTemplate = (template: Template) => {
  selectTemplate(template)
}

const deleteTemplate = (template: Template) => {
  ElMessageBox.confirm(`确定要删除模板「${template.name}」吗？`, '删除确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    const index = templates.value.findIndex(t => t.id === template.id)
    if (index > -1) {
      templates.value.splice(index, 1)
      if (selectedTemplate.value?.id === template.id) {
        selectedTemplate.value = null
        editorKey.value = ''
      }
      ElMessage.success('模板已删除')
    }
  }).catch(() => {})
}

const createNewTemplate = () => {
  newTemplateForm.value = {
    name: '',
    category: 'progress',
    baseTemplate: ''
  }
  showCreateDialog.value = true
}

const confirmCreateTemplate = () => {
  if (!newTemplateForm.value.name) {
    ElMessage.warning('请输入模板名称')
    return
  }
  
  const newTemplate: Template = {
    id: 'template_' + Date.now(),
    name: newTemplateForm.value.name,
    category: newTemplateForm.value.category,
    path: 'demo/file/' + newTemplateForm.value.name.replace(/\s+/g, '_') + '.html',
    icon: 'fa fa-file-o',
    createTime: new Date().toISOString().split('T')[0],
    updateTime: new Date().toISOString().split('T')[0]
  }
  
  templates.value.push(newTemplate)
  showCreateDialog.value = false
  ElMessage.success('模板创建成功')
  
  loadTemplate(newTemplate)
}

const onEditorReady = () => {
  console.log('[TemplateManager] 编辑器就绪')
  if (editorRef.value) {
    originalContent.value = editorRef.value.getHtml()
  }
}

const onEditorError = (error: Error) => {
  console.error('[TemplateManager] 编辑器错误:', error)
  ElMessage.error('编辑器加载失败')
}

const saveTemplate = async () => {
  if (!editorRef.value || !selectedTemplate.value) return
  
  const html = editorRef.value.getHtml()
  
  try {
    const response = await fetch('/api/template/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedTemplate.value.id,
        path: selectedTemplate.value.path,
        content: html
      })
    })
    
    if (response.ok) {
      originalContent.value = html
      hasChanges.value = false
      selectedTemplate.value.updateTime = new Date().toISOString().split('T')[0]
      ElMessage.success('模板保存成功')
    } else {
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = selectedTemplate.value.path.split('/').pop() || 'template.html'
      a.click()
      URL.revokeObjectURL(url)
      
      hasChanges.value = false
      ElMessage.success('模板已下载，请手动替换服务器文件')
    }
  } catch (error) {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = selectedTemplate.value.path.split('/').pop() || 'template.html'
    a.click()
    URL.revokeObjectURL(url)
    
    hasChanges.value = false
    ElMessage.info('模板已下载到本地')
  }
}

const resetTemplate = () => {
  if (!originalContent.value) return
  
  ElMessageBox.confirm('确定要重置模板内容吗？', '重置确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    editorKey.value = ''
    nextTick(() => {
      editorKey.value = 'editor-' + selectedTemplate.value?.id + '-' + Date.now()
      hasChanges.value = false
    })
  }).catch(() => {})
}

const previewTemplate = () => {
  if (!editorRef.value) return
  
  const html = editorRef.value.getHtml()
  const previewWindow = window.open('', '_blank')
  if (previewWindow) {
    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${selectedTemplate.value?.name || '模板预览'}</title>
          <style>
            body { font-family: SimSun, serif; padding: 20px; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #000; padding: 5px; }
          </style>
        </head>
        ${html}
      </html>
    `)
    previewWindow.document.close()
  }
}

const goBack = () => {
  if (hasChanges.value) {
    ElMessageBox.confirm('当前模板已修改，是否放弃修改？', '提示', {
      confirmButtonText: '放弃',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      router.back()
    }).catch(() => {})
  } else {
    router.back()
  }
}

onMounted(() => {
  console.log('[TemplateManager] 模板管理页面已加载')
})
</script>

<style scoped>
.template-manager {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f7fa;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.template-header h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.template-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.template-sidebar {
  width: 280px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.template-categories {
  padding: 8px 0;
  border-bottom: 1px solid #e4e7ed;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-item:hover {
  background: #f5f7fa;
}

.category-item.active {
  background: #ecf5ff;
  color: #409eff;
}

.category-item i {
  width: 20px;
  text-align: center;
}

.category-item span {
  flex: 1;
}

.template-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.template-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.template-item:hover {
  background: #f5f7fa;
}

.template-item.active {
  background: #ecf5ff;
  border: 1px solid #b3d8ff;
}

.template-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.template-info > i {
  color: #909399;
  font-size: 16px;
}

.template-details {
  display: flex;
  flex-direction: column;
}

.template-name {
  font-size: 14px;
  color: #303133;
}

.template-meta {
  font-size: 12px;
  color: #909399;
}

.template-actions {
  display: none;
  gap: 4px;
}

.template-item:hover .template-actions {
  display: flex;
}

.template-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #909399;
}

.empty-state i {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state p {
  font-size: 16px;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
  background: #fafafa;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.template-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.template-title i {
  margin-right: 8px;
  color: #409eff;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.editor-container {
  flex: 1;
  overflow: hidden;
}
</style>
