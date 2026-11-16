<template>
  <div class="relief-admin space-y-6">
    <div>
      <h2 class="adm-page-title">红色精神解忧站 · 后台</h2>
      <p class="text-sm text-stone-500 mt-1">困惑处理与专家解读一体；列表仅保留核心列。</p>
    </div>

    <div
      v-if="pageMsg"
      class="rounded-xl border px-4 py-3 text-sm"
      :class="pageMsgOk ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-800'"
    >
      {{ pageMsg }}
    </div>

    <!-- 统一列表 -->
    <div class="adm-card rounded-2xl border border-red-900/10 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="adm-table min-w-[640px] w-full">
          <thead>
            <tr>
              <th class="text-left">用户困惑</th>
              <th class="text-left w-28">状态</th>
              <th class="text-right w-40">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in reliefsSorted"
              :key="r.id"
              class="cursor-pointer hover:bg-stone-50/90 transition-colors"
              :class="selectedId === r.id ? 'bg-red-50/40' : ''"
              @click="selectRow(r)"
            >
              <td class="max-w-md">
                <div class="text-sm text-stone-800 line-clamp-2 whitespace-pre-wrap">{{ r.content }}</div>
                <div class="text-[11px] text-stone-400 mt-1">{{ r.type }} · {{ formatTime(r.createdAt) }}</div>
              </td>
              <td>
                <span class="text-xs font-semibold" :class="statusClass(r.humanStatus)">{{ statusLabel(r.humanStatus) }}</span>
              </td>
              <td class="text-right text-xs">
                <button type="button" class="text-red-900 underline-offset-2 hover:underline" @click.stop="selectRow(r)">处理</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="reliefsSorted.length === 0" class="py-12 text-center text-stone-400 text-sm">暂无数据</div>
    </div>

    <!-- 选中项：解读编辑（富文本=多段换行长文） -->
    <div v-if="selected" class="adm-card p-5 rounded-2xl border border-red-900/10 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-sm font-bold text-stone-900">处理条目</span>
        <span class="text-xs text-stone-500">{{ selected.type }} · {{ statusLabel(selected.humanStatus) }}</span>
      </div>
      <div class="text-sm text-stone-700 whitespace-pre-wrap rounded-xl bg-stone-50 border border-stone-100 p-3 max-h-32 overflow-y-auto">
        {{ selected.content }}
      </div>

      <template v-if="selected.humanStatus === 'pending'">
        <div class="grid sm:grid-cols-2 gap-3">
          <label class="block text-xs text-stone-600">
            红色精神
            <input v-model="decodeEditor.redSpirit" type="text" class="adm-input mt-1 w-full" />
          </label>
          <label class="block text-xs text-stone-600">
            先辈人物
            <input v-model="decodeEditor.martyr" type="text" class="adm-input mt-1 w-full" />
          </label>
          <label class="block text-xs text-stone-600 sm:col-span-2">
            精神品质（逗号分隔）
            <input v-model="decodeEditor.qualitiesStr" type="text" class="adm-input mt-1 w-full" />
          </label>
          <label class="block text-xs text-stone-600 sm:col-span-2">
            核心金句（前台卡片右侧主文案）
            <input v-model="decodeEditor.coreQuote" type="text" class="adm-input mt-1 w-full" placeholder="一句话点睛" />
          </label>
          <label class="block text-xs text-stone-600 sm:col-span-2">
            专家解读正文（支持多段，换行保留）
            <textarea v-model="decodeEditor.fullInterpretation" rows="10" class="adm-input mt-1 w-full resize-y font-mono text-sm leading-relaxed" placeholder="可分段撰写完整解读…" />
          </label>
          <label class="block text-xs text-stone-600 sm:col-span-2">
            落地建议（每行一条）
            <textarea v-model="decodeEditor.actionAdviceStr" rows="4" class="adm-input mt-1 w-full resize-y" />
          </label>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="adm-btn-primary text-sm px-4 py-2" @click="publishDecode">发布解读</button>
          <button type="button" class="adm-btn-danger text-sm px-4 py-2" @click="openReject">驳回</button>
        </div>
      </template>

      <template v-else-if="selected.humanStatus === 'published' && selected.decode">
        <p class="text-xs text-stone-500">已发布。如需改版请在前台数据层扩展「再编辑」能力（当前为只读）。</p>
        <div class="text-sm text-stone-600 space-y-1">
          <p><strong>金句：</strong>{{ selected.decode.coreQuote || '—' }}</p>
          <p class="whitespace-pre-wrap"><strong>正文：</strong>{{ selected.decode.fullInterpretation || '—' }}</p>
        </div>
      </template>

      <template v-else>
        <p class="text-sm text-stone-500">该条目已结束流程，无需解读。</p>
      </template>
    </div>

    <!-- 辅助：优质感悟（折叠） -->
    <details class="adm-card p-4 rounded-2xl border border-stone-200">
      <summary class="cursor-pointer text-sm font-bold text-stone-800">优质感悟标记</summary>
      <div class="mt-4 space-y-2 max-h-64 overflow-y-auto">
        <div v-for="rf in reliefReflectionsList.slice(0, 40)" :key="rf.id" class="flex justify-between gap-2 text-xs border-b border-stone-100 pb-2">
          <span class="line-clamp-2 text-stone-700">{{ rf.text }}</span>
          <button type="button" :disabled="rf.quality" class="shrink-0 adm-btn-primary px-2 py-1 text-[10px]" @click="markQuality(rf.id)">优质</button>
        </div>
      </div>
    </details>

    <!-- 辅助：评论（折叠） -->
    <details class="adm-card p-4 rounded-2xl border border-stone-200">
      <summary class="cursor-pointer text-sm font-bold text-stone-800">评论置顶 / 删除</summary>
      <div class="mt-4 space-y-2">
        <select v-model="commentReliefFilter" class="adm-select w-full max-w-xs py-2 mb-2">
          <option value="__all__">全部评论</option>
          <option v-for="r in store.reliefs" :key="r.id" :value="r.id">{{ r.type }} · {{ formatTime(r.createdAt) }}</option>
        </select>
        <div v-for="c in commentsFiltered.slice(0, 50)" :key="c.id" class="flex flex-wrap justify-between gap-2 text-xs border rounded-lg p-2 bg-stone-50">
          <span class="line-clamp-2">{{ c.content }}</span>
          <span class="flex gap-1 shrink-0">
            <button
              v-if="c.parentId == null || c.parentId === ''"
              type="button"
              class="adm-btn-primary px-2 py-0.5 text-[10px]"
              @click="toggleTop(c)"
            >
              {{ c.pinned ? '取消置顶' : '置顶' }}
            </button>
            <button type="button" class="adm-btn-danger px-2 py-0.5 text-[10px]" @click="deleteComment(c)">删</button>
          </span>
        </div>
      </div>
    </details>
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
  }, 4000)
}

