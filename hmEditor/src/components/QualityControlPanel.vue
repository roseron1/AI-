<template>
  <aside class="qc-panel" :class="{ collapsed: isCollapsed, loading: isLoading }">
    <header class="qc-panel-header">
      <div class="qc-panel-title" @click="toggleCollapse">
        <i class="fa fa-shield"></i>
        <span>质控结果</span>
        <span v-if="result" class="qc-score" :class="scoreClass">{{ result.score }}</span>
      </div>
      <button class="qc-collapse-btn" @click="toggleCollapse">
        <i :class="isCollapsed ? 'fa fa-chevron-left' : 'fa fa-chevron-right'"></i>
      </button>
    </header>

    <div v-if="!isCollapsed" class="qc-panel-content">
      <div v-if="isLoading" class="qc-loading">
        <i class="fa fa-spinner fa-spin"></i>
        <span>AI 质控中...</span>
      </div>

      <div v-else-if="error" class="qc-error">
        <i class="fa fa-exclamation-circle"></i>
        <span>{{ error }}</span>
        <button class="qc-retry-btn" @click="$emit('retry')">
          <i class="fa fa-refresh"></i>
          重试
        </button>
      </div>

      <div v-else-if="result" class="qc-result">
        <div class="qc-summary">
          <div class="qc-score-circle" :class="scoreClass">
            <span class="score-value">{{ result.score }}</span>
            <span class="score-label">分</span>
          </div>
          <p class="qc-summary-text">{{ result.summary }}</p>
        </div>

        <div v-if="result.problems.length > 0" class="qc-section">
          <div class="qc-section-title">
            <i class="fa fa-exclamation-triangle"></i>
            <span>发现问题 ({{ result.problems.length }})</span>
          </div>
          <div class="qc-problems">
            <div
              v-for="(problem, index) in result.problems"
              :key="index"
              class="qc-problem-card"
              :class="problem.severity"
              @click="onProblemClick(problem)"
            >
              <div class="problem-header">
                <span class="problem-type">{{ typeLabels[problem.type] }}</span>
                <span class="problem-severity" :class="problem.severity">
                  {{ severityLabels[problem.severity] }}
                </span>
              </div>
              <div class="problem-field" v-if="problem.field">
                <i class="fa fa-tag"></i>
                {{ problem.field }}
              </div>
              <p class="problem-description">{{ problem.description }}</p>
              <button class="problem-fix-btn" @click.stop="onFixClick(problem)">
                <i class="fa fa-lightbulb-o"></i>
                查看建议
              </button>
            </div>
          </div>
        </div>

        <div v-if="result.suggestions.length > 0" class="qc-section">
          <div class="qc-section-title">
            <i class="fa fa-lightbulb-o"></i>
            <span>改进建议 ({{ result.suggestions.length }})</span>
          </div>
          <div class="qc-suggestions">
            <div
              v-for="(suggestion, index) in result.suggestions"
              :key="index"
              class="qc-suggestion-card"
              @click="onSuggestionClick(suggestion)"
            >
              <div class="suggestion-field" v-if="suggestion.field">
                <i class="fa fa-tag"></i>
                {{ suggestion.field }}
              </div>
              <p class="suggestion-text">{{ suggestion.suggestion }}</p>
              <button class="suggestion-apply-btn" @click.stop="onApplyClick(suggestion)">
                <i class="fa fa-check"></i>
                应用到病历
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="qc-empty">
        <i class="fa fa-shield"></i>
        <p>点击工具栏"提交质控"按钮<br/>对当前病历进行质量检查</p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

export interface AuditProblem {
  type: 'consistency' | 'quality' | 'standard' | 'completeness'
  severity: 'high' | 'medium' | 'low'
  field?: string
  description: string
}

export interface AuditSuggestion {
  field?: string
  suggestion: string
}

export interface AuditResult {
  score: number
  problems: AuditProblem[]
  suggestions: AuditSuggestion[]
  summary: string
}

const props = defineProps<{
  result: AuditResult | null
  isLoading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  (e: 'retry'): void
  (e: 'applySuggestion', suggestion: AuditSuggestion): void
  (e: 'highlightField', fieldName: string): void
}>()

