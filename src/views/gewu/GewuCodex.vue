<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import GewuLiveNum from './GewuLiveNum.vue'
import { highlightLine } from './gewuHighlight.js'

const props = defineProps({
  demo: { type: Object, required: true },
  completedDemoKeys: { type: Array, default: () => [] },
})
const emit = defineEmits(['select-scroll', 'verify-demo'])

const params = ref({})
const hoverStage = ref(null)
const arenaStage = ref(null)
const playIndex = ref(null)
const paused = ref(false)
const autoPlay = ref(false)
const selectedOption = ref(null)
const challengeChecked = ref(false)
let timer = null

const derived = computed(() => props.demo.compute(params.value))
const frames = computed(() => props.demo.frames ? props.demo.frames(params.value, derived.value) : [])
const activeFrame = computed(() => {
  if (playIndex.value === null || frames.value.length === 0) return null
  return frames.value[Math.min(playIndex.value, frames.value.length - 1)]
})
const activeStage = computed(() => activeFrame.value ? activeFrame.value.stage : (arenaStage.value ?? hoverStage.value))
const atEnd = computed(() => playIndex.value !== null && playIndex.value >= frames.value.length - 1)
const noteHtml = computed(() => activeFrame.value
  ? activeFrame.value.say
  : props.demo.note(activeStage.value, params.value, derived.value))
const stepLabels = computed(() => frames.value.map((frame, index) =>
  frame.title || props.demo.stepTitles?.[index] || `第 ${index + 1} 步`))
const inlineParamNames = computed(() => new Set(props.demo.lines.flatMap((line) =>
  [...line.text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]))))
const extraParams = computed(() => Object.entries(props.demo.paramDefs)
  .filter(([name]) => !inlineParamNames.value.has(name)))
const hasChanged = computed(() => Object.entries(props.demo.initial)
  .some(([name, value]) => params.value[name] !== value))
const challenge = computed(() => typeof props.demo.challenge === 'function'
  ? props.demo.challenge(params.value, derived.value)
  : props.demo.challenge)
const challengeCorrect = computed(() => challenge.value && selectedOption.value === challenge.value.correct)
const learningGoal = computed(() => props.demo.learningGoal || `识别「${props.demo.title}」的输入、变换和结果。`)
const visualSummaryId = computed(() => `gewu-visual-${props.demo.bookId}-${props.demo.volume.id}-${props.demo.id}`)
const visualSummary = computed(() => activeFrame.value
  ? `${learningGoal.value} 当前为${stepLabels.value[playIndex.value]}。`
  : `${learningGoal.value} 可调整参数，并逐步查看图示变化。`)
const sequenceBridge = computed(() => {
  const scrolls = props.demo.volume?.scrolls || []
  const index = scrolls.findIndex((item) => item.id === props.demo.id)
  return {
    prev: index > 0 ? `上一式：${scrolls[index - 1].label}` : '本卷起手：先建立这个概念的直觉。',
    current: learningGoal.value,
    next: index >= 0 && index < scrolls.length - 1 ? `下一式：${scrolls[index + 1].label}` : '本卷收束：把本式用于后续主题。',
  }
})
const bridgeItems = computed(() => [
  ['承前', props.demo.bridge?.prev || sequenceBridge.value.prev],
  ['本式', props.demo.bridge?.current || sequenceBridge.value.current],
  ['启后', props.demo.bridge?.next || sequenceBridge.value.next],
  ['来源', props.demo.bridge?.sources],
].filter(([, value]) => value?.length))

function clearTimer() {
  if (timer !== null) {
    window.clearTimeout(timer)
    timer = null
  }
}

function resetState() {
  clearTimer()
  params.value = { ...props.demo.initial }
  hoverStage.value = props.demo.lines.find((line) => line.stage !== undefined)?.stage ?? null
  arenaStage.value = null
  playIndex.value = null
  paused.value = false
  selectedOption.value = null
  challengeChecked.value = false
}

function setParam(key, value) {
  params.value = { ...params.value, [key]: value }
}

function selectOption(index) {
  selectedOption.value = index
  challengeChecked.value = false
}

function checkChallenge() {
  if (selectedOption.value === null) return
  challengeChecked.value = true
  if (challengeCorrect.value) emit('verify-demo')
}