const selectedId = ref('')
const selected = computed(() => store.reliefs.find(r => String(r.id) === String(selectedId.value)) || null)

const reliefsSorted = computed(() => store.reliefs.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)))

const decodeEditor = reactive({
  redSpirit: '',
  martyr: '',
  qualitiesStr: '',
  actionAdviceStr: '',
  coreQuote: '',
  fullInterpretation: '',
})

const RELIEF_FALLBACK = {
  学业: { spirit: '自律与坚韧', martyr: '张思德', action: ['把任务拆小', '用复盘减少焦虑'], qualitiesStr: '自律,坚韧,自省' },
  就业: { spirit: '脚踏实地与担当', martyr: '黄继光', action: ['先问是否对人民有益', '长期能力建设'], qualitiesStr: '担当,务实,坚持' },
  人际: { spirit: '同理与边界', martyr: '向警予', action: ['先理解再表达', '尊重中坚持原则'], qualitiesStr: '同理,边界,理性' },
  奋斗倦怠: { spirit: '把热情转为节律', martyr: '刘胡兰', action: ['写下为什么', '每周小目标'], qualitiesStr: '信念,节律,行动' },
  理想: { spirit: '信念的延续', martyr: '瞿秋白', action: ['用行动校准理想', '挫折中回到价值'], qualitiesStr: '信念,校准,自省' },
  社会认知偏差: { spirit: '理性思辨', martyr: '方志敏', action: ['核验信息来源', '用证据表达'], qualitiesStr: '理性,证据,担当' },
}

