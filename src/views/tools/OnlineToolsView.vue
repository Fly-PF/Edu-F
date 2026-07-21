<script setup>
import { Collection, Cpu, MagicStick, Tools } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const tools = [
  {
    title: 'Python 工坊',
    description: '在云端编写、运行和调试代码，把灵感变成一个个小作品。',
    action: '开始编程',
    path: '/tools/python',
    icon: Cpu,
    tone: 'purple',
    sticker: 'CODE IT',
  },
  {
    title: '人工智能工坊',
    description: '体验 AI 创作、训练和推理，用好奇心解锁智能新玩法。',
    action: '开始探索',
    path: '/tools/ai',
    icon: MagicStick,
    tone: 'mint',
    sticker: 'TRY AI',
  },
  {
    title: '积木工坊',
    description: '拖拽积木控制舞台角色，把想法变成可以运行的互动作品。',
    action: '开始搭建',
    path: '/tools/blocks',
    icon: Collection,
    tone: 'yellow',
    sticker: 'MAKE IT',
  },
]

function openTool(item) {
  if (!item.disabled && item.path) {
    router.push(item.path)
  }
}
</script>

<template>
  <main class="online-tools-page">
    <div class="page-orbit orbit-one" aria-hidden="true"></div>
    <div class="page-orbit orbit-two" aria-hidden="true"></div>

    <div class="tools-shell">
      <section class="tools-intro" aria-labelledby="tools-title">
        <div class="intro-copy">
          <p class="eyebrow"><span></span> AI EXPLORATION PARK</p>
          <h1 id="tools-title">选择你的任务</h1>
          <p class="intro-description">动手试一试，从这里挑一个工具，开始你的创意实验。</p>
        </div>
        <div class="intro-doodles" aria-hidden="true">
          <span class="doodle-card idea-card">IDEA</span>
          <span class="doodle-card make-card">MAKE</span>
          <span class="orbit-line"></span>
          <span class="core-dot"></span>
          <span class="spark spark-one">+</span>
          <span class="spark spark-two">*</span>
          <span class="spark spark-three">+</span>
        </div>
      </section>

      <section class="tools-section" aria-labelledby="tool-list-title">
        <div class="section-heading">
          <div>
            <p>READY TO PLAY</p>
            <h2 id="tool-list-title">挑一个，马上开始</h2>
          </div>
          <span class="tool-count">{{ tools.length }} 个创意工坊</span>
        </div>

        <div class="tool-grid">
          <article
            v-for="item in tools"
            :key="item.title"
            class="tool-card"
            :class="[`tone-${item.tone}`, { 'is-disabled': item.disabled }]"
          >
            <div class="card-topline">
              <span class="tool-sticker">{{ item.sticker }}</span>
              <span v-if="item.disabled" class="coming-soon">即将开放</span>
              <span v-else class="card-spark" aria-hidden="true">+</span>
            </div>

            <div class="tool-icon" aria-hidden="true">
              <el-icon><component :is="item.icon" /></el-icon>
            </div>

            <div class="tool-copy">
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
            </div>

            <el-button
              class="tool-action"
              :class="{ 'is-locked': item.disabled }"
              :disabled="item.disabled"
              :aria-label="`${item.title}${item.disabled ? '即将开放' : item.action}`"
              @click="openTool(item)"
            >
              {{ item.action }}
              <span v-if="!item.disabled" class="action-arrow" aria-hidden="true">→</span>
            </el-button>
          </article>
        </div>
      </section>
    </div>

    <div class="floating-help" aria-hidden="true">
      <el-icon><Tools /></el-icon>
    </div>
  </main>
</template>

<style scoped>
.online-tools-page {
  --ink: #3d3564;
  --purple: #8178cf;
  --pink: #ee91bb;
  --mint: #9de4eb;
  --mint-deep: #52bbc4;
  --yellow: #fff1a8;
  --paper: #fbfbff;
  position: relative;
  min-height: 100%;
  overflow: hidden;
  padding: 34px clamp(18px, 5vw, 80px) 70px;
  background-color: var(--paper);
  background-image:
    linear-gradient(90deg, rgb(129 120 207 / 5%) 1px, transparent 1px),
    linear-gradient(rgb(238 145 187 / 5%) 1px, transparent 1px);
  background-size: 32px 32px;
  color: var(--ink);
  font-family: 'Microsoft YaHei', Arial, sans-serif;
}

.tools-shell {
  position: relative;
  z-index: 1;
  width: min(100%, 1500px);
  margin: 0 auto;
}

.tools-intro {
  position: relative;
  display: flex;
  min-height: 210px;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  padding: 22px clamp(6px, 3vw, 40px) 28px;
  border-bottom: 2px solid rgb(61 53 100 / 32%);
}

.intro-copy {
  position: relative;
  z-index: 2;
  max-width: 700px;
}

.eyebrow,
.section-heading p {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #766b9e;
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1.4px;
}

