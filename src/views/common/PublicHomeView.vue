<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowRight, Location, Message, Plus } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import ballThrow from '@/assets/home/ball_throw.png'
import drawing from '@/assets/home/drawing.png'
import potHeating from '@/assets/home/pot_heating.png'
import scheduleLogo from '@/assets/home/scheduleLogo.png'

const tags = ['计算机视觉', '自然语言处理', '语音识别', '推荐系统', '机器学习', '深度学习']

const steps = [
  { number: '01', title: '认识', desc: '走近智能生活' },
  { number: '02', title: '体验', desc: '开启科技探索' },
  { number: '03', title: '训练', desc: '构建模型艺术' },
  { number: '04', title: '创作', desc: '释放无限想象' },
]

const courseStages = [
  {
    label: '小学课程',
    title: '基础型课程',
    subtitle: '适合小学学段',
    image: ballThrow,
    badgeClass: 'gold',
    items: [
      { hours: '4课时', text: '“家乡植物资源” 大调查-AIGC...' },
      { hours: '4课时', text: '一起来玩 “玉兔闯关”' },
      { hours: '5课时', text: '设计智能翻译机' },
      { hours: '6课时', text: '设计家用智能预防近视仪' },
    ],
  },
  {
    label: '初中课程',
    title: '探究型课程',
    subtitle: '适合初中学段',
    image: drawing,
    badgeClass: 'rose',
    items: [
      { hours: '6课时', text: 'AI助力野生动物守护' },
      { hours: '4课时', text: '人工智能预测出行' },
      { hours: '4课时', text: '“人以群分” 网购用户的画像...' },
    ],
  },
  {
    label: '高中课程',
    title: '拓展型课程',
    subtitle: '适合高中学段',
    image: potHeating,
    badgeClass: 'blue',
    items: [
      { hours: '6课时', text: '顾客买帽智能荐' },
      { hours: '6课时', text: '体育器材室（足球、篮球）自...' },
    ],
  },
]

const activeCourseIndex = ref(0)

const bannerCarousel = ref()
const activeBannerIndex = ref(0)
const router = useRouter()
const userStore = useUserStore()

function handleBannerChange(index) {
  activeBannerIndex.value = index
}

function setBanner(index) {
  bannerCarousel.value?.setActiveItem(index)
}

function setActiveCourse(index) {
  activeCourseIndex.value = index
}

function goRegister() {
  router.push('/register')
}

function goCourses() {
  router.push('/main/courses')
}

function goTeacherPage(path) {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('您还未登录，请先登录。')
    router.push('/login')
    return
  }

  if (!userStore.hasAnyRole(['TEACHER'])) {
    ElMessage.warning('抱歉，您不是老师，无法创建！')
    return
  }

  router.push(path)
}
</script>

