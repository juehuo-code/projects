<template>
  <div class="ideology-admin space-y-6">
    <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <h2 class="adm-page-title">思政辩论小广场</h2>
        <p class="text-sm text-stone-500 mt-1">议题管理、专家总结与发言审核（本地模拟）。</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="adm-btn-primary text-sm px-4 py-2" @click="showIssueForm = !showIssueForm">
          {{ showIssueForm ? '收起表单' : '新增议题' }}
        </button>
      </div>
    </div>

    <div
      v-if="pageMsg"
      class="rounded-xl border px-4 py-3 text-sm"
      :class="pageMsgOk ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-800'"
    >
      {{ pageMsg }}
    </div>

    <!-- 新增/编辑议题（折叠） -->
    <div v-show="showIssueForm" class="adm-card p-5 rounded-2xl border border-red-900/10">
      <div class="text-sm font-bold text-stone-800 mb-3">{{ issueForm.id ? '编辑议题' : '发布新议题' }}</div>
      <div class="grid sm:grid-cols-2 gap-3 max-w-4xl">
        <label class="block text-xs text-stone-600 sm:col-span-2">
          标题
          <input v-model="issueForm.title" type="text" class="adm-input mt-1 w-full" />
        </label>
        <label class="block text-xs text-stone-600">
          分类
          <input v-model="issueForm.category" type="text" class="adm-input mt-1 w-full" list="debate-cats" />
          <datalist id="debate-cats">
            <option value="红色精神思辨类" />
            <option value="青年成长抉择类" />
            <option value="时代责任担当类" />
          </datalist>
        </label>
        <label class="block text-xs text-stone-600">
          周期（天）
          <input v-model.number="issueForm.durationDays" type="number" min="3" max="7" class="adm-input mt-1 w-full" />
        </label>
        <label class="block text-xs text-stone-600 sm:col-span-2">
          素材
          <select v-model="issueForm.materialId" class="adm-select mt-1 w-full py-2">
            <option v-for="m in store.MATERIALS" :key="m.id" :value="m.id">{{ m.martyr }}</option>
          </select>
        </label>
        <label class="block text-xs text-stone-600 sm:col-span-2">
          正方提示
          <textarea v-model="issueForm.positive" rows="2" class="adm-input mt-1 w-full resize-none" />
        </label>
        <label class="block text-xs text-stone-600 sm:col-span-2">
          反方提示
          <textarea v-model="issueForm.negative" rows="2" class="adm-input mt-1 w-full resize-none" />
        </label>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <button type="button" class="adm-btn-primary text-sm px-4 py-2" @click="saveIssue">保存</button>
        <button v-if="issueForm.id" type="button" class="adm-btn-danger text-sm px-4 py-2 opacity-90" @click="resetIssueForm">取消编辑</button>
      </div>
    </div>

    <!-- 统一议题列表 -->
    <div class="adm-card rounded-2xl border border-red-900/10 overflow-hidden">
      <div class="px-4 py-3 border-b border-stone-100 bg-stone-50/80">
        <span class="text-sm font-bold text-stone-800">议题管理 · 专家总结</span>
      </div>
      <div class="overflow-x-auto">
        <table class="adm-table min-w-[720px] w-full">
          <thead>
            <tr>
              <th class="text-left">议题</th>
              <th class="text-left w-28">分类</th>
              <th class="text-left w-24">状态</th>
              <th class="text-left w-44">结束时间</th>
              <th class="text-right w-52">操作</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="it in allIssues" :key="it.id">
              <tr class="hover:bg-stone-50/80 transition-colors">
                <td class="max-w-xs">
                  <div class="font-medium text-stone-900 line-clamp-2">{{ it.title }}</div>
                </td>
                <td class="text-xs text-stone-600">{{ it.category }}</td>
                <td>
                  <span
                    class="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                    :class="it.status === 'published' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-stone-100 text-stone-600 border-stone-200'"
                  >
                    {{ it.status === 'published' ? '进行中' : '已结束' }}
                  </span>
                </td>
                <td class="text-xs text-stone-500 whitespace-nowrap">{{ formatTime(it.endAt) }}</td>
                <td class="text-right">
                  <div class="flex flex-wrap justify-end gap-1">
                    <button type="button" class="text-xs px-2 py-1 rounded-lg bg-white border border-stone-200 hover:border-red-300" @click="loadIssueForEdit(it)">编辑</button>
                    <button
                      v-if="it.status === 'published'"
                      type="button"
                      class="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-900 border border-red-100 hover:bg-red-100"
                      @click="oneClickClose(it)"
                    >
                      结束
                    </button>
                    <button
                      v-else
                      type="button"
                      class="text-xs px-2 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-100 hover:bg-emerald-100"
                      @click="oneClickOpen(it)"
                    >
                      开启
                    </button>
                    <button
                      v-if="it.status === 'closed'"
                      type="button"
                      class="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-100"
                      @click="toggleExpandSummary(it.id)"
                    >
                      {{ expandedSummaryId === it.id ? '收起总结' : '专家总结' }}
                    </button>
                    <button type="button" class="text-xs px-2 py-1 rounded-lg text-red-800 border border-red-100 hover:bg-red-50" @click="removeIssue(it)">删</button>
                  </div>
                </td>
              </tr>
              <tr v-if="expandedSummaryId === it.id && it.status === 'closed'" class="bg-amber-50/30">
                <td colspan="5" class="p-4 border-t border-stone-100">
                  <div class="grid sm:grid-cols-2 gap-3 max-w-3xl">
                    <label class="block text-xs text-stone-600 sm:col-span-2">
                      专家署名
                      <input v-model="summaryForm.expertName" type="text" class="adm-input mt-1 w-full" />
                    </label>
                    <label class="block text-xs text-stone-600 sm:col-span-2">
                      总结正文
                      <textarea v-model="summaryForm.summary" rows="4" class="adm-input mt-1 w-full resize-none" />
                    </label>
                    <label class="block text-xs text-stone-600 sm:col-span-2">
                      备注
                      <textarea v-model="summaryForm.remark" rows="2" class="adm-input mt-1 w-full resize-none" />
                    </label>
                    <div class="sm:col-span-2 flex gap-2">
                      <button type="button" class="adm-btn-primary text-sm px-4 py-2" @click="saveSummaryFor(it)">保存总结</button>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <div v-if="allIssues.length === 0" class="px-4 py-10 text-center text-stone-400 text-sm">暂无议题</div>
    </div>

    <!-- 发言审核 -->
    <div class="adm-card p-5 rounded-2xl border border-red-900/10">
      <h3 class="text-sm font-bold text-stone-900 mb-3">发言审核</h3>
      <div class="flex flex-wrap gap-2 mb-4">
        <select v-model="statusFilter" class="adm-select w-36 py-2">
          <option value="all">全部状态</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已驳回</option>
        </select>
        <select v-model="issueFilter" class="adm-select w-56 py-2">
          <option value="all">全部议题</option>
          <option v-for="i in allIssues" :key="i.id" :value="i.id">{{ i.title }}</option>
        </select>
      </div>
      <div v-if="filteredSpeeches.length === 0" class="text-center py-8 text-stone-400 text-sm">暂无发言</div>
      <div v-else class="space-y-2 max-h-[480px] overflow-y-auto">
        <div
          v-for="s in filteredSpeeches"
          :key="s.id"
          class="rounded-xl border border-stone-200 bg-white p-3 text-sm hover:shadow-sm transition-shadow"
        >
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span class="adm-badge adm-badge-admin">{{ issueTitle(s.issueId) }}</span>
            <span>{{ s.side === 'positive' ? '正方' : '反方' }}</span>
            <span class="text-stone-400">{{ timeAgo(s.createdAt) }}</span>
          </div>
          <p class="mt-2 text-stone-700 line-clamp-3 whitespace-pre-wrap">{{ s.content }}</p>
          <div v-if="s.humanStatus === 'pending'" class="mt-2 flex flex-wrap items-center gap-2 justify-end">
            <label class="text-xs text-stone-500 flex items-center gap-1">
              <input type="checkbox" v-model="qualityFlag[s.id]" /> 优质
            </label>
            <button type="button" class="adm-btn-primary text-xs px-2 py-1" @click="audit(s.id, 'approve')">通过</button>
            <button type="button" class="adm-btn-danger text-xs px-2 py-1" @click="audit(s.id, 'reject')">驳回</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useIdeologyStore } from '../../stores/ideology'

