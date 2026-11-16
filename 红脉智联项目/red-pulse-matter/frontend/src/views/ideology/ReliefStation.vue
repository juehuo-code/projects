<template>
  <div class="relief-minimal mx-auto max-w-2xl px-4 py-10 md:py-14">
    <!-- 顶部 -->
    <header class="mb-12 text-center md:text-left">
      <h1 class="text-2xl md:text-3xl font-bold text-red-900 tracking-tight">红色精神解忧站</h1>
      <p class="mt-2 text-sm text-stone-500 leading-relaxed">三步完成：提交困惑 → 查看解读 → 共鸣与誓言</p>
    </header>

    <!-- 第一步：提交困惑 -->
    <section class="mb-14" aria-labelledby="step1">
      <h2 id="step1" class="mb-4 flex items-center gap-2 text-sm font-bold text-red-900">
        <span class="flex h-7 w-7 items-center justify-center rounded-full bg-red-900 text-xs text-white">1</span>
        提交困惑
      </h2>
      <div class="rounded-2xl border border-stone-200/90 bg-white p-5 md:p-6 shadow-sm">
        <div class="space-y-5">
          <label class="block">
            <span class="sr-only">分类</span>
            <select
              v-model="form.type"
              class="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-stone-800 focus:border-red-900 focus:outline-none focus:ring-1 focus:ring-red-900/30"
            >
              <option>学业</option>
              <option>就业</option>
              <option>人际</option>
              <option>奋斗倦怠</option>
              <option>理想</option>
              <option>社会认知偏差</option>
            </select>
          </label>
          <label class="flex items-center gap-3 text-sm text-stone-600 cursor-pointer select-none">
            <input v-model="form.anonymousMode" type="checkbox" class="h-4 w-4 rounded border-stone-300 text-red-900 focus:ring-red-900" />
            匿名提交
          </label>
          <label class="block">
            <span class="sr-only">困惑内容</span>
            <textarea
              v-model="form.content"
              rows="8"
              class="w-full resize-y rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm leading-relaxed text-stone-800 placeholder:text-stone-400 focus:border-red-900 focus:outline-none focus:ring-2 focus:ring-red-900/15 min-h-[200px]"
              placeholder="请简要描述你的困惑与情境…"
            />
          </label>
          <button
            type="button"
            :disabled="submitting || !canSubmit || isAnonymous"
            class="w-full rounded-xl bg-red-900 px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="submitRelief"
          >
            {{ submitting ? '提交中…' : isAnonymous ? '请先登录后提交' : '提交困惑' }}
          </button>
          <p v-if="submitErr" class="text-sm text-red-600">{{ submitErr }}</p>
        </div>
      </div>
    </section>

    <!-- 未登录 -->
    <section v-if="isAnonymous" class="mb-14 rounded-2xl border border-dashed border-stone-200 bg-stone-50/80 px-5 py-10 text-center text-sm text-stone-500">
      请 <router-link to="/login" class="font-bold text-red-900 underline underline-offset-2">登录</router-link> 后查看解读进度并参与共鸣。
    </section>

    <template v-else>
      <!-- 第二步：专家解读（跟随本人最新一条） -->
      <section class="mb-14" aria-labelledby="step2">
        <h2 id="step2" class="mb-4 flex items-center gap-2 text-sm font-bold text-red-900">
          <span class="flex h-7 w-7 items-center justify-center rounded-full bg-red-900 text-xs text-white">2</span>
          专家解读
        </h2>

        <div v-if="!myLatestRelief" class="rounded-2xl border border-stone-100 bg-stone-50 px-5 py-12 text-center text-sm text-stone-400">
          提交困惑后，将在此展示解读进度
        </div>

        <div v-else-if="myLatestRelief.humanStatus === 'pending'" class="rounded-2xl border border-amber-100 bg-amber-50/60 px-5 py-10 text-center">
          <p class="text-sm font-medium text-amber-900/90">正在匹配专家解读中…</p>
          <p class="mt-2 text-xs text-stone-500">请稍候，发布后将自动展示</p>
        </div>

        <div v-else-if="myLatestRelief.humanStatus === 'rejected'" class="rounded-2xl border border-red-100 bg-red-50/50 px-5 py-8 text-sm text-red-800">
          本条未通过审核，请调整后再试。
          <span v-if="myLatestRelief.rejectReason" class="mt-2 block text-xs opacity-90">{{ myLatestRelief.rejectReason }}</span>
        </div>

        <div
          v-else
          class="grid gap-4 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm md:grid-cols-2"
        >
          <div class="border-b border-stone-100 bg-gradient-to-br from-red-50/90 to-stone-50 p-6 md:border-b-0 md:border-r">
            <p class="text-xs font-bold uppercase tracking-wider text-red-900/80">匹配红色精神</p>
            <p class="mt-3 text-lg font-bold text-stone-900 leading-snug">{{ myLatestRelief.decode?.redSpirit || '—' }}</p>
            <p v-if="myLatestRelief.decode?.martyr" class="mt-4 text-sm text-stone-600">
              人物参考：<span class="font-medium text-stone-800">{{ myLatestRelief.decode.martyr }}</span>
            </p>
          </div>
          <div class="p-6 flex flex-col justify-center">
            <p class="text-xs font-bold uppercase tracking-wider text-stone-500">核心解读</p>
            <p class="mt-3 text-base leading-relaxed text-stone-800 font-medium">
              {{ decodeGoldQuote }}
            </p>
            <p
              v-if="myLatestRelief.decode?.fullInterpretation"
              class="mt-4 text-sm leading-relaxed text-stone-600 whitespace-pre-wrap border-t border-stone-100 pt-4"
            >
              {{ myLatestRelief.decode.fullInterpretation }}
            </p>
            <button
              type="button"
              class="mt-6 self-start rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 hover:border-red-300 hover:text-red-900 transition"
              @click="toggleLikeLatest"
            >
              👍 {{ likeCountLatest }}
            </button>
          </div>
        </div>
      </section>

      <!-- 第三步：共鸣与成长 -->
      <section v-if="myTargetPublished" aria-labelledby="step3">
        <h2 id="step3" class="mb-4 flex items-center gap-2 text-sm font-bold text-red-900">
          <span class="flex h-7 w-7 items-center justify-center rounded-full bg-red-900 text-xs text-white">3</span>
          共鸣与成长
        </h2>

        <div class="space-y-6">
          <!-- 精选感悟（单条） -->
          <div class="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <p class="text-xs font-bold text-stone-400 uppercase tracking-wide mb-3">精选感悟</p>
            <template v-if="featuredReflection">
              <p class="text-sm leading-relaxed text-stone-800 whitespace-pre-wrap">{{ featuredReflection.text }}</p>
              <p class="mt-3 text-xs text-stone-400">
                {{ featuredReflection.username || '用户' }}
                <span v-if="featuredReflection.quality" class="ml-2 text-amber-800">· 优质</span>
              </p>
            </template>
            <p v-else class="text-sm text-stone-400">暂无精选，欢迎率先分享你的感悟</p>
          </div>

          <!-- 我的感悟（精简单行入口） -->
          <div class="rounded-2xl border border-stone-200 bg-stone-50/50 p-6">
            <p class="text-xs font-bold text-stone-500 mb-3">我的感悟</p>
            <div v-if="myReflectionFor(targetReliefId)" class="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
              {{ myReflectionFor(targetReliefId).text }}
            </div>
            <div v-else class="space-y-3">
              <textarea
                v-model="reflectionDraft"
                rows="4"
                class="w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm focus:border-red-900 focus:outline-none focus:ring-1 focus:ring-red-900/20"
                placeholder="写下你的体会（120–600 字）"
              />
              <button
                type="button"
                :disabled="reflectionBusy"
                class="rounded-xl bg-red-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50"
                @click="submitReflection"
              >
                {{ reflectionBusy ? '提交中…' : '提交感悟' }}
              </button>
            </div>
          </div>

          <!-- 成长誓言 -->
          <div class="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-6">
            <p class="text-xs font-bold text-amber-900/90 mb-3">成长誓言（+12）</p>
            <div v-if="myOathFor(targetReliefId)" class="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">
              {{ myOathFor(targetReliefId).text }}
            </div>
            <div v-else class="space-y-3">
              <textarea
                v-model="oathDraft"
                rows="3"
                class="w-full rounded-xl border border-amber-200/80 bg-white px-3 py-3 text-sm focus:border-red-900 focus:outline-none"
                placeholder="写下你的下一步承诺（80–400 字）"
              />
              <button
                type="button"
                :disabled="oathBusy"
                class="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50"
                @click="submitOath"
              >
                {{ oathBusy ? '提交中…' : '提交誓言' }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useIdeologyStore } from '../../stores/ideology'