<template>
  <main class="home-page">
    <section class="hero-section">
      <div class="hero-inner">
        <div class="hero-copy">
          <p class="hero-kicker">拥抱AI，我们在路上</p>
          <h1>AI教育·向光而行</h1>
          <p class="topic-title">热门人工智能 <strong>学习方向</strong></p>
          <div class="tag-grid" aria-label="人工智能学习方向">
            <span v-for="tag in tags" :key="tag">{{ tag }}</span>
          </div>
        </div>

        <div class="hero-main">
          <div class="banner-carousel" aria-label="首页轮播图">
            <el-carousel
              ref="bannerCarousel"
              height="clamp(300px, 36vh, 382px)"
              :interval="4000"
              arrow="never"
              indicator-position="none"
              @change="handleBannerChange"
            >
              <el-carousel-item>
                <div class="activity-card" aria-label="人工智能创新实践活动">
                  <div class="robot-face" aria-hidden="true">
                    <span></span>
                  </div>
                  <i class="spark spark-left"></i>
                  <i class="spark spark-top"></i>
                  <i class="spark spark-right"></i>
                  <i class="spark spark-bottom"></i>
                  <div class="brain-icon" aria-hidden="true"></div>
                  <div class="hand-icon" aria-hidden="true"></div>
                  <h2>Edu-F AI 教育平台全新上线！</h2>
                  <button type="button" @click="goRegister">欢迎加入</button>
                </div>
              </el-carousel-item>

              <el-carousel-item>
                <a class="banner-link" href="https://migo.intern-ai.org.cn/" aria-label="打开 Migo 觅果官网" target="_blank">
                  <div class="migo-card" aria-label="觅果 AI 教育工具展示">
                    <div class="migo-copy">
                      <div class="migo-logo">Migo·觅果</div>
                      <span>intern</span>
                      <p>具备学术解读、深度思考、知识库能力的 AI 科研教育工具</p>
                    </div>
                    <div class="mascot" aria-hidden="true">
                      <span class="mascot-hi">Hi</span>
                      <span class="mascot-eye"></span>
                      <span class="mascot-smile"></span>
                    </div>
                  </div>
                </a>
              </el-carousel-item>

              <el-carousel-item>
                <div class="notice-card" aria-label="平台公告">
                  <div class="notice-grid" aria-hidden="true"></div>
                  <div class="notice-content">
                    <h2><span>📣</span> 公 告</h2>
                    <p>尊敬的各位用户：</p>
                    <p>
                      感谢大家一直以来对于Edu-F AI 教育平台的厚爱。Edu-F AI 教育平台是面向人工智能教育打造的开放学习公益平台，
                      我们将持续优化平台体验，保障课程学习、知识实践与教学管理等功能稳定运行。
                    </p>
                    <p>
                      针对近期平台服务能力调整，我们会优先保障已有课程与学习功能的正常使用。若您有更多反馈和建议，欢迎第一时间联系我们。
                    </p>
                    <p class="notice-sign">Edu-F AI 教育平台　2026年7月</p>
                  </div>
                </div>
              </el-carousel-item>
            </el-carousel>

            <div class="banner-dots" aria-label="轮播图切换">
              <button
                v-for="index in 3"
                :key="index"
                type="button"
                :class="{ active: activeBannerIndex === index - 1 }"
                :aria-label="`切换到第${index}张轮播图`"
                @click="setBanner(index - 1)"
              ></button>
            </div>
          </div>

          <div class="intro-row">
            <h2>初识人工智能</h2>
            <p>新手必看，四步教你玩转AI</p>
          </div>
          <div class="step-grid">
            <article v-for="step in steps" :key="step.number" class="step-card">
              <span>{{ step.number }}</span>
              <h3>{{ step.title }}</h3>
              <p>{{ step.desc }}</p>
            </article>
          </div>
        </div>
      </div>

      <div class="floating-actions" aria-hidden="true">
        <div class="gift-box">邀请<br />有礼</div>
        <div class="mini-action">?</div>
      </div>
    </section>

    <section class="course-section">
      <div class="course-copy">
        <h2>海量课程资源<br />轻松开启AI<br />教学之旅</h2>
        <button type="button" class="more-button" @click="goCourses">
          <el-icon><ArrowRight /></el-icon>
          查看更多课程
        </button>
      </div>

      <div class="course-cards">
        <article
          v-for="(stage, index) in courseStages"
          :key="stage.label"
          :class="['stage-card', stage.badgeClass, { active: activeCourseIndex === index }]"
          role="button"
          tabindex="0"
          :aria-pressed="activeCourseIndex === index"
          @mouseenter="setActiveCourse(index)"
          @focus="setActiveCourse(index)"
          @click="setActiveCourse(index)"
          @keydown.enter.prevent="setActiveCourse(index)"
          @keydown.space.prevent="setActiveCourse(index)"
        >
          <div class="stage-shell">
            <Transition name="stage-fade" mode="out-in">
              <div v-if="activeCourseIndex === index" key="detail" class="stage-detail">
                <div class="stage-copy">
                  <h3>{{ stage.title }}</h3>
                  <p>{{ stage.subtitle }}</p>
                  <ul>
                    <li v-for="item in stage.items" :key="item.text">
                      <span>{{ item.hours }}</span>{{ item.text }}
                    </li>
                  </ul>
                </div>
                <div class="stage-figure" aria-hidden="true">
                  <img class="stage-image" :src="stage.image" alt="" />
                </div>
              </div>
              <div v-else key="summary" class="stage-summary">
                <h3>{{ stage.label }}</h3>
                <p>{{ stage.subtitle }}</p>
                <span class="stage-arrow" aria-hidden="true">
                  <el-icon><ArrowRight /></el-icon>
                </span>
              </div>
            </Transition>
          </div>
        </article>
      </div>
    </section>

    <section class="teacher-section">
      <div class="teacher-title">
        <p>成为授课老师</p>
        <h2>创建我的班级<br />并开设课程</h2>
      </div>
      <div class="teacher-feature">
        <h3>班群管理</h3>
        <p>创建我的班级，管理我的学生<br />实现班级授课、学习进度管理等</p>
        <button type="button" @click="goTeacherPage('/main/teacher/classes')">
          <el-icon><Plus /></el-icon>
          创建班级
        </button>
      </div>
      <div class="teacher-feature">
        <h3>教师开课</h3>
        <p>多样课程，让研发与发布课程更快速<br />让教学研讨、课程学习更便捷</p>
        <button type="button" @click="goTeacherPage('/main/teacher/courses')">
          <el-icon><Plus /></el-icon>
          开设课程
        </button>
      </div>
      <div class="teacher-figure" aria-hidden="true">
        <img class="teacher-image" :src="scheduleLogo" alt="" />
      </div>
    </section>

    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <div class="footer-logo"><span>Edu-F</span> AI教育</div>
          <p>服务协议 | 个人信息保护政策 | 儿童个人信息保护政策</p>
          <p>Copyright © 2026 Edu-F AI 教育平台</p>
        </div>

        <div class="footer-contact">
          <h2>联系我们</h2>
          <p>
            <el-icon><Location /></el-icon>
            齐鲁工业大学 AI Edu
          </p>
          <p>
            <el-icon><Message /></el-icon>
            contact@edu-f.ai
          </p>
        </div>
      </div>
    </footer>
  </main>
