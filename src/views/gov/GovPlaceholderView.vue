<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, CircleCheck, Clock, Lock, Notebook } from '@element-plus/icons-vue'

const props = defineProps({
  module: { type: Object, required: true },
})

const router = useRouter()
const progressItems = computed(() => props.module.items || [])

function goBack() {
  router.push('/main/home')
}
</script>

<template>
  <main class="gov-placeholder-page">
    <section class="gov-placeholder-shell">
      <header class="gov-placeholder-header">
        <button class="back-button" type="button" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回首页</span>
        </button>
        <span class="module-index">考公专题 · {{ module.index }}</span>
      </header>

      <div class="gov-placeholder-main">
        <div class="module-icon" :class="`tone-${module.tone || 'blue'}`">
          <el-icon><component :is="module.icon || Notebook" /></el-icon>
        </div>
        <p class="eyebrow">{{ module.eyebrow }}</p>
        <h1>{{ module.title }}</h1>
        <p class="module-description">{{ module.description }}</p>

        <div class="status-row" role="status">
          <span class="status-dot"><el-icon><Clock /></el-icon></span>
          <div>
            <strong>占位页面</strong>
            <span>页面结构已预留，后续接入接口和真实数据。</span>
          </div>
        </div>

        <div class="scope-list">
          <div v-for="item in progressItems" :key="item.label" class="scope-item">
            <span class="scope-icon">
              <el-icon><component :is="item.icon || CircleCheck" /></el-icon>
            </span>
            <div>
              <strong>{{ item.label }}</strong>
              <span>{{ item.detail }}</span>
            </div>
          </div>
        </div>

        <p class="future-note">
          <el-icon><Lock /></el-icon>
          当前仅展示模块边界，不写入业务数据。
        </p>
      </div>

      <footer class="gov-placeholder-footer">
        <span>Edu-F · 公考学习专题</span>
        <span>{{ module.footer }}</span>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.gov-placeholder-page {
  min-height: 100%;
  padding: 34px;
  background: #f5f7fb;
  color: #1f2937;
}

.gov-placeholder-shell {
  display: grid;
  min-height: calc(100vh - 132px);
  width: min(1120px, 100%);
  margin: 0 auto;
  border: 1px solid #e3e8f1;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 18px 45px rgb(28 45 76 / 9%);
  grid-template-rows: auto 1fr auto;
}

.gov-placeholder-header,
.gov-placeholder-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 28px;
}

.gov-placeholder-header {
  border-bottom: 1px solid #edf0f5;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 0;
  border: 0;
  background: transparent;
  color: #52627a;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
}

.back-button:hover,
.back-button:focus-visible {
  color: #2f80ed;
  outline: none;
}

.module-index,
.eyebrow {
  color: #7b879a;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.gov-placeholder-main {
  display: flex;
  width: min(660px, 100%);
  align-items: center;
  justify-self: center;
  flex-direction: column;
  padding: 64px 28px 54px;
  text-align: center;
}

.module-icon {
  display: grid;
  width: 76px;
  height: 76px;
  place-items: center;
  border-radius: 16px;
}

.module-icon .el-icon {
  font-size: 36px;
}

.tone-blue { background: #eaf3ff; color: #2f80ed; }
.tone-green { background: #e9f8f0; color: #18a66a; }
.tone-orange { background: #fff4e5; color: #d8891e; }
.tone-purple { background: #f1edff; color: #7258d8; }
.tone-cyan { background: #e7f7fa; color: #1593a8; }
.tone-red { background: #fff0f0; color: #d15b5b; }

.eyebrow { margin: 27px 0 0; }

h1 {
  margin: 10px 0 0;
  color: #172033;
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.2;
}

.module-description {
  max-width: 560px;
  margin: 17px 0 0;
  color: #64748b;
  font-size: 15px;
  line-height: 1.8;
}

.status-row {
  display: flex;
  width: min(520px, 100%);
  align-items: center;
  gap: 12px;
  margin-top: 35px;
  padding: 15px 17px;
  border: 1px solid #dfe8f5;
  border-radius: 8px;
  background: #f8fbff;
  text-align: left;
}

.status-dot,
.scope-icon {
  display: grid;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
  background: #e7f0ff;
  color: #2f80ed;
}

.status-row strong,
.scope-item strong {
  display: block;
  color: #27354a;
  font-size: 13px;
}

.status-row span,
.scope-item span {
  display: block;
  margin-top: 3px;
  color: #7b879a;
  font-size: 12px;
  line-height: 1.55;
}

.scope-list {
  display: grid;
  width: min(520px, 100%);
  gap: 9px;
  margin-top: 13px;
  text-align: left;
}

.scope-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 14px;
  border-bottom: 1px solid #edf0f5;
}

.scope-item:last-child { border-bottom: 0; }
.scope-item .scope-icon { width: 28px; height: 28px; background: #f1f4f9; color: #6b7b93; }

.future-note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 28px 0 0;
  color: #8a96a8;
  font-size: 12px;
}

.gov-placeholder-footer {
  border-top: 1px solid #edf0f5;
  color: #99a4b4;
  font-size: 12px;
}

@media (max-width: 640px) {
  .gov-placeholder-page { padding: 14px; }
  .gov-placeholder-shell { min-height: calc(100vh - 92px); }
  .gov-placeholder-header,
  .gov-placeholder-footer { padding: 17px 18px; }
  .gov-placeholder-main { padding: 48px 18px 38px; }
  .gov-placeholder-footer { align-items: flex-start; flex-direction: column; gap: 5px; }
}
</style>