function renderLine(text) {
  return text.split(/(\{\{\w+\}\})/g).flatMap((part, index) => {
    const match = part.match(/^\{\{(\w+)\}\}$/)
    if (match) {
      const definition = props.demo.paramDefs[match[1]]
      return definition ? [{ kind: 'parameter', key: `${index}-${match[1]}`, name: match[1], definition }] : []
    }

    return highlightLine(part).map((token, tokenIndex) => ({
      kind: 'token',
      key: `${index}-${tokenIndex}`,
      ...token,
    }))
  })
}

function handleHover(line) {
  if (playIndex.value === null && line.stage !== undefined) {
    arenaStage.value = null
    hoverStage.value = line.stage
  }
}

function handleArenaHover(event) {
  if (playIndex.value !== null) return
  const step = event.target.closest?.('[data-step]')?.dataset.step
  const nextStage = Number(step)
  if (Number.isInteger(nextStage)) arenaStage.value = nextStage
}

function isFrameLineActive(frame, line, lineNumber) {
  if (!frame) return false
  if (frame.stage !== undefined && line.stage !== undefined) return frame.stage === line.stage
  const lineNumbers = Array.isArray(frame.line) ? frame.line : [frame.line]
  return lineNumbers.includes(lineNumber)
}

function jumpToFrame(index) {
  clearTimer()
  paused.value = true
  playIndex.value = index
}

function handlePlay() {
  if (playIndex.value === null || atEnd.value) {
    playIndex.value = 0
    paused.value = !autoPlay.value
    return
  }

  if (!autoPlay.value) {
    stepForward()
    return
  }

  paused.value = !paused.value
}

function stepBack() {
  paused.value = true
  playIndex.value = Math.max(0, playIndex.value - 1)
}

function stepForward() {
  paused.value = true
  playIndex.value = Math.min(frames.value.length - 1, playIndex.value + 1)
}

function stopPlay() {
  clearTimer()
  playIndex.value = null
  paused.value = false
}

watch(() => props.demo, resetState, { immediate: true })
watch([playIndex, paused, frames], ([index, isPaused, sequence]) => {
  clearTimer()
  if (index === null || isPaused || index >= sequence.length - 1) return
  timer = window.setTimeout(() => {
    playIndex.value += 1
  }, props.demo.playMs || 950)
})

onBeforeUnmount(clearTimer)
</script>