</template>

<style scoped>
.home-page {
  min-height: 100%;
  overflow-x: hidden;
  background: #f6f8ff;
  color: #111024;
}

h1,
h2,
h3,
p {
  margin: 0;
}

button {
  font: inherit;
}

.hero-section {
  position: relative;
  min-height: calc(100vh - 64px);
  padding: 48px clamp(28px, 6vw, 112px) 44px;
  background: linear-gradient(125deg, #e3e8ff 0%, #f7f9ff 36%, #eef3ff 100%);
}

.hero-inner {
  display: grid;
  width: min(1680px, 100%);
  min-height: calc(100vh - 156px);
  grid-template-columns: 0.88fr 1.6fr;
  gap: clamp(36px, 5vw, 70px);
  align-items: center;
  margin: 0 auto;
}

.hero-kicker {
  color: #6247e8;
  font-size: clamp(32px, 3vw, 48px);
  font-weight: 900;
  line-height: 1.2;
}

.hero-copy h1 {
  margin-top: 28px;
  color: #0d0b28;
  font-size: clamp(54px, 5.5vw, 84px);
  font-weight: 900;
  line-height: 1.05;
}

.topic-title {
  margin-top: 58px;
  color: #16162b;
  font-size: 26px;
}

.topic-title strong {
  margin-left: 10px;
  font-weight: 900;
}

.tag-grid {
  display: grid;
  max-width: 580px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 26px;
}

.tag-grid span {
  display: grid;
  min-height: 64px;
  place-items: center;
  border: 3px solid #8d80ff;
  border-radius: 32px;
  background: rgb(255 255 255 / 48%);
  color: #715cff;
  font-size: 20px;
  font-weight: 800;
}

.hero-main {
  min-width: 0;
}

.banner-carousel {
  position: relative;
}

.banner-link {
  display: block;
  height: 100%;
  color: inherit;
  text-decoration: none;
}

.banner-carousel :deep(.el-carousel),
.banner-carousel :deep(.el-carousel__container),
.banner-carousel :deep(.el-carousel__item) {
  border-radius: 28px;
}

.banner-carousel :deep(.el-carousel__item) {
  overflow: hidden;
  opacity: 0;
  filter: blur(14px) brightness(0.82);
  pointer-events: none;
  transform: translateX(0) scale(1.02) !important;
  transition:
    opacity 0.9s ease,
    filter 0.9s ease,
    transform 0.9s ease !important;
}

.banner-carousel :deep(.el-carousel__item.is-active) {
  z-index: 2;
  opacity: 1;
  filter: blur(0) brightness(1);
  pointer-events: auto;
  transform: translateX(0) scale(1) !important;
}

.banner-carousel :deep(.el-carousel__indicators) {
  display: none;
}

.banner-carousel :deep(.el-carousel__button) {
  display: none;
}

.banner-carousel :deep(.el-carousel__arrow) {
  display: none;
}

.banner-dots {
  position: absolute;
  top: 50%;
  right: 18px;
  z-index: 3;
  display: grid;
  gap: 12px;
  transform: translateY(-50%);
}

.banner-dots button {
  width: 14px;
  height: 14px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgb(255 255 255 / 42%);
  cursor: pointer;
}

.banner-dots button.active {
  background: #ffffff;
  box-shadow: 0 0 0 6px rgb(255 255 255 / 18%);
}

.migo-card {
  position: relative;
  min-height: clamp(300px, 36vh, 382px);
  overflow: hidden;
  border-radius: 28px;
  background: radial-gradient(circle at 10% 6%, #000 0 18%, transparent 30%), #100527;
  box-shadow: 0 28px 58px rgb(91 78 164 / 22%);
}

.migo-card::before {
  position: absolute;
  right: -96px;
  bottom: -122px;
  width: 500px;
  height: 430px;
  border-radius: 52% 48% 0 0;
  background: #ddff7d;
  content: '';
}

.migo-card::after {
  position: absolute;
  right: 294px;
  bottom: 54px;
  width: 100px;
  height: 116px;
  border-radius: 50% 42% 46% 50%;
  background: #ddff7d;
  content: '';
}

.migo-copy {
  position: relative;
  z-index: 1;
  width: min(580px, 70%);
  padding: 70px 74px;
  color: #ffffff;
}

.migo-logo {
  font-size: clamp(50px, 5vw, 76px);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1;
}

.migo-copy span {
  display: block;
  margin-top: 6px;
  font-size: 32px;
  font-weight: 700;
}

.migo-copy p {
  margin-top: 24px;
  color: #bdf0d8;
  font-size: clamp(22px, 2vw, 30px);
  font-weight: 800;
  line-height: 1.5;
}

.notice-card {
  position: relative;
  display: grid;
  min-height: clamp(300px, 36vh, 382px);
  overflow: hidden;
  border-radius: 28px;
  background: linear-gradient(180deg, #7f49f8 0%, #6d3cf3 100%);
}

.notice-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgb(255 255 255 / 4%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 4%) 1px, transparent 1px);
  background-size: 18px 18px;
}

.notice-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 30px 38px;
  color: #ffffff;
}

