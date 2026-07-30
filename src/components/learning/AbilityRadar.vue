<script setup>
import { computed } from 'vue'

const props = defineProps({
  profile: {
    type: Object,
    default: () => ({}),
  },
})

const center = { x: 120, y: 96 }
const radius = 64

const dimensions = computed(() => (props.profile?.dimensions || []).map((item, index) => ({
  ...item,
  score: Math.min(100, Math.max(0, Number(item.score || 0))),
  color: ['#247e9e', '#2d936f', '#c88332'][index % 3],
})))

function point(index, total, scale = 1) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(total, 1)
  return {
    x: center.x + Math.cos(angle) * radius * scale,
    y: center.y + Math.sin(angle) * radius * scale,
  }
}

function polygonPoints(scale) {
  return dimensions.value
    .map((_, index, list) => {
      const value = point(index, list.length, scale)
      return `${value.x.toFixed(1)},${value.y.toFixed(1)}`
    })
    .join(' ')
}

const gridLevels = [0.25, 0.5, 0.75, 1]
const radarShape = computed(() => dimensions.value
  .map((item, index, list) => {
    const value = point(index, list.length, item.score / 100)
    return `${value.x.toFixed(1)},${value.y.toFixed(1)}`
  })
  .join(' '))
const labelPoints = computed(() => dimensions.value.map((_, index, list) => {
  const value = point(index, list.length, 1.28)
  return {
    x: value.x,
    y: value.y,
    anchor: Math.abs(value.x - center.x) < 8 ? 'middle' : value.x > center.x ? 'start' : 'end',
  }
}))
const dominantDimension = computed(() => dimensions.value.find(item => item.key === props.profile?.dominantDimensionKey)
  || [...dimensions.value].sort((a, b) => b.score - a.score)[0])
const priorityDimension = computed(() => dimensions.value.find(item => item.key === props.profile?.priorityDimensionKey)
  || [...dimensions.value].sort((a, b) => a.score - b.score)[0])
const balanceScore = computed(() => {
  if (props.profile?.balanceScore != null) return Number(props.profile.balanceScore)
  if (!dimensions.value.length) return 0
  const scores = dimensions.value.map(item => item.score)
  return Math.max(0, 100 - (Math.max(...scores) - Math.min(...scores)))
})
const pattern = computed(() => {
  if (props.profile?.pattern) return props.profile.pattern
  if (!dimensions.value.some(item => item.score > 0)) return '数据积累中'
  return balanceScore.value >= 88 ? '均衡发展' : `${dominantDimension.value?.label || '优势能力'}突出`
})
const ariaLabel = computed(() => dimensions.value.length
  ? `能力雷达图：${dimensions.value.map(item => `${item.label} ${item.score}分`).join('，')}`
  : '能力雷达图：暂无能力数据')
</script>

