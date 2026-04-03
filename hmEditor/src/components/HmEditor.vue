<template>
  <div class="hm-editor-wrapper">
    <div ref="editorContainer" class="hm-editor-container"></div>
    <div v-if="loading" class="hm-editor-loading">
      <div class="loading-spinner">
        <i class="fa fa-spinner fa-spin"></i>
        <span>编辑器加载中...</span>
      </div>
    </div>
    <div v-if="error" class="hm-editor-error">
      <i class="fa fa-exclamation-triangle"></i>
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

declare global {
  interface Window {
    HMEditorLoader: HMEditorLoaderType
  }
}

interface HMEditorLoaderType {
  createEditorAsync: (options: HmEditorOptions) => Promise<HmEditorInstance>
  destroyEditor: (editorId: string) => void
  getEditorInstanceAsync: (editorId: string, timeout?: number) => Promise<HmEditorInstance>
}

interface HmEditorStyle {
  width?: string
  height?: string
  border?: string
}

interface HmEditorConfig {
  contentsCss?: string[]
  [key: string]: unknown
}

interface HmEditorOptions {
  container: string | HTMLElement
  id: string
  style?: HmEditorStyle
  readOnly?: boolean
  editorConfig?: HmEditorConfig
  editShowPaddingTopBottom?: boolean
  docId?: string
  docContent?: string
  dataUrl?: string
  [key: string]: unknown
}

interface DataItem {
  keyCode: string
  keyName: string
  keyValue: string
}

interface SetDocContentPayload {
  code: string
  docTplName: string
  docContent: string
  data?: DataItem[]
}

interface SetDocDataPayload {
  code: string
  data: DataItem[]
}

interface HmEditorInstance {
  frameId: string
  insertHtml: (html: string, posTag?: string) => boolean
  insertDataAtCursor: (data: string) => void
  setDocData: (data: SetDocDataPayload | SetDocDataPayload[]) => void
  setDocContent: (content: SetDocContentPayload | SetDocContentPayload[]) => void
  getData: () => unknown
  getHtml: () => string
  getText: () => string
  setDocReadOnly: (readOnly: boolean) => void
  setDocReviseMode: (revise: boolean) => void
  focusElement: (selector: string) => void
  exportPdf: () => void
  setTableRowReadonly: (tableId: string, rowIndex: number, readOnly: boolean) => void
  destroy: () => void
  [key: string]: unknown
}

interface Props {
  editorId?: string
  readOnly?: boolean
  docId?: string
  docContent?: string
  width?: string
  height?: string
  dataUrl?: string
}

interface Emits {
  (e: 'ready', editor: HmEditorInstance): void
  (e: 'error', error: Error): void
  (e: 'change', content: string): void
  (e: 'destroy'): void
}

const props = withDefaults(defineProps<Props>(), {
  editorId: 'hm-editor-' + Date.now(),
  readOnly: false,
  docId: '',
  docContent: '',
  width: '100%',
  height: '100%',
  dataUrl: ''
})

const emit = defineEmits<Emits>()

const editorContainer = ref<HTMLDivElement | null>(null)
const editorInstance = ref<HmEditorInstance | null>(null)
const loading = ref(true)
const error = ref('')
const iframeLoaded = ref(false)