<template>
  <div class="middle">
    <nav class="scrolls" aria-label="演示小节">
      <button
        v-for="(scroll, index) in demo.volume.scrolls"
        :key="scroll.id"
        type="button"
        :class="['scroll-tab', {
          active: scroll.id === demo.id,
          done: completedDemoKeys.includes(`${demo.bookId}:${demo.volume.id}:${scroll.id}`),
        }]"
        @click="$emit('select-scroll', index)"
      >{{ scroll.label }}</button>
    </nav>

    <section class="learning-goal" aria-label="本式目标">
      <span>本式目标</span>
      <p>{{ learningGoal }}</p>
    </section>

    <details class="context-panel">
      <summary>背景与上下文</summary>
      <div class="scroll-intro" v-html="demo.intro"></div>
    <div v-if="bridgeItems.length" class="bridge-panel">
      <div v-for="([label, value]) in bridgeItems" :key="label" class="bridge-item">
        <div class="bridge-label">{{ label }}</div>
        <div class="bridge-text">{{ Array.isArray(value) ? value.join(' · ') : value }}</div>
      </div>
    </div>

    </details>

    <div class="codex-pair">
      <section class="zone-code">
        <div class="section-label">心法 · 经文</div>
        <div class="manual">
          <div
            v-for="(line, lineIndex) in demo.lines"
            :key="lineIndex"
            :class="['manual-line', { active: activeFrame ? isFrameLineActive(activeFrame, line, lineIndex + 1) : activeStage !== null && line.stage === activeStage }]"
            @mouseenter="handleHover(line)"
          >
            <span class="ln">{{ lineIndex + 1 }}</span>
            <span class="src">
              <template v-for="part in renderLine(line.text)" :key="part.key">
                <GewuLiveNum
                  v-if="part.kind === 'parameter'"
                  :value="params[part.name]"
                  :min="part.definition.min"
                  :max="part.definition.max"
                  :step="part.definition.step"
                  :fmt="part.definition.fmt"
                  :label="part.definition.label || part.name"
                  @change="setParam(part.name, $event)"
                />
                <span v-else :class="part.c">{{ part.t }}</span>
              </template>
              <template v-if="line.text === ''"> </template>
            </span>
          </div>
        </div>
        <div v-if="extraParams.length" class="param-controls" aria-label="演示参数">
          <div v-for="([name, definition]) in extraParams" :key="name" class="param-control">
            <span>{{ definition.label || name }}</span>
            <GewuLiveNum
              :value="params[name]"
              :min="definition.min"
              :max="definition.max"
              :step="definition.step"
              :fmt="definition.fmt"
              :label="definition.label || name"
              @change="setParam(name, $event)"
            />
          </div>
        </div>
        <div class="play-bar">
          <button type="button" class="btn-play" @click="handlePlay">
            {{ playIndex === null || atEnd ? '开始演法' : autoPlay ? (paused ? '继续自动' : '暂停自动') : '下一步' }}
          </button>
          <label class="autoplay-control"><input v-model="autoPlay" type="checkbox"> 自动播放</label>
          <template v-if="playIndex !== null">
            <button type="button" class="btn-play ghost" @click="stepBack">◀ 退</button>
            <button type="button" class="btn-play ghost" @click="stepForward">进 ▶</button>
            <button type="button" class="btn-play ghost" @click="stopPlay">收功</button>
            <span class="play-count">第 {{ Math.min(playIndex + 1, frames.length) }} / {{ frames.length }} 招</span>
          </template>
          <button type="button" class="btn-play ghost" @click="resetState">重置</button>
          <div v-if="frames.length" class="step-timeline" aria-label="演法步骤">
            <button
              v-for="(frame, index) in frames"
              :key="`${frame.line}-${index}`"
              type="button"
              :class="['step-dot', {
                active: playIndex === null ? index === 0 : playIndex === index,
                done: playIndex !== null && index < playIndex,
              }]"
              :aria-current="playIndex === index ? 'step' : undefined"
              :aria-label="stepLabels[index]"
              @click="jumpToFrame(index)"
            >{{ index + 1 }}</button>
          </div>
          <div v-if="activeFrame" class="step-guide" role="status" aria-live="polite">
            <span class="step-guide-label">当前步骤</span>
            <span>{{ stepLabels[playIndex] }}</span>
          </div>
        </div>
      </section>

      <section class="zone-arena">
        <div class="arena-head">
          <div class="section-label">{{ demo.title }}</div>
          <span class="demo-mode-badge">{{ demo.runtimeLabel || '概念模拟 · 参数实时计算' }}</span>
        </div>
        <div class="arena" role="region" :aria-label="demo.title" :aria-describedby="visualSummaryId" @pointerover="handleArenaHover" @pointerleave="arenaStage = null">
          <p :id="visualSummaryId" class="sr-only">{{ visualSummary }}</p>
          <component :is="demo.Viz" :params="params" :derived="derived" :stage="activeStage" :play="activeFrame" :changed="hasChanged" />
        </div>
      </section>
    </div>
    <section v-if="challenge" class="learning-check" aria-live="polite">
      <div class="learning-check-title">先预测</div>
      <p>{{ challenge.prompt }}</p>
      <div class="check-options">
        <button
          v-for="(option, index) in challenge.options"
          :key="option"
          type="button"
          :class="{ selected: selectedOption === index }"
          :aria-pressed="selectedOption === index"
          @click="selectOption(index)"
        >{{ option }}</button>
      </div>
      <button type="button" class="btn-play ghost check-button" :disabled="selectedOption === null" @click="checkChallenge">核对</button>
      <p v-if="challengeChecked" :class="['check-feedback', { correct: challengeCorrect }]">
        {{ challengeCorrect ? challenge.feedback : challenge.retry }}
      </p>
      <p v-if="challengeChecked && challenge.transfer" class="check-transfer">迁移：{{ challenge.transfer }}</p>
    </section>
    <details v-if="demo.pyCode" class="reference-panel">
      <summary>参考实现</summary>
      <pre v-if="demo.pyCode"><code>{{ demo.pyCode }}</code></pre>
    </details>
    <p class="tip-banner">研习无须按序 · 改一字而万象随之而动 · 此谓「悬镜即形」之妙</p>
  </div>

  <aside class="zone-notes">
    <div class="section-label">批注 · 释义</div>
    <div class="note"><span class="label">批注</span><span v-html="noteHtml"></span></div>
    <div v-if="demo.terms?.length" class="glossary">
      <div class="glossary-title">释义 · 小词典</div>
      <dl>
        <div v-for="(term, index) in demo.terms" :key="index" class="gloss-item">
          <dt v-html="term.t"></dt>
          <dd v-html="term.d"></dd>
        </div>
      </dl>
    </div>
  </aside>
</template>
