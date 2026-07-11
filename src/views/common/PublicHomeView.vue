<template>
  <main class="home-page">
    <section class="hero-section">
      <div class="hero-copy">
        <p class="eyebrow">Edu-F AI Learning Hub</p>
        <h1>让课程、练习与反馈形成连续的学习智能</h1>
        <p class="hero-summary">
          面向老师与学生的 AI 教育平台，围绕课程学习、课堂练习、过程诊断和成长记录，
          将教学安排与个性化学习连接在同一个清晰空间里。
        </p>

        <div class="signal-row" aria-label="平台能力概览">
          <div>
            <strong>24h</strong>
            <span>学习反馈</span>
          </div>
          <div>
            <strong>AI</strong>
            <span>助教分析</span>
          </div>
          <div>
            <strong>2</strong>
            <span>师生角色</span>
          </div>
        </div>
      </div>

      <div class="ai-board" aria-label="AI 学习数据面板">
        <div class="board-header">
          <span>Learning Intelligence</span>
          <i></i>
        </div>
        <div class="neural-map">
          <div class="source-column">
            <span class="node node-teacher">老师</span>
            <span class="node node-student">学生</span>
          </div>
          <span class="flow-connector flow-left"></span>
          <span class="node node-ai">AI</span>
          <span class="flow-connector flow-right"></span>
          <div class="output-column">
            <span class="node node-course">课程</span>
            <span class="node node-practice">练习</span>
          </div>
        </div>
        <div class="board-grid">
          <div>
            <span>练习完成率</span>
            <strong>86%</strong>
          </div>
          <div>
            <span>知识点掌握</span>
            <strong>73%</strong>
          </div>
          <div>
            <span>待关注学生</span>
            <strong>12</strong>
          </div>
          <div>
            <span>课程资源</span>
            <strong>128</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="flow-section">
      <div class="section-heading">
        <p class="eyebrow">Teaching And Learning Flow</p>
        <h2>从课程建设到练习反馈，学习过程持续可见</h2>
      </div>

      <div class="flow-grid">
        <article>
          <span>01</span>
          <h3>课程组织</h3>
          <p>老师按班级发布课程、章节资源和学习任务，让教学节奏更容易被跟踪。</p>
        </article>
        <article>
          <span>02</span>
          <h3>智能练习</h3>
          <p>学生围绕课程内容完成练习，AI 汇总错因、薄弱知识点和学习状态。</p>
        </article>
        <article>
          <span>03</span>
          <h3>过程诊断</h3>
          <p>平台沉淀学习记录、进度变化和反馈建议，辅助老师及时调整教学安排。</p>
        </article>
      </div>
    </section>

    <section class="role-section">
      <article class="role-panel teacher-panel">
        <div class="role-title">
          <span>Teacher Workspace</span>
          <h2>老师侧重教学管理与班级洞察</h2>
        </div>
        <ul>
          <li>班级、课程、章节资源统一管理</li>
          <li>练习结果和学习进度集中查看</li>
          <li>基于数据识别共性问题和个体差异</li>
        </ul>
      </article>

      <article class="role-panel student-panel">
        <div class="role-title">
          <span>Student Workspace</span>
          <h2>学生侧重课程学习与成长反馈</h2>
        </div>
        <ul>
          <li>查看班级课程、公开课程和学习任务</li>
          <li>在章节学习中完成练习和复盘</li>
          <li>通过 AI 反馈了解薄弱点与下一步方向</li>
        </ul>
      </article>
    </section>

    <section class="insight-section">
      <div class="insight-copy">
        <p class="eyebrow">AI Feedback Loop</p>
        <h2>把“学过了”变成“学会了”的证据链</h2>
        <p>
          首页展示的是平台的共同目标：老师看见教学现场，学生看见自己的进步，AI 把课程、练习、反馈和记录串联成可持续改进的学习闭环。
        </p>
      </div>
      <div class="metric-strip">
        <div>
          <span>课程</span>
          <strong>资源结构化</strong>
        </div>
        <div>
          <span>练习</span>
          <strong>反馈即时化</strong>
        </div>
        <div>
          <span>记录</span>
          <strong>成长可视化</strong>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.home-page {
  min-height: 100%;
  padding: 28px;
  overflow: hidden;
  background:
    linear-gradient(90deg, rgb(39 92 246 / 7%) 1px, transparent 1px),
    linear-gradient(rgb(39 92 246 / 7%) 1px, transparent 1px),
    #f6f8fc;
  background-size: 36px 36px;
  color: #121826;
}

.hero-section,
.flow-section,
.role-section,
.insight-section {
  width: min(1180px, 100%);
  margin: 0 auto;
}

.hero-section {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.88fr);
  gap: 24px;
  align-items: stretch;
}

.hero-copy,
.ai-board,
.flow-section,
.role-panel,
.insight-section {
  border: 1px solid rgb(148 163 184 / 30%);
  border-radius: 8px;
  background: rgb(255 255 255 / 88%);
  box-shadow: 0 18px 45px rgb(15 23 42 / 8%);
}

.hero-copy {
  display: flex;
  min-height: 420px;
  flex-direction: column;
  justify-content: center;
  padding: 44px;
}

.eyebrow {
  margin: 0 0 14px;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1 {
  max-width: 720px;
  color: #0f172a;
  font-size: 46px;
  line-height: 1.12;
}

.hero-summary {
  max-width: 680px;
  margin-top: 22px;
  color: #475569;
  font-size: 17px;
  line-height: 1.8;
}

.signal-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 34px;
}

