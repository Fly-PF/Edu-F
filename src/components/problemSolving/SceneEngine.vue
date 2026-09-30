<script setup>
import { computed, defineAsyncComponent } from 'vue'

const CoordinateScene = defineAsyncComponent(() => import('./CoordinateScene.vue'))
const MechanicsScene = defineAsyncComponent(() => import('./MechanicsScene.vue'))
const GeometryScene = defineAsyncComponent(() => import('./GeometryScene.vue'))
const ChartScene = defineAsyncComponent(() => import('./ChartScene.vue'))
const SpatialScene = defineAsyncComponent(() => import('./SpatialScene.vue'))
const StatisticsScene = defineAsyncComponent(() => import('./StatisticsScene.vue'))
const ProbabilityTreeScene = defineAsyncComponent(() => import('./ProbabilityTreeScene.vue'))
const PhysicsScene = defineAsyncComponent(() => import('./PhysicsScene.vue'))

const props = defineProps({ definition: { type: Object, required: true }, scene: { type: Object, required: true } })
const emit = defineEmits(['update:t', 'update:extension', 'update:variable', 'update:entity', 'update:series-point'])
const sceneType = computed(() => props.definition.sceneType || 'textOnly')
</script>

<template>
  <CoordinateScene v-if="sceneType === 'coordinate2d'" :scene="scene" @update:t="emit('update:t', $event)" />
  <MechanicsScene v-else-if="sceneType === 'mechanics2d'" :scene="scene" @update:variable="emit('update:variable', $event)" />
  <PhysicsScene v-else-if="sceneType.startsWith('physics')" :definition="definition" :scene="scene" @update:variable="emit('update:variable', $event)" />
  <GeometryScene v-else-if="sceneType === 'coordinatePlane2d'" title="平面直角坐标系" :definition="definition" :scene="scene" @update:entity="emit('update:entity', $event)" />
  <SpatialScene v-else-if="sceneType === 'coordinate3d'" title="空间直角坐标系" :definition="definition" :scene="scene" />
  <GeometryScene v-else-if="sceneType === 'geometry2d'" title="平面几何" :definition="definition" :scene="scene" @update:entity="emit('update:entity', $event)" />
  <SpatialScene v-else-if="sceneType === 'geometry3d'" title="立体几何" :definition="definition" :scene="scene" />
  <ChartScene v-else-if="sceneType === 'chart2d'" :definition="definition" :scene="scene" @update:series-point="emit('update:series-point', $event)" />
  <StatisticsScene v-else-if="sceneType === 'statistics2d'" :definition="definition" :scene="scene" @update:entity="emit('update:entity', $event)" />
  <ProbabilityTreeScene v-else-if="sceneType === 'probabilityTree'" :definition="definition" :scene="scene" @update:entity="emit('update:entity', $event)" />
  <section v-else class="empty-scene"><strong>文字讲题</strong><span>当前题目没有可展示的实时图形。</span></section>
</template>

<style scoped>
.empty-scene { display: grid; min-height: 260px; place-content: center; gap: 10px; border: 1px solid #d9dfeb; border-radius: 8px; background: #fff; color: #526078; text-align: center; }
.empty-scene strong { color: #28364f; font-size: 18px; }
</style>