.notice-content h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  font-size: clamp(30px, 2.8vw, 46px);
  font-weight: 900;
}

.notice-content p {
  font-size: clamp(12px, 1.2vw, 16px);
  line-height: 1.8;
}

.notice-sign {
  margin-top: auto;
  text-align: right;
  font-weight: 700;
}

.activity-card {
  position: relative;
  display: flex;
  min-height: clamp(300px, 36vh, 382px);
  flex-direction: column;
  overflow: hidden;
  border-radius: 28px;
  background: linear-gradient(135deg, #4110ef 0%, #5a19f2 56%, #7f4cf5 100%);
  color: #ffffff;
}

.activity-card h2 {
  position: relative;
  z-index: 1;
  margin-top: 132px;
  padding: 0 64px;
  font-size: clamp(30px, 2.8vw, 48px);
  font-weight: 900;
  line-height: 1.35;
  text-align: center;
}

.activity-card button {
  position: relative;
  z-index: 1;
  align-self: center;
  min-width: 232px;
  height: 58px;
  margin-top: 36px;
  border: 0;
  border-radius: 29px;
  background: #fff35f;
  color: #4d2bbf;
  font-size: 20px;
  font-weight: 900;
}

.robot-face {
  position: absolute;
  top: 28px;
  left: 54px;
  width: 96px;
  height: 96px;
  border-radius: 18px;
  background: #f6f6ff;
  transform: rotate(-12deg);
}

.robot-face::before,
.robot-face::after,
.robot-face span {
  position: absolute;
  border-radius: 50%;
  content: '';
}

.robot-face::before {
  top: 24px;
  left: 18px;
  width: 20px;
  height: 20px;
  background: #251d7f;
}

.robot-face::after {
  top: 24px;
  right: 18px;
  width: 20px;
  height: 20px;
  background: #251d7f;
}

.robot-face span {
  bottom: 18px;
  left: 20px;
  width: 48px;
  height: 16px;
  border-bottom: 10px solid #251d7f;
  border-radius: 0 0 40px 40px;
}

.spark {
  position: absolute;
  width: 34px;
  height: 34px;
}

.spark::before,
.spark::after {
  position: absolute;
  inset: 0;
  background: #ffee5b;
  content: '';
}

.spark::before {
  width: 2px;
  left: 16px;
}

.spark::after {
  height: 2px;
  top: 16px;
}

.spark-left {
  top: 58px;
  left: 8px;
}

.spark-top {
  top: 22px;
  left: 238px;
}

.spark-right {
  top: 58px;
  right: 28px;
}

.spark-bottom {
  bottom: 100px;
  right: 146px;
}

.brain-icon {
  position: absolute;
  bottom: 20px;
  left: 36px;
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: #f4c0df;
  box-shadow: inset 0 0 0 6px #ffd8ee;
}

.brain-icon::before,
.brain-icon::after {
  position: absolute;
  border-radius: 50%;
  background: #ffd8ee;
  content: '';
}

.brain-icon::before {
  top: 14px;
  left: 10px;
  width: 22px;
  height: 22px;
  box-shadow: 18px 4px 0 #ffd8ee, 10px 24px 0 #ffd8ee, 28px 24px 0 #ffd8ee;
}

.brain-icon::after {
  top: 32px;
  left: 18px;
  width: 34px;
  height: 18px;
  border-radius: 18px 18px 12px 12px;
}

.hand-icon {
  position: absolute;
  right: 26px;
  bottom: 24px;
  width: 100px;
  height: 100px;
  border-radius: 28px;
  background: #fefefe;
  transform: rotate(28deg);
}

.hand-icon::before,
.hand-icon::after {
  position: absolute;
  bottom: 34px;
  background: #ff8c47;
  content: '';
}

.hand-icon::before {
  left: 20px;
  width: 22px;
  height: 56px;
  border-radius: 14px;
}

.hand-icon::after {
  left: 40px;
  width: 42px;
  height: 16px;
  border-radius: 12px;
  box-shadow: 18px -12px 0 #ff8c47, 36px -22px 0 #ff8c47;
}

.mascot {
  position: absolute;
  right: 120px;
  bottom: 58px;
  z-index: 1;
}

.mascot-hi {
  position: absolute;
  right: 100px;
  bottom: 150px;
  display: grid;
  width: 78px;
  height: 78px;
  place-items: center;
  border-radius: 50% 50% 46% 6%;
  background: #ddff7d;
  color: #0f0e1c;
  font-size: 34px;
  font-weight: 900;
  transform: rotate(-30deg);
}

.mascot-eye {
  position: absolute;
  right: -2px;
  bottom: 78px;
  width: 24px;
  height: 36px;
  border-radius: 50%;
  background: #02020a;
}

.mascot-smile {
  position: absolute;
  right: 44px;
  bottom: 26px;
  width: 72px;
  height: 54px;
  border-bottom: 14px solid #02020a;
  border-radius: 0 0 60px 60px;
}

.mascot-smile::before {
  position: absolute;
  top: -48px;
  left: 4px;
  width: 34px;
  height: 24px;
  border-right: 9px solid #02020a;
  border-bottom: 9px solid #02020a;
  content: '';
  transform: rotate(-36deg);
}

.slide-dots {
  position: absolute;
  top: 40%;
  right: 34px;
  z-index: 1;
  display: grid;
  gap: 16px;
}

.slide-dots i {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgb(255 255 255 / 55%);
}

.intro-row {
  display: flex;
  align-items: baseline;
  gap: 24px;
  margin-top: 46px;
}

.intro-row h2 {
  color: #0e0d28;
  font-size: 34px;
  font-weight: 900;
}

.intro-row p {
  color: #111024;
  font-size: 24px;
}

.step-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-top: 26px;
}