const initEditor = async (): Promise<void> => {
  if (!editorContainer.value) {
    error.value = '编辑器容器未找到'
    loading.value = false
    return
  }

  if (!window.HMEditorLoader) {
    error.value = 'HMEditorLoader 未加载，请确保已引入编辑器 SDK'
    loading.value = false
    emit('error', new Error('HMEditorLoader not found'))
    return
  }

  try {
    loading.value = true
    error.value = ''

    const options: HmEditorOptions = {
      container: editorContainer.value,
      id: props.editorId,
      style: {
        width: props.width,
        height: props.height,
        border: 'none'
      },
      readOnly: props.readOnly,
      editorConfig: {
        contentsCss: []
      },
      editShowPaddingTopBottom: true
    }

    if (props.docId) {
      options.docId = props.docId
    }

    if (props.docContent) {
      options.docContent = props.docContent
    }

    const editor = await window.HMEditorLoader.createEditorAsync(options)
    
    editorInstance.value = editor
    console.log('[HmEditor] 编辑器初始化成功:', editor.frameId)

    if (props.dataUrl) {
      try {
        console.log('[HmEditor] 加载模板:', props.dataUrl)
        const response = await fetch(props.dataUrl)
        if (!response.ok) {
          throw new Error(`加载模板失败: ${response.status}`)
        }
        const html = await response.text()
        
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
        const docContent = bodyMatch ? bodyMatch[0] : html
        
        if (typeof editor.setDocContent === 'function') {
          editor.setDocContent({
            code: props.docId || 'template',
            docTplName: '模板',
            docContent: docContent
          })
          console.log('[HmEditor] 模板内容已加载')
        }
      } catch (templateErr) {
        console.error('[HmEditor] 加载模板失败:', templateErr)
      }
    }
    
    setTimeout(() => {
      iframeLoaded.value = true
      console.log('[HmEditor] iframeLoaded 设置为 true')
      applyA4PaperStyle()
    }, 500)
    
    loading.value = false
    
    setTimeout(() => {
      emit('ready', editor)
    }, 300)

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '编辑器初始化失败'
    error.value = errorMessage
    loading.value = false
    console.error('[HmEditor] 初始化失败:', err)
    emit('error', err instanceof Error ? err : new Error(errorMessage))
  }
}

const destroyEditor = (): void => {
  if (editorInstance.value && window.HMEditorLoader) {
    try {
      const editorId = editorInstance.value.frameId
      
      if (typeof editorInstance.value.destroy === 'function') {
        editorInstance.value.destroy()
      }
      
      window.HMEditorLoader.destroyEditor(editorId)
      
      console.log('[HmEditor] 编辑器已销毁:', editorId)
      emit('destroy')
    } catch (err) {
      console.error('[HmEditor] 销毁编辑器时出错:', err)
    } finally {
      editorInstance.value = null
    }
  }
}

const insertAiContent = (htmlString: string, posTag?: string): boolean => {
  if (!editorInstance.value) {
    console.warn('[HmEditor] 编辑器实例不存在，无法插入内容')
    return false
  }

  try {
    if (typeof editorInstance.value.insertHtml === 'function') {
      const result = editorInstance.value.insertHtml(htmlString, posTag)
      console.log('[HmEditor] AI 内容已插入:', htmlString.substring(0, 50) + '...')
      return result
    } else if (typeof editorInstance.value.insertDataAtCursor === 'function') {
      editorInstance.value.insertDataAtCursor(htmlString)
      console.log('[HmEditor] AI 内容已插入（insertDataAtCursor）')
      return true
    } else {
      console.warn('[HmEditor] 编辑器不支持 insertHtml 或 insertDataAtCursor 方法')
      return false
    }
  } catch (err) {
    console.error('[HmEditor] 插入内容失败:', err)
    return false
  }
}

const insertText = (text: string): boolean => {
  if (!editorInstance.value) {
    console.warn('[HmEditor] 编辑器实例不存在')
    return false
  }

  try {
    if (typeof editorInstance.value.insertDataAtCursor === 'function') {
      editorInstance.value.insertDataAtCursor(text)
      return true
    }
    return false
  } catch (err) {
    console.error('[HmEditor] 插入文本失败:', err)
    return false
  }
}

const setStructuredData = (payload: SetDocDataPayload): void => {
  if (!editorInstance.value) {
    console.warn('[HmEditor] 编辑器实例不存在')
    return
  }

  try {
    if (typeof editorInstance.value.setDocData === 'function') {
      editorInstance.value.setDocData(payload)
      console.log('[HmEditor] 结构化数据已设置:', payload.code)
    }
  } catch (err) {
    console.error('[HmEditor] 设置结构化数据失败:', err)
  }
}