const isCollapsed = ref(false)

const typeLabels: Record<string, string> = {
  consistency: '一致性',
  quality: '内涵质量',
  standard: '规范性',
  completeness: '完整性'
}

const severityLabels: Record<string, string> = {
  high: '严重',
  medium: '中等',
  low: '轻微'
}

const scoreClass = computed(() => {
  if (!props.result) return ''
  const score = props.result.score
  if (score >= 90) return 'excellent'
  if (score >= 80) return 'good'
  if (score >= 70) return 'acceptable'
  return 'poor'
})

const toggleCollapse = (): void => {
  isCollapsed.value = !isCollapsed.value
}

const onProblemClick = (problem: AuditProblem): void => {
  if (problem.field) {
    emit('highlightField', problem.field)
  }
}

const onFixClick = (problem: AuditProblem): void => {
  if (problem.field) {
    emit('highlightField', problem.field)
  }
}

const onSuggestionClick = (suggestion: AuditSuggestion): void => {
  if (suggestion.field) {
    emit('highlightField', suggestion.field)
  }
}

const onApplyClick = (suggestion: AuditSuggestion): void => {
  emit('applySuggestion', suggestion)
}
</script>

<style scoped>
.qc-panel {
  width: 320px;
  background: white;
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
}

.qc-panel.collapsed {
  width: 48px;
}

.qc-panel-header {
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.qc-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
}

.qc-panel.collapsed .qc-panel-title {
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.qc-score {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.qc-collapse-btn {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
}

.qc-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.qc-loading,
.qc-error,
.qc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
  color: #64748b;
}

.qc-loading i,
.qc-error i {
  font-size: 32px;
  margin-bottom: 12px;
  color: #667eea;
}

.qc-error i {
  color: #ef4444;
}

.qc-retry-btn {
  margin-top: 12px;
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.qc-empty i {
  font-size: 48px;
  color: #cbd5e1;
  margin-bottom: 12px;
}

.qc-empty p {
  font-size: 13px;
  line-height: 1.5;
}

.qc-result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.qc-summary {
  text-align: center;
  padding: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
}

.qc-score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  border: 4px solid;
}

.qc-score-circle.excellent {
  border-color: #10b981;
  background: #ecfdf5;
  color: #059669;
}

.qc-score-circle.good {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #2563eb;
}

.qc-score-circle.acceptable {
  border-color: #f59e0b;
  background: #fffbeb;
  color: #d97706;
}

.qc-score-circle.poor {
  border-color: #ef4444;
  background: #fef2f2;
  color: #dc2626;
}

.score-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.score-label {
  font-size: 12px;
}

.qc-summary-text {
  font-size: 13px;
  color: #475569;
  margin: 0;
  line-height: 1.5;
}

.qc-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.qc-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.qc-section-title i {
  color: #667eea;
}

.qc-problems,
.qc-suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.qc-problem-card,
.qc-suggestion-card {
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.qc-problem-card:hover,
.qc-suggestion-card:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
}

.qc-problem-card.high {
  border-left: 3px solid #ef4444;
}

.qc-problem-card.medium {
  border-left: 3px solid #f59e0b;
}

.qc-problem-card.low {
  border-left: 3px solid #3b82f6;
}

.problem-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.problem-type {
  font-size: 12px;
  font-weight: 600;
  color: #2563eb;
}

.problem-severity {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.problem-severity.high {
  background: #fef2f2;
  color: #dc2626;
}

.problem-severity.medium {
  background: #fffbeb;
  color: #d97706;
}

.problem-severity.low {
  background: #eff6ff;
  color: #2563eb;
}

.problem-field,
.suggestion-field {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #64748b;
  margin-bottom: 4px;
}

.problem-description,
.suggestion-text {
  font-size: 13px;
  color: #334155;
  margin: 0;
  line-height: 1.5;
}

.problem-fix-btn,
.suggestion-apply-btn {
  margin-top: 8px;
  padding: 4px 10px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 11px;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.problem-fix-btn:hover,
.suggestion-apply-btn:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
}
</style>
