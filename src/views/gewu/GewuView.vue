<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import GewuCodex from './GewuCodex.vue'
import { GEWU_BOOKS } from './gewuCatalog.js'
import './gewu.css'

const LEGACY_PROGRESS_KEY = 'gewu-completed-demos'
const VIEWED_PROGRESS_KEY = 'gewu-viewed-demos'
const VERIFIED_PROGRESS_KEY = 'gewu-verified-demos'

function indexById(items, id) {
  const index = items.findIndex((item) => item.id === id)
  return index === -1 ? 0 : index
}

function readLocation() {
  const query = new URLSearchParams(window.location.search)
  const nextBookIndex = indexById(GEWU_BOOKS, query.get('gewuBook'))
  const nextBook = GEWU_BOOKS[nextBookIndex]
  const nextVolumeIndex = indexById(nextBook.volumes, query.get('gewuVolume'))
  const nextVolume = nextBook.volumes[nextVolumeIndex]
  return {
    bookIndex: nextBookIndex,
    volumeIndex: nextVolumeIndex,
    scrollIndex: indexById(nextVolume.scrolls, query.get('gewuDemo')),
  }
}

const location = readLocation()
const bookIndex = ref(location.bookIndex)
const volumeIndex = ref(location.volumeIndex)
const scrollIndex = ref(location.scrollIndex)
const catalogOpen = ref(false)
const viewedDemoKeys = ref(JSON.parse(window.localStorage.getItem(VIEWED_PROGRESS_KEY)
  || window.localStorage.getItem(LEGACY_PROGRESS_KEY) || '[]'))
const verifiedDemoKeys = ref(JSON.parse(window.localStorage.getItem(VERIFIED_PROGRESS_KEY) || '[]'))

const book = computed(() => GEWU_BOOKS[bookIndex.value])
const volume = computed(() => book.value.volumes[volumeIndex.value])
const scroll = computed(() => volume.value.scrolls[scrollIndex.value])
const activeDemo = computed(() => ({
  ...scroll.value.demo,
  id: scroll.value.id,
  bookId: book.value.id,
  volume: volume.value,
}))
const totalDemos = GEWU_BOOKS.flatMap((item) => item.volumes.flatMap((item) => item.scrolls)).length
const progressText = computed(() => `已探索 ${viewedDemoKeys.value.length} / ${totalDemos} · 已验证 ${verifiedDemoKeys.value.length} / ${totalDemos}`)

function currentDemoKey() {
  return `${book.value.id}:${volume.value.id}:${scroll.value.id}`
}

function markCurrentDemo() {
  const key = currentDemoKey()
  if (viewedDemoKeys.value.includes(key)) return
  viewedDemoKeys.value = [...viewedDemoKeys.value, key]
  window.localStorage.setItem(VIEWED_PROGRESS_KEY, JSON.stringify(viewedDemoKeys.value))
}

function markVerifiedDemo() {
  const key = currentDemoKey()
  if (verifiedDemoKeys.value.includes(key)) return
  verifiedDemoKeys.value = [...verifiedDemoKeys.value, key]
  window.localStorage.setItem(VERIFIED_PROGRESS_KEY, JSON.stringify(verifiedDemoKeys.value))
}

function syncLocation() {
  const url = new URL(window.location.href)
  url.searchParams.set('gewuBook', book.value.id)
  url.searchParams.set('gewuVolume', volume.value.id)
  url.searchParams.set('gewuDemo', scroll.value.id)
  window.history.replaceState(null, '', url)
}

function applyLocation() {
  const next = readLocation()
  bookIndex.value = next.bookIndex
  volumeIndex.value = next.volumeIndex
  scrollIndex.value = next.scrollIndex
}

function switchBook(index) {
  bookIndex.value = index
  volumeIndex.value = 0
  scrollIndex.value = 0
  catalogOpen.value = false
}

function switchVolume(index) {
  volumeIndex.value = index
  scrollIndex.value = 0
  catalogOpen.value = false
}

function switchScroll(index) {
  scrollIndex.value = index
}

watch([bookIndex, volumeIndex, scrollIndex], () => {
  markCurrentDemo()
  syncLocation()
})

onMounted(() => {
  markCurrentDemo()
  syncLocation()
  window.addEventListener('popstate', applyLocation)
})

onBeforeUnmount(() => window.removeEventListener('popstate', applyLocation))
</script>

<template>
  <main class="gewu-shell">
    <div class="app">
      <div class="page-inner">
        <header class="app-header">
          <div class="seal" aria-label="格物致知"><span>格</span><span>物</span><span>致</span><span>知</span></div>
          <h1 class="book-title">格物</h1>
          <div class="book-meta">
            <div class="book-sub">{{ book.title }} · {{ volume.name }}</div>
            <nav class="book-switch" aria-label="分卷">
              <button
                v-for="(item, index) in GEWU_BOOKS"
                :key="item.id"
                type="button"
                :class="['book-tab', { active: index === bookIndex }]"
                @click="switchBook(index)"
              >{{ item.title }}</button>
            </nav>
          </div>
        </header>

        <div class="divider">24 卷 · 45 个交互演示 <span class="learning-progress">{{ progressText }}</span></div>

        <div class="book-body">
          <button
            type="button"
            class="catalog-toggle"
            aria-controls="gewu-volume-catalog"
            :aria-expanded="catalogOpen"
            @click="catalogOpen = !catalogOpen"
          >{{ catalogOpen ? '收起目录' : `目录 · ${volume.name}` }}</button>
          <nav id="gewu-volume-catalog" :class="['vol-nav', { open: catalogOpen }]" aria-label="卷册目录">
            <div class="vol-nav-title">目录</div>
            <button
              v-for="(item, index) in book.volumes"
              :key="item.id"
              type="button"
              :class="['vol-tab', { active: index === volumeIndex }]"
              @click="switchVolume(index)"
            >{{ item.name }}</button>
          </nav>

          <GewuCodex
            :key="`${book.id}-${volume.id}-${scroll.id}`"
            :demo="activeDemo"
            :completed-demo-keys="verifiedDemoKeys"
            @select-scroll="switchScroll"
            @verify-demo="markVerifiedDemo"
          />
        </div>
      </div>
    </div>
  </main>
</template>
