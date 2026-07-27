<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Back, Cpu, MagicStick } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const toolInfo = computed(() => {
  if (route.meta.toolType === 'ai') {
    return {
      title: '人工智能工坊',
      subtitle: '接口已预留，后续接入AI项目实践能力。',
      icon: MagicStick,
      accent: '#ff744d',
    }
  }

  return {
    title: 'Python工坊',
    subtitle: '云端Python IDE环境占位页，后续接入在线编程、运行、调试等能力。',
    icon: Cpu,
    accent: '#5140c8',
  }
})

function goBack() {
  router.push('/tools')
}
</script>

<template>
  <main class="placeholder-page">
    <section class="placeholder-panel">
      <button class="back-button" type="button" @click="goBack">
        <el-icon><Back /></el-icon>
        <span>返回在线工具</span>
      </button>

      <div class="placeholder-content">
        <span class="tool-icon" :style="{ color: toolInfo.accent }">
          <el-icon>
            <component :is="toolInfo.icon" />
          </el-icon>
        </span>
        <p>Online Tool</p>
        <h1>{{ toolInfo.title }}</h1>
        <span>{{ toolInfo.subtitle }}</span>
      </div>
    </section>
  </main>
</template>

<style scoped>
.placeholder-page {
  min-height: 100%;
  padding: 40px;
  background: #eef4ff;
  color: #1f2937;
}

.placeholder-panel {
  display: grid;
  min-height: calc(100vh - 144px);
  width: min(1120px, 100%);
  margin: 0 auto;
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgb(81 64 200 / 8%), rgb(37 215 239 / 12%)),
    #ffffff;
  box-shadow: 0 22px 54px rgb(37 70 255 / 12%);
}

.back-button {
  align-self: start;
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 28px;
  border: 0;
  background: transparent;
  color: #5140c8;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.back-button:hover,
.back-button:focus-visible {
  color: #3426a8;
  outline: none;
}

.placeholder-content {
  align-self: center;
  justify-self: center;
  max-width: 620px;
  padding: 0 28px 80px;
  text-align: center;
}

.tool-icon {
  display: inline-grid;
  width: 104px;
  height: 104px;
  place-items: center;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 16px 30px rgb(37 70 255 / 12%);
}

.tool-icon .el-icon {
  font-size: 52px;
}

.placeholder-content p,
.placeholder-content h1,
.placeholder-content span {
  margin: 0;
}

.placeholder-content p {
  margin-top: 28px;
  color: #5140c8;
  font-size: 14px;
  font-weight: 800;
}

.placeholder-content h1 {
  margin-top: 10px;
  color: #243044;
  font-size: 42px;
  line-height: 1.2;
}

.placeholder-content span {
  display: block;
  margin-top: 18px;
  color: #728094;
  font-size: 17px;
  line-height: 1.8;
}

@media (max-width: 640px) {
  .placeholder-page {
    padding: 18px;
  }

  .placeholder-panel {
    min-height: calc(100vh - 100px);
  }

  .placeholder-content h1 {
    font-size: 34px;
  }
}
</style>
