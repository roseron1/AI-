export interface HMEditorLoader {
  createEditorAsync: (options: HmEditorOptions) => Promise<HmEditorInstance>
  destroyEditor: (editorId: string) => void
  getEditorInstanceAsync: (editorId: string, timeout?: number) => Promise<HmEditorInstance>
}

export interface HmEditorStyle {
  width?: string
  height?: string
  border?: string
}

export interface HmEditorConfig {
  contentsCss?: string[]
  [key: string]: unknown
}

export interface HmEditorOptions {
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

export interface DataItem {
  keyCode: string
  keyName: string
  keyValue: string
}

export interface SetDocDataPayload {
  code: string
  data: DataItem[]
}

export interface HmEditorInstance {
  frameId: string
  insertHtml: (html: string, posTag?: string) => boolean
  insertDataAtCursor: (data: string) => void
  setDocData: (data: SetDocDataPayload) => void
  setDocContent: (content: string) => void
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

export interface HmEditorExpose {
  insertAiContent: (html: string, posTag?: string) => boolean
  insertText: (text: string) => boolean
  setStructuredData: (payload: SetDocDataPayload) => void
  getHtml: () => string
  getText: () => string
  setReadOnly: (readOnly: boolean) => void
  focusField: (selector: string) => void
  exportPdf: () => void
  getEditorInstance: () => HmEditorInstance | null
}

export interface HmEditorProps {
  editorId?: string
  readOnly?: boolean
  docId?: string
  docContent?: string
  width?: string
  height?: string
  dataUrl?: string
}

export interface HmEditorEmits {
  (e: 'ready', editor: HmEditorInstance): void
  (e: 'error', error: Error): void
  (e: 'change', content: string): void
  (e: 'destroy'): void
}

declare global {
  interface Window {
    HMEditorLoader: HMEditorLoader
  }
}