const store = useIdeologyStore()
const pageMsg = ref('')
const pageMsgOk = ref(true)
let msgTimer = 0
function flashMsg(text, ok = true) {
  pageMsg.value = text
  pageMsgOk.value = ok
  clearTimeout(msgTimer)
  msgTimer = setTimeout(() => {
    pageMsg.value = ''
  }, 4200)
}

const showIssueForm = ref(false)
const expandedSummaryId = ref('')

const allIssues = computed(() => {
  const list = store.listActiveIssues ? store.listActiveIssues() : [...store.issues]
  return list.slice().sort((a, b) => (b.startAt || 0) - (a.startAt || 0))
})

const issueForm = reactive({
  id: '',
  title: '',
  category: '青年成长抉择类',
  materialId: store.MATERIALS[0]?.id || 'm1',
  positive: '',
  negative: '',
  durationDays: 5,
})

const summaryForm = reactive({
  expertName: '',
  summary: '',
  remark: '',
})

function resetIssueForm() {
  issueForm.id = ''
  issueForm.title = ''
  issueForm.category = '青年成长抉择类'
  issueForm.materialId = store.MATERIALS[0]?.id || 'm1'
  issueForm.positive = ''
  issueForm.negative = ''
  issueForm.durationDays = 5
}

function loadIssueForEdit(it) {
  showIssueForm.value = true
  issueForm.id = it.id
  issueForm.title = it.title
  issueForm.category = it.category
  issueForm.materialId = it.materialId || 'm1'
  issueForm.positive = it.sides?.positive || ''
  issueForm.negative = it.sides?.negative || ''
  issueForm.durationDays = it.durationDays || 5
}