<template>
  <div class="ability-radar">
    <div class="radar-visual">
      <svg viewBox="0 0 240 205" role="img" :aria-label="ariaLabel">
        <polygon
          v-for="level in gridLevels"
          :key="level"
          :points="polygonPoints(level)"
          class="radar-grid"
        />
        <line
          v-for="(_, index) in dimensions"
          :key="`axis-${index}`"
          :x1="center.x"
          :y1="center.y"
          :x2="point(index, dimensions.length).x"
          :y2="point(index, dimensions.length).y"
          class="radar-axis"
        />
        <polygon v-if="dimensions.length" :points="radarShape" class="radar-area" />
        <circle
          v-for="(item, index) in dimensions"
          :key="`point-${item.key}`"
          :cx="point(index, dimensions.length, item.score / 100).x"
          :cy="point(index, dimensions.length, item.score / 100).y"
          r="3.5"
          :fill="item.color"
          class="radar-point"
        />
        <g v-for="(item, index) in dimensions" :key="`label-${item.key}`">
          <text
            :x="labelPoints[index].x"
            :y="labelPoints[index].y"
            :text-anchor="labelPoints[index].anchor"
            class="radar-label"
          >{{ item.label }}</text>
          <text
            :x="labelPoints[index].x"
            :y="labelPoints[index].y + 14"
            :text-anchor="labelPoints[index].anchor"
            class="radar-value"
          >{{ item.score }}</text>
        </g>
      </svg>
      <div class="radar-summary" aria-hidden="true">
        <strong>{{ profile.overallScore ?? 0 }}</strong>
        <span>综合能力</span>
      </div>
    </div>

    <div class="profile-reading">
      <div class="profile-type">
        <span>画像特征</span>
        <strong>{{ pattern }}</strong>
        <small>均衡度 {{ balanceScore }}%</small>
      </div>
      <dl class="dimension-evidence">
        <div v-for="item in dimensions" :key="item.key">
          <dt><i :style="{ background: item.color }" /><strong>{{ item.label }}</strong><b>{{ item.score }}</b></dt>
          <dd>{{ item.interpretation }} · {{ item.evidence }}</dd>
        </div>
      </dl>
      <div v-if="dimensions.length" class="profile-signals">
        <span><small>优势维度</small><strong>{{ dominantDimension?.label || '-' }}</strong></span>
        <span><small>优先提升</small><strong>{{ priorityDimension?.label || '-' }}</strong></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ability-radar{display:grid;grid-template-columns:minmax(235px,.85fr) minmax(210px,1.15fr);gap:22px;align-items:center}.radar-visual{position:relative;min-width:0;aspect-ratio:240/205}.radar-visual svg{display:block;width:100%;height:100%;overflow:visible}.radar-grid{fill:#f8fbfd;fill-opacity:.42;stroke:#dbe5eb;stroke-width:1}.radar-grid:nth-child(4){fill:#f3f8fa;stroke:#b8cbd5}.radar-axis{stroke:#d5e1e7;stroke-width:1}.radar-area{fill:#2d936f;fill-opacity:.22;stroke:#247e9e;stroke-width:2.2;stroke-linejoin:round}.radar-point{stroke:#fff;stroke-width:2}.radar-label{fill:#506980;font-size:11px;font-weight:700;letter-spacing:0}.radar-value{fill:#24708f;font-size:12px;font-weight:800;letter-spacing:0}.radar-summary{position:absolute;top:47%;left:50%;display:grid;width:64px;height:64px;place-content:center;transform:translate(-50%,-50%);border:1px solid #bfd7dc;border-radius:50%;background:rgba(255,255,255,.92);box-shadow:0 4px 14px rgba(37,81,96,.1);text-align:center}.radar-summary strong,.radar-summary span{display:block}.radar-summary strong{color:#246b82;font-size:22px;line-height:1}.radar-summary span{margin-top:4px;color:#758794;font-size:9px}.profile-reading{min-width:0}.profile-type{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;padding-bottom:12px;border-bottom:1px solid #e4ebef}.profile-type span,.profile-type small{color:#7a8b98;font-size:11px}.profile-type strong{grid-column:1;font-size:17px;color:#27495b}.profile-type small{grid-column:2;grid-row:1/3;align-self:center;padding:5px 7px;background:#edf6f4;color:#2d7b65;font-weight:700}.dimension-evidence{display:grid;gap:0;margin:0}.dimension-evidence>div{padding:10px 0;border-bottom:1px solid #edf1f3}.dimension-evidence dt{display:grid;grid-template-columns:8px minmax(0,1fr) auto;gap:7px;align-items:center}.dimension-evidence dt i{width:8px;height:8px}.dimension-evidence dt strong,.dimension-evidence dt b{color:#37566a;font-size:12px}.dimension-evidence dt b{color:#246f8f}.dimension-evidence dd{overflow:hidden;margin:4px 0 0 15px;color:#718492;font-size:11px;line-height:1.45;text-overflow:ellipsis;white-space:nowrap}.profile-signals{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.profile-signals span{display:grid;gap:3px;padding:8px 10px;border-left:2px solid #2d936f;background:#f4faf8}.profile-signals span:last-child{border-left-color:#c88332;background:#fff9f1}.profile-signals small{color:#7c8e99;font-size:10px}.profile-signals strong{color:#34566a;font-size:12px}@media(max-width:620px){.ability-radar{grid-template-columns:1fr;gap:8px}.radar-visual{justify-self:center;width:min(100%,300px)}.dimension-evidence dd{white-space:normal}}
</style>