.eyebrow span {
  width: 10px;
  height: 10px;
  border: 1px solid var(--ink);
  border-radius: 50%;
  background: var(--yellow);
  box-shadow: 2px 2px 0 rgb(61 53 100 / 28%);
}

.tools-intro h1 {
  margin: 14px 0 0;
  color: var(--ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: clamp(42px, 5.2vw, 64px);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.08;
  text-shadow: 2px 2px 0 rgb(255 255 255 / 78%);
}

.intro-description {
  margin: 15px 0 0;
  color: #615783;
  font-size: 16px;
  font-weight: 650;
  line-height: 1.75;
}

.intro-doodles {
  position: relative;
  width: min(31vw, 370px);
  min-width: 285px;
  height: 166px;
  flex: 0 0 auto;
}

.doodle-card {
  position: absolute;
  z-index: 2;
  display: grid;
  place-items: center;
  border: 2px solid var(--ink);
  border-radius: 6px;
  color: var(--ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 16px;
  font-weight: 900;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 28%);
}

.idea-card {
  top: 4px;
  right: 49px;
  width: 88px;
  height: 46px;
  background: var(--yellow);
  transform: rotate(-7deg);
}

.make-card {
  bottom: 8px;
  left: 38px;
  width: 96px;
  height: 47px;
  background: var(--pink);
  color: #fff;
  transform: rotate(6deg);
  animation: float-card 7s ease-in-out infinite;
}

.orbit-line {
  position: absolute;
  top: 18px;
  right: 6px;
  width: 236px;
  height: 124px;
  border: 2px dashed rgb(61 53 100 / 48%);
  border-radius: 50%;
  transform: rotate(-18deg);
  animation: slow-orbit 15s linear infinite;
}

.core-dot {
  position: absolute;
  right: 96px;
  bottom: 47px;
  width: 59px;
  height: 59px;
  border: 2px solid var(--ink);
  border-radius: 50%;
  background: var(--mint);
  box-shadow: 4px 5px 0 rgb(61 53 100 / 22%);
}

.spark {
  position: absolute;
  z-index: 3;
  color: var(--ink);
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 31px;
  font-weight: 900;
  line-height: 1;
  animation: sparkle 5s ease-in-out infinite;
}

.spark-one { top: 26px; left: 43px; color: var(--mint-deep); }
.spark-two { right: 4px; bottom: 22px; color: var(--pink); animation-delay: -2s; }
.spark-three { top: 68px; right: 111px; color: #e6a90d; animation-delay: -3.5s; }

.tools-section {
  padding-top: 31px;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.section-heading h2 {
  margin: 7px 0 0;
  color: var(--ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: clamp(23px, 2.2vw, 29px);
  font-weight: 900;
  letter-spacing: 0;
}

.tool-count {
  flex: 0 0 auto;
  padding: 6px 9px;
  border: 1px solid rgb(61 53 100 / 58%);
  border-radius: 4px;
  background: #fff;
  box-shadow: 2px 3px 0 rgb(61 53 100 / 18%);
  color: #655a84;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  transform: rotate(1.5deg);
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(18px, 2vw, 30px);
  padding-top: 22px;
}

.tool-card {
  --card-soft: #efedff;
  --card-accent: var(--purple);
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 350px;
  flex-direction: column;
  overflow: hidden;
  padding: 19px 20px 20px;
  border: 2px solid var(--ink);
  border-radius: 8px;
  background: linear-gradient(143deg, #fff 0%, var(--card-soft) 140%);
  box-shadow: 5px 6px 0 rgb(61 53 100 / 70%);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tool-card::after {
  position: absolute;
  right: -35px;
  bottom: -39px;
  width: 124px;
  height: 124px;
  border: 2px solid rgb(61 53 100 / 16%);
  border-radius: 43% 57% 62% 38% / 42% 42% 58% 58%;
  content: '';
  transform: rotate(18deg);
}

.tool-card:hover {
  transform: translate(-3px, -4px) rotate(-0.35deg);
  box-shadow: 8px 10px 0 rgb(61 53 100 / 76%);
}

.tone-mint { --card-soft: #e3f9f8; --card-accent: var(--mint-deep); }
.tone-yellow { --card-soft: #fff8d3; --card-accent: #dfa62b; }

.card-topline {
  display: flex;
  min-height: 28px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.tool-sticker,
.coming-soon {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 5px 7px 4px;
  border: 1px solid var(--ink);
  border-radius: 4px;
  color: var(--ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.7px;
  line-height: 1;
  white-space: nowrap;
}

.tool-sticker {
  background: var(--yellow);
  box-shadow: 2px 2px 0 rgb(61 53 100 / 28%);
  transform: rotate(-3deg);
}

.coming-soon {
  background: #fff;
  color: #766b9e;
}

.card-spark {
  color: var(--card-accent);
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 25px;
  font-weight: 900;
  line-height: 0.8;
}

.tool-icon {
  position: relative;
  z-index: 1;
  display: grid;
  width: 78px;
  height: 78px;
  margin-top: 24px;
  place-items: center;
  border: 2px solid var(--ink);
  border-radius: 8px;
  background: #fff;
  box-shadow: 4px 5px 0 rgb(61 53 100 / 18%);
  color: var(--card-accent);
}

.tool-icon::before {
  position: absolute;
  z-index: -1;
  width: 47px;
  height: 47px;
  border-radius: 50%;
  background: var(--card-soft);
  content: '';
  transform: translate(32px, 30px);
}

.tool-icon .el-icon {
  font-size: 37px;
}

.tool-copy {
  position: relative;
  z-index: 1;
  padding-top: 23px;
}

.tool-copy h3,
.tool-copy p {
  margin: 0;
}

.tool-copy h3 {
  overflow: hidden;
  color: var(--ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.28;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-copy p {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 10px;
  color: #655a82;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.75;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.tool-action {
  position: relative;
  z-index: 1;
  display: inline-flex;
  width: 100%;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: auto;
  border: 1px solid #4e4473 !important;
  border-radius: 5px !important;
  background: var(--purple) !important;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 28%);
  color: #fff !important;
  font-weight: 800;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  white-space: nowrap;
  word-break: keep-all;
}

.tool-action:hover:not(.is-disabled),
.tool-action:focus-visible:not(.is-disabled) {
  transform: translate(-2px, -3px);
  box-shadow: 5px 7px 0 rgb(61 53 100 / 34%);
  outline: 2px solid var(--pink);
  outline-offset: 3px;
}

.action-arrow {
  font-size: 19px;
  line-height: 1;
}

.tool-card.is-disabled {
  background: linear-gradient(143deg, #fffef8 0%, var(--card-soft) 140%);
  box-shadow: 4px 5px 0 rgb(61 53 100 / 40%);
}

.tool-card.is-disabled:hover {
  transform: none;
  box-shadow: 4px 5px 0 rgb(61 53 100 / 40%);
}

.tool-action.is-locked,
.tool-action.is-locked.is-disabled {
  border-color: rgb(61 53 100 / 36%) !important;
  background: #e8e4ef !important;
  box-shadow: none;
  color: #8a819d !important;
}

.tool-action.is-locked:disabled {
  cursor: not-allowed;
}

.floating-help {
  position: fixed;
  z-index: 3;
  right: 26px;
  bottom: 26px;
  display: grid;
  width: 45px;
  height: 45px;
  place-items: center;
  border: 1px solid var(--ink);
  border-radius: 50%;
  background: var(--yellow);
  box-shadow: 3px 4px 0 rgb(61 53 100 / 28%);
  color: var(--ink);
}

.floating-help .el-icon { font-size: 21px; }

.page-orbit {
  position: absolute;
  z-index: 0;
  border: 2px solid rgb(129 120 207 / 12%);
  border-radius: 50%;
  pointer-events: none;
}

.orbit-one {
  top: 236px;
  left: -157px;
  width: 370px;
  height: 158px;
  transform: rotate(18deg);
}

.orbit-two {
  right: -166px;
  bottom: 42px;
  width: 382px;
  height: 198px;
  border-color: rgb(238 145 187 / 16%);
  transform: rotate(-20deg);
}

@keyframes slow-orbit {
  from { transform: rotate(-18deg); }
  to { transform: rotate(342deg); }
}

@keyframes float-card {
  0%, 100% { transform: translateY(0) rotate(6deg); }
  50% { transform: translateY(-7px) rotate(4deg); }
}

@keyframes sparkle {
  0%, 100% { opacity: 0.55; transform: scale(0.85) rotate(0deg); }
  50% { opacity: 1; transform: scale(1.12) rotate(12deg); }
}

@media (max-width: 1020px) {
  .tools-intro { min-height: 185px; }
  .intro-doodles { width: 270px; min-width: 270px; transform: scale(0.85); transform-origin: right center; }
  .tool-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 680px) {
  .online-tools-page { min-height: auto; padding: 24px 16px 52px; }
  .tools-intro { min-height: 260px; align-items: flex-start; padding: 8px 5px 26px; }
  .tools-intro h1 { font-size: 42px; }
  .intro-description { max-width: 280px; font-size: 14px; }
  .intro-doodles { position: absolute; right: -35px; bottom: -19px; opacity: 0.58; transform: scale(0.67); transform-origin: right bottom; }
  .tools-section { padding-top: 24px; }
  .section-heading { align-items: flex-start; flex-direction: column; }
  .tool-count { margin-left: 3px; }
  .tool-grid { grid-template-columns: 1fr; gap: 22px; }
  .tool-card { min-height: 320px; }
  .floating-help { right: 16px; bottom: 16px; width: 42px; height: 42px; }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}
</style>