async function saveIssue() {
  try {
    if (issueForm.id) {
      await store.adminUpdateIssue({
        issueId: issueForm.id,
        category: issueForm.category,
        title: issueForm.title,
        materialId: issueForm.materialId,
        positive: issueForm.positive,
        negative: issueForm.negative,
        durationDays: issueForm.durationDays,
      })
      flashMsg('已保存')
    } else {
      await store.adminCreateIssue({
        category: issueForm.category,
        title: issueForm.title,
        materialId: issueForm.materialId,
        positive: issueForm.positive,
        negative: issueForm.negative,
        durationDays: issueForm.durationDays,
      })
      flashMsg('议题已发布')
      resetIssueForm()
    }
  } catch (e) {
    flashMsg(e?.message || '失败', false)
  }
}

async function oneClickClose(it) {
  if (!confirm('确定结束该议题？')) return
  try {
    await store.adminSetIssueStatus({ issueId: it.id, status: 'closed' })
    flashMsg('已结束')
  } catch (e) {
    flashMsg(e?.message || '失败', false)
  }
}

async function oneClickOpen(it) {
  if (!confirm('确定重新开启？')) return
  try {
    await store.adminSetIssueStatus({ issueId: it.id, status: 'published' })
    flashMsg('已开启')
  } catch (e) {
    flashMsg(e?.message || '失败', false)
  }
}

async function removeIssue(it) {
  if (!confirm(`删除「${it.title}」？`)) return
  try {
    await store.adminDeleteIssue({ issueId: it.id })
    if (issueForm.id === it.id) resetIssueForm()
    if (expandedSummaryId.value === it.id) expandedSummaryId.value = ''
    flashMsg('已删除')
  } catch (e) {
    flashMsg(e?.message || '失败', false)
  }
}

function toggleExpandSummary(id) {
  if (expandedSummaryId.value === id) {
    expandedSummaryId.value = ''
    return
  }
  const it = allIssues.value.find(x => x.id === id)
  if (!it) return
  expandedSummaryId.value = id
  summaryForm.expertName = it.teacher?.expertName || '专家顾问（人工）'
  summaryForm.summary = it.teacher?.summary || ''
  summaryForm.remark = it.teacher?.remark || ''
}

async function saveSummaryFor(it) {
  try {
    await store.adminUpdateTeacher({
      issueId: it.id,
      expertName: summaryForm.expertName,
      teacherSummary: summaryForm.summary,
      remark: summaryForm.remark,
    })
    flashMsg('总结已保存')
  } catch (e) {
    flashMsg(e?.message || '失败', false)
  }
}

function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('zh-CN', { hour12: false })
}

const statusFilter = ref('all')
const issueFilter = ref('all')
const qualityFlag = reactive({})

const filteredSpeeches = computed(() => {
  let list = store.speeches || []
  if (issueFilter.value !== 'all') list = list.filter(s => String(s.issueId) === String(issueFilter.value))
  if (statusFilter.value !== 'all') list = list.filter(s => s.humanStatus === statusFilter.value)
  return list.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
})

function issueTitle(issueId) {
  const i = store.issues.find(x => String(x.id) === String(issueId))
  return i?.title || '—'
}

function timeAgo(ts) {
  if (!ts) return ''
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 60) return `${m}分钟前`
  return `${Math.floor(m / 60)}小时前`
}

async function audit(speechId, action) {
  try {
    await store.adminAuditSpeech({
      speechId,
      action,
      setQuality: action === 'approve' && qualityFlag[speechId],
    })
    flashMsg('已处理')
  } catch (e) {
    flashMsg(e?.message || '失败', false)
  }
}

watch(allIssues, () => {
  if (expandedSummaryId.value && !allIssues.value.some(x => x.id === expandedSummaryId.value)) expandedSummaryId.value = ''
})
</script>