.step-card {
  min-height: 224px;
  padding: 32px;
  border-radius: 28px;
  background: radial-gradient(circle at 28% 20%, transparent 0 34%, rgb(255 255 255 / 70%) 35% 36%, transparent 37%), rgb(255 255 255 / 82%);
  box-shadow: 0 18px 46px rgb(92 82 160 / 16%);
}

.step-card span {
  display: grid;
  width: 70px;
  height: 62px;
  place-items: center;
  border-radius: 32px;
  background: #7657ef;
  color: #ffffff;
  font-size: 28px;
  font-weight: 900;
}

.step-card h3 {
  margin-top: 34px;
  color: #0e0d28;
  font-size: 42px;
  font-weight: 900;
}

.step-card p {
  margin-top: 12px;
  color: #15152d;
  font-size: 20px;
}

.floating-actions {
  position: fixed;
  right: 20px;
  bottom: 32px;
  z-index: 5;
  display: grid;
  gap: 18px;
  justify-items: center;
}

.gift-box {
  display: grid;
  width: 70px;
  height: 76px;
  place-items: center;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 12px 32px rgb(29 37 72 / 15%);
  color: #ff4b43;
  font-size: 22px;
  font-weight: 900;
  line-height: 1.05;
}

.mini-action {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 50%;
  background: #ffffff;
  color: #a79ee8;
  font-size: 22px;
  font-weight: 900;
  box-shadow: 0 8px 24px rgb(29 37 72 / 12%);
}