const getHtml = (): string => {
  let html = ''
  
  try {
    if (editorInstance.value) {
      if (typeof editorInstance.value.getHtml === 'function') {
        html = editorInstance.value.getHtml()
      }
      if (!html && typeof editorInstance.value.getData === 'function') {
        const data = editorInstance.value.getData()
        html = typeof data === 'string' ? data : ''
      }
    }
    
    if (!html || html.trim() === '') {
      const rootDoc = getEditorDocument()
      if (rootDoc && rootDoc.body) {
        html = rootDoc.body.innerHTML
        console.log('[getHtml] 官方 API 返回空，启用暴力 DOM 提取，长度:', html?.length)
      }
    }
    
    console.log('[getHtml] 最终 HTML 长度:', html?.length || 0)
    return html
  } catch (err) {
    console.error('[HmEditor] 获取 HTML 失败:', err)
    
    const rootDoc = getEditorDocument()
    if (rootDoc && rootDoc.body) {
      html = rootDoc.body.innerHTML
      console.log('[getHtml] 异常兜底 DOM 提取，长度:', html?.length)
    }
    return html
  }
}

const setData = (html: string): boolean => {
  if (!html) {
    console.warn('[HmEditor] 内容为空，跳过设置')
    return false
  }

  let isSuccess = false

  try {
    if (editorInstance.value) {
      if (typeof editorInstance.value.setData === 'function') {
        editorInstance.value.setData(html)
        console.log('[HmEditor] setData 调用成功，内容长度:', html?.length)
        isSuccess = true
      }
      if (!isSuccess && typeof editorInstance.value.setHtml === 'function') {
        editorInstance.value.setHtml(html)
        console.log('[HmEditor] setHtml 调用成功，内容长度:', html?.length)
        isSuccess = true
      }
    }

    if (!isSuccess) {
      const rootDoc = getEditorDocument()
      if (rootDoc && rootDoc.body) {
        rootDoc.body.innerHTML = html
        console.log('[HmEditor] 官方 API 失效，启用暴力 DOM 写入成功！长度:', html?.length)
        rootDoc.body.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
        isSuccess = true
      }
    }

    return isSuccess
  } catch (err) {
    console.error('[HmEditor] 设置内容失败:', err)
    
    const rootDoc = getEditorDocument()
    if (rootDoc && rootDoc.body) {
      rootDoc.body.innerHTML = html
      console.log('[HmEditor] 异常兜底 DOM 写入成功！长度:', html?.length)
      rootDoc.body.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
      return true
    }
    return false
  }
}

const getText = (): string => {
  if (!editorInstance.value) return ''

  try {
    if (typeof editorInstance.value.getText === 'function') {
      return editorInstance.value.getText()
    }
  } catch (err) {
    console.error('[HmEditor] 获取文本失败:', err)
  }
  return ''
}

const setDocContent = (payload: { code: string; docTplName?: string; docContent: string }): void => {
  if (!editorInstance.value) {
    console.warn('[HmEditor] 编辑器实例不存在')
    return
  }

  try {
    if (typeof editorInstance.value.setDocContent === 'function') {
      const safePayload = {
        code: payload.code,
        docTplName: payload.docTplName || payload.code,
        docContent: payload.docContent
      }
      editorInstance.value.setDocContent(safePayload)
      console.log('[HmEditor] setDocContent 调用成功:', payload.code)
    } else {
      console.warn('[HmEditor] 编辑器不支持 setDocContent 方法')
    }
  } catch (err) {
    console.error('[HmEditor] 设置文档内容失败:', err)
  }
}

const setReadOnly = (readOnly: boolean): void => {
  if (!editorInstance.value) return
  
  try {
    if (typeof editorInstance.value.setDocReadOnly === 'function') {
      editorInstance.value.setDocReadOnly(readOnly)
    }
  } catch (err) {
    console.error('[HmEditor] 设置只读模式失败:', err)
  }
}

