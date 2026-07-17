<script setup>
import { Cpu, MagicStick, Tools } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const tools = [
  {
    title: 'Python工坊',
    description:
      '一站式云端Python IDE环境，支持项目开发全流程，包括在线代码编程、运行、调试、可视化结果输出、版本管理等，提供代码自动补全、可视化依赖包管理、在线运行环境管理等。',
    path: '/tools/python',
    icon: Cpu,
    accent: '#5140c8',
  },
  {
    title: '人工智能工坊',
    description: '预留人工智能工坊入口，后续用于接入AI创作、训练、推理与项目实践能力。',
    path: '/tools/ai',
    icon: MagicStick,
    accent: '#ff744d',
  },
]

function openTool(path) {
  router.push(path)
}
</script>

<template>
  <main class="online-tools-page">
    <section class="tools-banner" aria-label="在线工具横幅">
      <div class="banner-copy">
        <p>Online Tools</p>
        <h1>在线工具</h1>
        <span>选择工坊，进入云端实践环境</span>
      </div>
    </section>

    <section class="tools-panel">
      <div class="tool-list">
        <article v-for="item in tools" :key="item.path" class="tool-entry">
          <div class="tool-copy">
            <h2>{{ item.title }}</h2>
            <p>{{ item.description }}</p>
            <el-button type="primary" @click="openTool(item.path)">进入工坊</el-button>
          </div>

          <button class="tool-preview" type="button" @click="openTool(item.path)">
            <span class="preview-icon" :style="{ color: item.accent }">
              <el-icon>
                <component :is="item.icon" />
              </el-icon>
            </span>
            <strong>{{ item.title }}</strong>
          </button>
        </article>
      </div>
    </section>

    <div class="floating-help" aria-hidden="true">
      <el-icon><Tools /></el-icon>
    </div>
  </main>
</template>

<style scoped>
.online-tools-page {
  min-height: 100%;
  background: #eef4ff;
  color: #1f2937;
}

.tools-banner {
  position: relative;
  display: flex;
  min-height: 260px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 24% 45%, rgb(45 212 191 / 28%), transparent 26%),
    linear-gradient(120deg, #2446ff 0%, #128ff3 52%, #25d7ef 100%);
}

.tools-banner::before {
  width: min(980px, 86%);
  height: 164px;
  border: 1px solid rgb(255 255 255 / 26%);
  border-radius: 8px;
  background: rgb(255 255 255 / 10%);
  content: '';
}

.banner-copy {
  position: absolute;
  z-index: 1;
  text-align: center;
  color: #ffffff;
}

.banner-copy p,
.banner-copy h1,
.banner-copy span,
.tool-copy h2,
.tool-copy p {
  margin: 0;
}

.banner-copy p {
  font-size: 14px;
  font-weight: 700;
}

.banner-copy h1 {
  margin-top: 8px;
  font-size: 42px;
  line-height: 1.15;
}

.banner-copy span {
  display: block;
  margin-top: 12px;
  font-size: 18px;
}

.tools-panel {
  width: min(1220px, calc(100% - 48px));
  margin: -54px auto 40px;
  overflow: hidden;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 22px 54px rgb(37 70 255 / 13%);
}

.tool-list {
  display: grid;
  gap: 36px;
  padding: 64px;
}

.tool-entry {
  display: grid;
  grid-template-columns: minmax(0, 0.86fr) minmax(360px, 1fr);
  gap: 56px;
  align-items: center;
}

.tool-copy h2 {
  color: #243044;
  font-size: 38px;
  line-height: 1.2;
}

.tool-copy p {
  margin-top: 24px;
  color: #7a8797;
  font-size: 17px;
  line-height: 1.9;
}

.tool-copy .el-button {
  min-width: 132px;
  margin-top: 32px;
  border-color: #5140c8;
  background: #5140c8;
  font-weight: 700;
}

.tool-preview {
  display: grid;
  min-height: 292px;
  place-items: center;
  gap: 14px;
  border: 0;
  border-radius: 8px;
  background: #e6f1ff;
  color: #334155;
  cursor: pointer;
  font: inherit;
}

.tool-preview:hover,
.tool-preview:focus-visible {
  box-shadow: inset 0 0 0 2px rgb(81 64 200 / 30%);
  outline: none;
}

.preview-icon {
  display: grid;
  width: 94px;
  height: 94px;
  place-items: center;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 16px 30px rgb(37 70 255 / 12%);
}

.preview-icon .el-icon {
  font-size: 46px;
}

.tool-preview strong {
  font-size: 20px;
}

.floating-help {
  position: fixed;
  right: 28px;
  bottom: 28px;
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 50%;
  background: #ffffff;
  color: #8b7ff0;
  box-shadow: 0 12px 28px rgb(37 70 255 / 14%);
}

@media (max-width: 900px) {
  .tools-panel {
    width: min(100% - 28px, 1220px);
  }

  .tool-list {
    padding: 32px;
  }

  .tool-entry {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .tool-copy h2 {
    font-size: 30px;
  }
}

@media (max-width: 640px) {
  .tools-banner {
    min-height: 220px;
  }

  .banner-copy h1 {
    font-size: 34px;
  }

  .tool-list {
    padding: 24px;
  }

  .tool-preview {
    min-height: 220px;
  }
}
</style>