function selectRow(r) {
  selectedId.value = r.id
  if (r.humanStatus === 'pending') loadDecodeDefaults(r)
}

function loadDecodeDefaults(relief) {
  const tpl = RELIEF_FALLBACK[relief.type] || RELIEF_FALLBACK.学业
  decodeEditor.redSpirit = tpl.spirit
  decodeEditor.martyr = tpl.martyr
  decodeEditor.qualitiesStr = tpl.qualitiesStr
  decodeEditor.actionAdviceStr = (tpl.action || []).join('\n')
  decodeEditor.coreQuote = ''
  decodeEditor.fullInterpretation = ''
}

watch(selected, r => {
  if (r?.humanStatus === 'pending') loadDecodeDefaults(r)
})

async function publishDecode() {
  if (!selected.value || selected.value.humanStatus !== 'pending') return
  try {
    const qualities = decodeEditor.qualitiesStr
      .split(/[，,]/g)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 3)
    const actionAdvice = decodeEditor.actionAdviceStr
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 8)
    await store.adminPublishRelief({
      reliefId: selected.value.id,
      decode: {
        redSpirit: decodeEditor.redSpirit,
        martyr: decodeEditor.martyr,
        qualities,
        actionAdvice,
        expertName: store.curUser?.username || '专家顾问',
        coreQuote: decodeEditor.coreQuote,
        fullInterpretation: decodeEditor.fullInterpretation,
      },
    })
    flashMsg('已发布')
  } catch (e) {
    flashMsg(e?.message || '失败', false)
  }
}

function openReject() {
  if (!selected.value) return
  const reason = prompt('驳回原因（可空）', '')
  if (reason === null) return
  try {
    store.adminRejectRelief({ reliefId: selected.value.id, reason })
    flashMsg('已驳回')
    selectedId.value = ''
  } catch (e) {
    flashMsg(e?.message || '失败', false)
  }
}

function statusLabel(s) {
  if (s === 'pending') return '待解读'
  if (s === 'published') return '已公开'
  if (s === 'rejected') return '已驳回'
  return s
}

function statusClass(s) {
  if (s === 'pending') return 'text-amber-700'
  if (s === 'published') return 'text-emerald-700'
  return 'text-stone-500'
}

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('zh-CN', { hour12: false }).slice(0, 16)
}

const reliefReflectionsList = computed(() => store.reliefReflections.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)))

async function markQuality(id) {
  try {
    await store.adminMarkReflectionQuality({ reflectionId: id })
    flashMsg('已标记优质')
  } catch (e) {
    flashMsg(e?.message || '失败', false)
  }
}

const commentReliefFilter = ref('__all__')
const commentsFiltered = computed(() => {
  if (commentReliefFilter.value === '__all__') return store.reliefComments.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return store.reliefComments.filter(c => String(c.reliefId) === String(commentReliefFilter.value))
})

async function toggleTop(c) {
  try {
    await store.adminSetReliefCommentTop({ commentId: c.id, pinned: !c.pinned })
    flashMsg('已更新')
  } catch (e) {
    flashMsg(e?.message || '失败', false)
  }
}

async function deleteComment(c) {
  if (!confirm('删除该评论及回复？')) return
  try {
    await store.adminDeleteReliefComment({ commentId: c.id })
    flashMsg('已删除')
  } catch (e) {
    flashMsg(e?.message || '失败', false)
  }
}
</script>