const focusField = (selector: string): void => {
  if (!editorInstance.value) return
  
  try {
    if (typeof editorInstance.value.focusElement === 'function') {
      editorInstance.value.focusElement(selector)
    }
  } catch (err) {
    console.error('[HmEditor] 聚焦元素失败:', err)
  }
}

const exportPdf = (): void => {
  if (!editorInstance.value) return
  
  try {
    if (typeof editorInstance.value.exportPdf === 'function') {
      editorInstance.value.exportPdf()
    }
  } catch (err) {
    console.error('[HmEditor] 导出 PDF 失败:', err)
  }
}

const getEditorInstance = (): HmEditorInstance | null => {
  return editorInstance.value
}

const appendEditorHtml = (htmlContent: string): boolean => {
  if (!htmlContent) {
    console.warn('[HmEditor] 追加内容为空')
    return false
  }

  try {
    const rootDoc = getEditorDocument()
    const win = rootDoc?.defaultView || (rootDoc as any)?.parentWindow
    let isSuccess = false

    const finalHtml = htmlContent

    if (win && win.CKEDITOR && Object.keys(win.CKEDITOR.instances).length > 0) {
      const editorId = Object.keys(win.CKEDITOR.instances)[0]
      const instance = win.CKEDITOR.instances[editorId]
      if (instance && typeof instance.insertHtml === 'function') {
        const range = instance.createRange()
        range.moveToElementEditEnd(instance.document.getBody())
        instance.getSelection().selectRanges([range])
        instance.insertHtml(finalHtml)
        isSuccess = true
        console.log('[appendEditorHtml] 使用官方 API 追加成功')
      }
    }

    if (!isSuccess && rootDoc && rootDoc.body) {
      rootDoc.body.insertAdjacentHTML('beforeend', finalHtml)
      console.log('[appendEditorHtml] 官方 API 失效，启用暴力 DOM 追加成功！')
      rootDoc.body.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
      isSuccess = true
    }

    setTimeout(() => {
      if (win) {
        win.scrollTo({ top: rootDoc.body.scrollHeight, behavior: 'smooth' })
      }
    }, 150)

    return isSuccess
  } catch (error) {
    console.error('[appendEditorHtml] 数据追加异常:', error)
    
    const rootDoc = getEditorDocument()
    if (rootDoc && rootDoc.body) {
      rootDoc.body.insertAdjacentHTML('beforeend', htmlContent)
      console.log('[appendEditorHtml] 异常兜底 DOM 追加成功！')
      rootDoc.body.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
      return true
    }
    return false
  }
}

const appendRecordTemplate = async (templateHtml: string, recordTitle?: string): Promise<boolean> => {
  console.log('[HmEditor] appendRecordTemplate 被调用, recordTitle:', recordTitle)
  
  let retryCount = 0
  const maxRetries = 20
  
  while (!iframeLoaded.value && retryCount < maxRetries) {
    await new Promise(resolve => setTimeout(resolve, 200))
    retryCount++
  }
  
  return appendEditorHtml(templateHtml)
}

const scrollToBottom = (): void => {
  try {
    const wrapper = document.querySelector('.hm-editor-wrapper')
    if (wrapper) {
      wrapper.scrollTo({
        top: wrapper.scrollHeight,
        behavior: 'smooth'
      })
    }
    
    const container = document.querySelector('.hm-editor-container')
    if (container) {
      const iframes = container.querySelectorAll('iframe')
      if (iframes.length > 0) {
        const lastIframe = iframes[iframes.length - 1] as HTMLIFrameElement
        if (lastIframe && lastIframe.contentDocument) {
          const iframeBody = lastIframe.contentDocument.body
          if (iframeBody) {
            iframeBody.scrollTop = iframeBody.scrollHeight
          }
        }
      }
    }
  } catch (err) {
    console.error('[HmEditor] 滚动到末尾失败:', err)
  }
}