const store = useIdeologyStore()

const form = reactive({
  type: '学业',
  content: '',
  anonymousMode: true,
})
const submitting = ref(false)
const submitErr = ref('')
const reflectionDraft = ref('')
const oathDraft = ref('')
const reflectionBusy = ref(false)
const oathBusy = ref(false)

const isAnonymous = computed(() => store.curUserId === 'anonymous')

const canSubmit = computed(() => {
  const n = [...String(form.content || '')].length
  return n >= 80 && n <= 800
})

/** 本人最新一条解忧（时间倒序） */
const myLatestRelief = computed(() => {
  const uid = store.curUserId
  const mine = store.reliefs.filter(r => String(r.userId) === String(uid)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return mine[0] || null
})

/** 用于第三步互动：优先使用最新一条已发布的本人解忧，否则无 */
const myTargetPublished = computed(() => {
  const uid = store.curUserId
  const pub = store.reliefs
    .filter(r => String(r.userId) === String(uid) && r.humanStatus === 'published')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return pub[0] || null
})

const targetReliefId = computed(() => myTargetPublished.value?.id || '')

const likeCountLatest = computed(() => {
  const id = myLatestRelief.value?.id
  if (!id || myLatestRelief.value?.humanStatus !== 'published') return 0
  return store.reliefLikes.filter(l => String(l.reliefId) === String(id)).length
})

const decodeGoldQuote = computed(() => {
  const d = myLatestRelief.value?.decode
  if (!d) return '—'
  if (d.coreQuote && String(d.coreQuote).trim()) return String(d.coreQuote).trim()
  const a = d.actionAdvice?.[0]
  if (a) return a
  return d.redSpirit || '—'
})

/** 全站精选一条感悟：优质优先，其次点赞、时间 */
const featuredReflection = computed(() => {
  const publishedIds = new Set(store.reliefs.filter(r => r.humanStatus === 'published').map(r => r.id))
  const list = store.reliefReflections
    .filter(rf => publishedIds.has(rf.reliefId))
    .slice()
    .sort((a, b) => {
      const q = Number(b.quality) - Number(a.quality)
      if (q !== 0) return q
      const lk = (b.likes || 0) - (a.likes || 0)
      if (lk !== 0) return lk
      return (b.createdAt || 0) - (a.createdAt || 0)
    })
  return list[0] || null
})

function myReflectionFor(reliefId) {
  return store.reliefReflections.find(rf => String(rf.reliefId) === String(reliefId) && String(rf.userId) === String(store.curUserId)) || null
}

function myOathFor(reliefId) {
  return store.reliefOaths.find(o => String(o.reliefId) === String(reliefId) && String(o.userId) === String(store.curUserId)) || null
}

watch(targetReliefId, id => {
  reflectionDraft.value = ''
  oathDraft.value = ''
})

async function submitRelief() {
  submitErr.value = ''
  submitting.value = true
  try {
    await store.submitRelief({
      type: form.type,
      content: form.content,
      anonymousMode: form.anonymousMode,
    })
    form.content = ''
  } catch (e) {
    submitErr.value = e?.message || '提交失败'
  } finally {
    submitting.value = false
  }
}

async function toggleLikeLatest() {
  const id = myLatestRelief.value?.id
  if (!id || myLatestRelief.value?.humanStatus !== 'published') return
  try {
    await store.toggleReliefLike({ reliefId: id })
  } catch (e) {
    alert(e?.message || '操作失败')
  }
}

async function submitReflection() {
  const rid = targetReliefId.value
  if (!rid) return
  reflectionBusy.value = true
  try {
    await store.submitReliefReflection({ reliefId: rid, text: reflectionDraft.value })
    reflectionDraft.value = ''
  } catch (e) {
    alert(e?.message || '提交失败')
  } finally {
    reflectionBusy.value = false
  }
}

async function submitOath() {
  const rid = targetReliefId.value
  if (!rid) return
  oathBusy.value = true
  try {
    await store.submitOath({ reliefId: rid, text: oathDraft.value })
    oathDraft.value = ''
  } catch (e) {
    alert(e?.message || '提交失败')
  } finally {
    oathBusy.value = false
  }
}
</script>