.course-section {
  display: grid;
  min-height: 640px;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 72px;
  align-items: center;
  padding: 80px clamp(28px, 6vw, 112px);
  background: #fbfcff;
}

.course-section > * {
  min-width: 0;
}

.course-copy h2 {
  color: #111024;
  font-size: clamp(44px, 4vw, 62px);
  font-weight: 900;
  line-height: 1.36;
}

.more-button,
.teacher-feature button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 0;
  cursor: pointer;
  transition: width 0.28s ease;
}

.more-button {
  width: 254px;
  height: 82px;
  margin-top: 56px;
  border-radius: 42px;
  background: #ffffff;
  box-shadow: 0 24px 50px rgb(42 38 67 / 12%);
  color: #252433;
  font-size: 23px;
  font-weight: 900;
}

.more-button:hover {
  width: 286px;
}

.more-button .el-icon,
.teacher-feature button .el-icon {
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  background: #292938;
  color: #ffffff;
}

.more-button .el-icon {
  width: 42px;
  height: 42px;
  font-size: 24px;
}

.course-cards {
  display: flex;
  align-items: stretch;
  gap: 6px;
}

.stage-card {
  position: relative;
  flex: 0 0 208px;
  height: 478px;
  border: 0;
  border-radius: 28px;
  color: #111024;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition:
    flex-basis 0.62s ease,
    flex-grow 0.62s ease,
    box-shadow 0.24s ease,
    transform 0.24s ease;
}

.stage-card.gold {
  background: #ffeb65;
}

.stage-card.rose {
  background: #ffdede;
}

.stage-card.blue {
  background: #b9d9f7;
}

.stage-card.active {
  flex: 1 1 0;
}

.stage-shell {
  position: absolute;
  inset: 0;
  min-width: 0;
}

.stage-detail {
  display: grid;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 20px;
  padding: 72px 64px;
}

.stage-summary {
  box-sizing: border-box;
  position: relative;
  height: 100%;
  padding: 72px 40px;
}

.stage-card:hover,
.stage-card:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 18px 44px rgb(42 38 67 / 10%);
}

.stage-card:focus-visible {
  outline: 3px solid rgb(17 16 36 / 28%);
  outline-offset: 3px;
}

.stage-card h3 {
  color: #111024;
  font-size: 44px;
  font-weight: 900;
  line-height: 1.22;
}

.stage-card p {
  margin-top: 26px;
  color: #161622;
  font-size: 24px;
  font-weight: 800;
}

.stage-card ul {
  display: grid;
  gap: 18px;
  margin: 48px 0 0;
  padding: 0;
  list-style: none;
}