const getEditorDocument = (): Document | null => {
  const container = editorContainer.value
  if (!container) {
    console.warn('[getEditorDocument] 编辑器容器不存在')
    return null
  }

  console.log('[getEditorDocument] 开始获取编辑器文档')

  const outerIframe = container.querySelector('iframe') as HTMLIFrameElement
  if (!outerIframe) {
    console.warn('[getEditorDocument] 未找到外层 iframe')
    return document
  }

  const outerWindow = outerIframe.contentWindow as any
  const outerDoc = outerIframe.contentDocument

  if (outerWindow && outerWindow.CKEDITOR && outerWindow.CKEDITOR.instances) {
    const instances = outerWindow.CKEDITOR.instances
    const keys = Object.keys(instances)
    if (keys.length > 0) {
      const editorId = keys[0]
      const editorDoc = instances[editorId]?.document
      if (editorDoc && editorDoc.$) {
        console.log('[getEditorDocument] 方案成功: CKEDITOR.instances.' + editorId)
        return editorDoc.$
      }
    }
  }

  const innerIframe = outerDoc?.querySelector('iframe.cke_wysiwyg_frame') as HTMLIFrameElement
  if (innerIframe && innerIframe.contentDocument) {
    console.log('[getEditorDocument] 方案2成功: .cke_wysiwyg_frame.contentDocument')
    return innerIframe.contentDocument
  }

  console.warn('[getEditorDocument] 所有方案均失败')
  return outerDoc || document
}

const applyA4PaperStyle = (): void => {
  const rootDoc = getEditorDocument()
  if (!rootDoc || !rootDoc.head) {
    console.warn('【A4排版】未找到编辑器真实DOM，样式注入失败')
    return
  }

  if (rootDoc.getElementById('hm-a4-style')) {
    console.log('【A4排版】样式已注入，跳过')
    return
  }

  console.log('【A4排版】成功穿透，正在注入物理纸张样式...')
  const style = rootDoc.createElement('style')
  style.id = 'hm-a4-style'
  style.innerHTML = `
    html {
      background-color: #e2e8f0 !important;
      padding: 20px 0 !important;
      height: 100% !important;
    }
    body {
      width: 794px !important;
      min-height: 1123px !important;
      margin: 0 auto !important;
      background-color: #ffffff !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      padding: 40px !important;
      box-sizing: border-box !important;
      overflow-y: visible !important;
      border: 1px solid #d1d5db !important;
    }
    .cke_show_borders {
      border: none !important;
    }
  `

  rootDoc.head.appendChild(style)
}

const injectTextToSpecificField = async (fieldName: string, textToInject: string): Promise<boolean> => {
  try {
    console.log(`[HmEditor] 开始注入字段: ${fieldName}`)

    const rootDoc = getEditorDocument()
    if (!rootDoc) {
      console.warn(`[注入失败] 无法获取编辑器文档`)
      return false
    }

    console.log(`[HmEditor] rootDoc.body.innerHTML.length: ${rootDoc.body?.innerHTML?.length}`)

    const selector = `span[data-hm-name="${fieldName}"] .new-textbox-content`
    const targetNode = rootDoc.querySelector(selector) as HTMLElement

    if (!targetNode) {
      console.warn(`[注入失败] 找不到字段: ${fieldName}`)
      console.log('【硬核排查】真实DOM前500个字符:', rootDoc.body?.innerHTML?.substring(0, 500))
      return false
    }

    console.log(`[注入成功] 字段: ${fieldName}，内容: ${textToInject.substring(0, 30)}...`)

    targetNode.innerText = textToInject
    targetNode.setAttribute('_placeholdertext', 'false')
    targetNode.style.color = '#000000'
    targetNode.classList.remove('hm-placeholder')

    targetNode.focus()
    targetNode.dispatchEvent(new Event('compositionstart', { bubbles: true }))
    targetNode.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
    targetNode.dispatchEvent(new Event('compositionend', { bubbles: true }))
    targetNode.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }))
    targetNode.blur()

    try {
      const outerIframe = document.querySelector('iframe')
      const outerWindow = outerIframe ? outerIframe.contentWindow : window

      if (outerWindow && (outerWindow as any).CKEDITOR && Object.keys((outerWindow as any).CKEDITOR.instances).length > 0) {
        const editorId = Object.keys((outerWindow as any).CKEDITOR.instances)[0]
        const instance = (outerWindow as any).CKEDITOR.instances[editorId]

        instance.fire('change')
        instance.fire('saveSnapshot')
        instance.updateElement()
      }
    } catch (e) {
      console.warn("【注入】尝试触发编辑器同步机制失败", e)
    }

    targetNode.style.transition = 'background-color 0.3s'
    targetNode.style.backgroundColor = '#d1fae5'
    setTimeout(() => {
      targetNode.style.backgroundColor = ''
    }, 2000)

    console.log(`[注入成功] 字段: ${fieldName}，硬核注入完成`)
    return true
  } catch (err) {
    console.error(`[注入失败] 字段: ${fieldName}`, err)
    return false
  }
}