.signal-row div,
.board-grid div,
.flow-grid article,
.metric-strip div {
  min-width: 0;
  border: 1px solid rgb(148 163 184 / 26%);
  border-radius: 8px;
  background: #ffffff;
}

.signal-row div {
  padding: 16px;
}

.signal-row strong,
.board-grid strong,
.metric-strip strong {
  display: block;
  color: #111827;
  font-size: 24px;
  line-height: 1.2;
}

.signal-row span,
.board-grid span,
.metric-strip span {
  display: block;
  margin-top: 7px;
  color: #64748b;
  font-size: 13px;
}

.ai-board {
  position: relative;
  min-height: 420px;
  padding: 24px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgb(15 23 42 / 92%), rgb(31 41 55 / 92%)),
    #111827;
  color: #f8fafc;
}

.ai-board::before {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgb(34 211 238 / 14%) 1px, transparent 1px),
    linear-gradient(rgb(132 204 22 / 12%) 1px, transparent 1px);
  background-size: 28px 28px;
  content: '';
}

.board-header,
.neural-map,
.board-grid {
  position: relative;
  z-index: 1;
}

.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 700;
}

.board-header i {
  width: 58px;
  height: 8px;
  border-radius: 8px;
  background: linear-gradient(90deg, #22d3ee, #84cc16, #f59e0b);
}

.neural-map {
  display: grid;
  min-height: 220px;
  grid-template-columns: minmax(92px, 1fr) 72px 108px 72px minmax(92px, 1fr);
  gap: 0;
  align-items: center;
  margin-top: 30px;
}

.source-column,
.output-column {
  display: grid;
  gap: 18px;
  justify-items: center;
}

.node {
  display: grid;
  width: 86px;
  height: 86px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 50%;
  background: rgb(15 23 42 / 72%);
  box-shadow: inset 0 0 24px rgb(34 211 238 / 18%), 0 14px 30px rgb(0 0 0 / 22%);
  color: #ffffff;
  font-weight: 700;
}

.node-ai {
  width: 108px;
  height: 108px;
  border-color: rgb(34 211 238 / 60%);
  background: rgb(14 116 144 / 36%);
}

.flow-connector {
  display: block;
  height: 2px;
  background: linear-gradient(90deg, rgb(34 211 238 / 85%), rgb(132 204 22 / 76%));
}

.flow-left {
  margin-left: -6px;
}

.flow-right {
  margin-right: -6px;
}

.board-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.board-grid div {
  padding: 14px;
  background: rgb(15 23 42 / 72%);
}

.board-grid strong {
  color: #f8fafc;
}

.board-grid span {
  color: #cbd5e1;
}

.flow-section,
.insight-section {
  margin-top: 24px;
  padding: 28px;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}

.section-heading h2,
.insight-copy h2,
.role-title h2 {
  color: #111827;
  font-size: 26px;
  line-height: 1.3;
}

.flow-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.flow-grid article {
  padding: 22px;
}

.flow-grid span {
  display: inline-flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #e0f2fe;
  color: #0369a1;
  font-weight: 800;
}

.flow-grid h3 {
  margin-top: 18px;
  color: #111827;
  font-size: 18px;
}

.flow-grid p,
.role-panel li,
.insight-copy p {
  color: #526071;
  font-size: 15px;
  line-height: 1.75;
}

.flow-grid p {
  margin-top: 10px;
}

.role-section {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  margin-top: 24px;
}

.role-panel {
  padding: 28px;
}

.teacher-panel {
  border-top: 4px solid #2563eb;
}

.student-panel {
  border-top: 4px solid #16a34a;
}

.role-title span {
  display: block;
  margin-bottom: 10px;
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.role-panel ul {
  display: grid;
  gap: 12px;
  margin: 22px 0 0;
  padding: 0;
  list-style: none;
}

.role-panel li {
  position: relative;
  padding-left: 18px;
}

.role-panel li::before {
  position: absolute;
  top: 12px;
  left: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f59e0b;
  content: '';
}

.insight-section {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.82fr);
  gap: 24px;
  align-items: center;
  margin-bottom: 28px;
}

.insight-copy p:last-child {
  margin-top: 14px;
}

.metric-strip {
  display: grid;
  gap: 12px;
}

.metric-strip div {
  padding: 18px;
  border-left: 4px solid #22d3ee;
}

.metric-strip div:nth-child(2) {
  border-left-color: #84cc16;
}

.metric-strip div:nth-child(3) {
  border-left-color: #f59e0b;
}

.metric-strip strong {
  font-size: 20px;
}

@media (max-width: 1080px) {
  .hero-section,
  .insight-section {
    grid-template-columns: 1fr;
  }

  .hero-copy {
    min-height: auto;
  }
}

@media (max-width: 760px) {
  .home-page {
    padding: 18px;
  }

  .hero-copy,
  .ai-board,
  .flow-section,
  .role-panel,
  .insight-section {
    padding: 20px;
  }

  h1 {
    font-size: 34px;
  }

  .hero-summary {
    font-size: 15px;
  }

  .signal-row,
  .flow-grid,
  .role-section,
  .board-grid {
    grid-template-columns: 1fr;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .neural-map {
    min-height: auto;
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .source-column,
  .output-column {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .node,
  .node-ai {
    width: 100%;
    height: 64px;
    border-radius: 8px;
  }

  .flow-connector {
    width: 2px;
    height: 28px;
    justify-self: center;
    background: linear-gradient(180deg, rgb(34 211 238 / 85%), rgb(132 204 22 / 76%));
  }

  .flow-left,
  .flow-right {
    margin: 0;
  }
}
</style>
