<script setup>
import { ArrowRight, Calendar, Check, Document, EditPen, Flag, FolderOpened, Notebook, Timer } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const modules = [
  { title: '考公资讯与公告', detail: '浏览招考公告、政策解读和备考资讯。', route: 'gov-news', icon: Document, tone: 'blue' },
  { title: '知识点学习', detail: '按行测六科查看章节和知识点。', route: 'gov-knowledge', icon: Notebook, tone: 'green' },
  { title: '智能题库与每日练习', detail: '进行专项练习、每日一练和错题重做。', route: 'gov-practice', icon: EditPen, tone: 'orange' },
  { title: '模拟考试与测评', detail: '预留试卷、计时和成绩分析入口。', route: 'gov-assessment', icon: Timer, tone: 'purple' },
  { title: '考公资料下载', detail: '按分类访问管理员维护的网盘资料。', route: 'gov-materials', icon: FolderOpened, tone: 'red' },
]

function openModule(route) {
  router.push({ name: route })
}
</script>

<template>
  <main class="gov-home-page">
    <section class="gov-home-shell">
      <header class="gov-home-header">
        <div>
          <p class="eyebrow">GOVERNMENT EXAM</p>
          <h1>考公专题</h1>
          <p>把公告、知识、练习和备考资料放在一个入口。</p>
        </div>
        <div class="header-mark"><el-icon><Flag /></el-icon></div>
      </header>

      <section class="goal-strip" aria-label="目标与学习计划">
        <div class="goal-icon"><el-icon><Calendar /></el-icon></div>
        <div class="goal-copy">
          <span>当前目标与学习便签</span>
          <strong>目标中心占位</strong>
          <small>设置一个目标考试，并记录“完成10道题”这类简单任务。</small>
        </div>
        <el-button type="primary" plain disabled>后续接入</el-button>
      </section>

      <div class="module-grid">
        <button
          v-for="item in modules"
          :key="item.route"
          class="module-card"
          type="button"
          @click="openModule(item.route)"
        >
          <span class="module-card-icon" :class="`tone-${item.tone}`"><el-icon><component :is="item.icon" /></el-icon></span>
          <span class="module-card-copy">
            <strong>{{ item.title }}</strong>
            <small>{{ item.detail }}</small>
          </span>
          <el-icon class="module-card-arrow"><ArrowRight /></el-icon>
        </button>
      </div>

      <button class="deferred-panel" type="button" @click="openModule('gov-assessment')">
        <div class="deferred-icon"><el-icon><Timer /></el-icon></div>
        <div>
          <strong>模拟考试与测评</strong>
          <span>本期暂不建设试卷和限时考试，后续按独立需求设计。</span>
        </div>
        <el-icon class="deferred-check"><Check /></el-icon>
      </button>

      <footer>Edu-F · 公考学习专题</footer>
    </section>
  </main>
</template>

<style scoped>
.gov-home-page { min-height: 100%; padding: 34px; background: #f5f7fb; color: #1f2937; }
.gov-home-shell { width: min(1120px, 100%); min-height: calc(100vh - 132px); margin: 0 auto; padding: 48px 54px 26px; border: 1px solid #e3e8f1; border-radius: 12px; background: #fff; box-shadow: 0 18px 45px rgb(28 45 76 / 9%); }
.gov-home-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.eyebrow { margin: 0; color: #2f80ed; font-size: 12px; font-weight: 800; letter-spacing: .08em; }
h1 { margin: 10px 0 0; color: #172033; font-size: clamp(32px, 5vw, 48px); line-height: 1.1; }
.gov-home-header p:last-child { margin: 14px 0 0; color: #718096; font-size: 15px; }
.header-mark { display: grid; width: 70px; height: 70px; place-items: center; border-radius: 16px; background: #eaf3ff; color: #2f80ed; }
.header-mark .el-icon { font-size: 34px; }
.goal-strip { display: flex; align-items: center; gap: 14px; margin-top: 44px; padding: 17px 18px; border: 1px solid #dfe8f5; border-radius: 8px; background: #f8fbff; }
.goal-icon { display: grid; width: 36px; height: 36px; flex: 0 0 auto; place-items: center; border-radius: 9px; background: #e7f0ff; color: #2f80ed; }
.goal-copy { min-width: 0; flex: 1; }
.goal-copy span, .goal-copy strong, .goal-copy small { display: block; }
.goal-copy span { color: #7b879a; font-size: 11px; font-weight: 800; }
.goal-copy strong { margin-top: 3px; color: #27354a; font-size: 15px; }
.goal-copy small { margin-top: 4px; overflow: hidden; color: #7b879a; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.module-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; margin-top: 18px; }
.module-card { display: flex; min-height: 112px; align-items: center; gap: 14px; padding: 18px; border: 1px solid #e6ebf2; border-radius: 8px; background: #fff; color: inherit; cursor: pointer; text-align: left; transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease; }
.module-card:hover, .module-card:focus-visible { border-color: #bcd5f4; box-shadow: 0 8px 18px rgb(31 74 125 / 9%); outline: none; transform: translateY(-1px); }
.module-card-icon { display: grid; width: 42px; height: 42px; flex: 0 0 auto; place-items: center; border-radius: 10px; }
.module-card-icon .el-icon { font-size: 22px; }
.tone-blue { background: #eaf3ff; color: #2f80ed; } .tone-green { background: #e9f8f0; color: #18a66a; } .tone-orange { background: #fff4e5; color: #d8891e; } .tone-purple { background: #f1edff; color: #7258d8; } .tone-red { background: #fff0f0; color: #d15b5b; }
.module-card-copy { min-width: 0; flex: 1; }
.module-card-copy strong, .module-card-copy small { display: block; }
.module-card-copy strong { color: #27354a; font-size: 14px; }
.module-card-copy small { margin-top: 7px; color: #7b879a; font-size: 12px; line-height: 1.5; }
.module-card-arrow { color: #a0acbd; }
.deferred-panel { display: flex; width: 100%; align-items: center; gap: 12px; margin-top: 25px; padding: 14px 16px; border: 1px dashed #d8dee8; border-radius: 8px; background: #fbfcfe; color: inherit; cursor: pointer; text-align: left; }
.deferred-panel:hover, .deferred-panel:focus-visible { border-color: #c8b9f4; background: #faf8ff; outline: none; }
.deferred-icon { display: grid; width: 32px; height: 32px; flex: 0 0 auto; place-items: center; border-radius: 50%; background: #f0f2f6; color: #8793a5; }
.deferred-panel strong, .deferred-panel span { display: block; }
.deferred-panel strong { color: #5d6a7e; font-size: 13px; }
.deferred-panel span { margin-top: 3px; color: #8b96a7; font-size: 12px; }
.deferred-check { margin-left: auto; color: #aab4c3; }
footer { margin-top: 45px; color: #a0aaba; font-size: 12px; text-align: center; }
@media (max-width: 700px) { .gov-home-page { padding: 14px; } .gov-home-shell { min-height: calc(100vh - 92px); padding: 34px 20px 22px; } .header-mark { width: 54px; height: 54px; } .header-mark .el-icon { font-size: 27px; } .goal-strip { align-items: flex-start; flex-wrap: wrap; } .goal-strip .el-button { width: 100%; margin-left: 50px; } .module-grid { grid-template-columns: 1fr; } footer { margin-top: 32px; } }
</style>