const debugAvailableFields = () => {
  const rootDoc = getEditorDocument()
  if (!rootDoc) {
    console.warn(`[调试] 无法获取编辑器文档`)
    return
  }

  console.log('[调试] rootDoc.body.innerHTML.length:', rootDoc.body?.innerHTML?.length)
  console.log('【硬核排查】真实DOM前500个字符:', rootDoc.body?.innerHTML?.substring(0, 500))

  const fields = rootDoc.querySelectorAll('span[data-hm-name]')
  const fieldsArray: string[] = []

  fields.forEach((f) => {
    const name = f.getAttribute('data-hm-name')
    if (name) {
      fieldsArray.push(name)
    }
  })

  console.log('当前编辑器支持注入的字段有:', fieldsArray)
  alert(`当前编辑器支持注入的字段有:\n${fieldsArray.join('\n')}`)
}

watch(() => props.readOnly, (newVal) => {
  setReadOnly(newVal)
})

watch(() => props.docContent, (newVal) => {
  if (editorInstance.value && newVal && typeof editorInstance.value.setDocContent === 'function') {
    editorInstance.value.setDocContent({
      code: props.docId || 'template',
      docTplName: '模板',
      docContent: newVal
    })
  }
})

onMounted(() => {
  initEditor()
  
  let attempts = 0
  const checkAndApplyStyle = setInterval(() => {
    const doc = getEditorDocument()
    if (doc && doc.body && doc.body.innerHTML.length > 0) {
      applyA4PaperStyle()
      clearInterval(checkAndApplyStyle)
    }
    if (++attempts > 10) clearInterval(checkAndApplyStyle)
  }, 500)
})

onBeforeUnmount(() => {
  destroyEditor()
})

defineExpose({
  insertAiContent,
  insertText,
  setStructuredData,
  getHtml,
  getText,
  setData,
  setReadOnly,
  focusField,
  exportPdf,
  getEditorInstance,
  appendRecordTemplate,
  appendEditorHtml,
  injectTextToSpecificField,
  debugAvailableFields,
  setDocContent,
  iframeLoaded
})
</script>

<style scoped>
.hm-editor-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #e2e8f0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hm-editor-container {
  width: 794px;
  min-height: 1123px;
  background-color: #ffffff;
  margin: 20px auto;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
              0 2px 4px -1px rgba(0, 0, 0, 0.06),
              0 10px 15px -3px rgba(0, 0, 0, 0.1),
              0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border-radius: 2px;
  position: relative;
}

.hm-editor-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  z-index: 1000;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #64748b;
}

.loading-spinner i {
  font-size: 32px;
  color: #3b82f6;
}

.loading-spinner span {
  font-size: 14px;
  font-weight: 500;
}

.hm-editor-error {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  color: #dc2626;
  z-index: 1000;
}

.hm-editor-error i {
  font-size: 48px;
}

.hm-editor-error span {
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  padding: 0 20px;
}

@media print {
  .hm-editor-wrapper {
    background-color: transparent;
    overflow: visible;
  }
  
  .hm-editor-container {
    box-shadow: none;
    margin: 0;
    width: 100%;
  }
}
</style>