.stage-card li {
  overflow: hidden;
  color: #1d2a3a;
  font-size: 20px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage-card li span {
  display: inline-flex;
  min-width: 66px;
  height: 30px;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  border-radius: 18px;
  background: #6f99c9;
  color: #ffffff;
  font-size: 16px;
  font-weight: 900;
}

.stage-card.gold li span {
  background: #b5a90e;
}

.stage-card.rose li span {
  background: #df8994;
}

.stage-card.blue li span {
  background: #6f99c9;
}

.stage-arrow {
  position: absolute;
  bottom: 58px;
  left: 40px;
  display: inline-grid;
  width: 62px;
  height: 62px;
  place-items: center;
  border-radius: 50%;
  background: #292938;
  color: #ffffff;
  font-size: 32px;
}

.stage-figure {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  transition: transform 0.62s ease;
}

.stage-image {
  width: 330px;
  max-width: 100%;
  height: 360px;
  object-fit: contain;
}

.stage-fade-enter-active,
.stage-fade-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.stage-fade-enter-from,
.stage-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.teacher-section {
  position: relative;
  display: grid;
  min-height: 450px;
  grid-template-columns: 0.9fr 0.95fr 1fr 360px;
  gap: 56px;
  align-items: center;
  padding: 66px clamp(28px, 6vw, 112px);
  overflow: hidden;
  background: #25242c;
  color: #ffffff;
}

.teacher-title,
.teacher-feature {
  position: relative;
  z-index: 1;
}

.teacher-title {
  padding-right: 52px;
  border-right: 1px solid rgb(255 255 255 / 10%);
}

.teacher-title p,
.teacher-feature h3 {
  font-size: 34px;
  font-weight: 900;
}

.teacher-title h2 {
  margin-top: 38px;
  font-size: 48px;
  font-weight: 900;
  line-height: 1.6;
}

.teacher-feature p {
  margin-top: 28px;
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.8;
}

.teacher-feature button {
  width: 194px;
  height: 64px;
  margin-top: 42px;
  border-radius: 34px;
  background: #ffde42;
  color: #272532;
  font-size: 18px;
  font-weight: 900;
}

.teacher-feature button:hover {
  width: 226px;
}

.teacher-feature button .el-icon {
  width: 24px;
  height: 24px;
  font-size: 18px;
}

.teacher-figure {
  display: flex;
  justify-content: center;
  height: 360px;
  align-self: end;
}

.teacher-image {
  width: 360px;
  max-width: 100%;
  height: 360px;
  object-fit: contain;
}

.site-footer {
  padding: 70px clamp(28px, 6vw, 112px);
  border-top: 4px solid #744cff;
  background: #f4f1fb;
}

.footer-inner {
  display: grid;
  width: min(1180px, 100%);
  grid-template-columns: 1.1fr 0.9fr;
  gap: 64px;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.footer-brand {
  padding-right: 64px;
  border-right: 1px solid #ded8f4;
}

.footer-logo {
  color: #5140bd;
  font-size: 36px;
  font-weight: 900;
}

.footer-logo span {
  color: #6b54e8;
}

.footer-brand p,
.footer-contact p {
  color: #5140bd;
  font-size: 20px;
  line-height: 1.8;
}

.footer-brand p:first-of-type {
  margin-top: 32px;
  font-weight: 800;
}

.footer-contact h2 {
  color: #4631b1;
  font-size: 32px;
  font-weight: 900;
}

.footer-contact p {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 22px;
}

.footer-contact .el-icon {
  color: #a296d8;
  font-size: 24px;
}

@media (max-width: 1280px) {
  .hero-inner,
  .course-section,
  .teacher-section {
    grid-template-columns: 1fr;
  }

  .hero-inner {
    min-height: 0;
  }

  .banner-carousel :deep(.el-carousel__container),
  .banner-carousel :deep(.el-carousel__item),
  .migo-card,
  .notice-card,
  .activity-card {
    min-height: 320px;
  }

  .course-cards {
    width: 100%;
  }

  .teacher-title {
    padding-right: 0;
    border-right: 0;
  }

  .teacher-figure {
    display: none;
  }
}

@media (max-width: 820px) {
  .hero-section,
  .course-section,
  .teacher-section,
  .site-footer {
    padding-right: 20px;
    padding-left: 20px;
  }

  .hero-section {
    min-height: auto;
  }

  .tag-grid,
  .step-grid,
  .course-cards,
  .footer-inner {
    grid-template-columns: 1fr;
  }

  .course-cards {
    flex-direction: column;
  }

  .migo-card::before {
    right: -180px;
  }

  .migo-card::after,
  .mascot,
  .floating-actions,
  .stage-figure {
    display: none;
  }

  .banner-dots {
    right: 10px;
  }

  .activity-card h2 {
    margin-top: 118px;
    padding: 0 28px;
  }

  .notice-content {
    padding: 24px 28px;
  }

  .migo-copy {
    width: 100%;
    padding: 42px 28px;
  }

  .intro-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .step-card,
  .stage-card {
    height: auto;
    min-height: 0;
    border-radius: 18px;
  }

  .stage-card,
  .stage-card.active {
    flex: none;
  }

  .stage-card:not(.active) {
    min-height: 260px;
  }

  .stage-card.active {
    min-height: 320px;
  }

  .stage-detail {
    grid-template-columns: 1fr;
    padding: 42px 32px;
  }

  .stage-summary {
    padding: 42px 32px 118px;
  }

  .teacher-title h2,
  .stage-card h3 {
    font-size: 38px;
  }

  .footer-brand {
    padding-right: 0;
    border-right: 0;
  }
}
</style>
