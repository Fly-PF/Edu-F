<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  ArrowRight,
  Calendar,
  Check,
  Close,
  Delete,
  Document,
  Edit,
  Flag,
  FolderOpened,
  Notebook,
  Plus,
  Refresh,
  Timer,
} from "@element-plus/icons-vue";
import { useRouter } from "vue-router";
import {
  createGovPlanTask,
  deleteGovPlanTask,
  getGovGoal,
  listGovPlanTasks,
  saveGovGoal,
  toggleGovPlanTask,
  updateGovPlanTask,
} from "@/api/govGoalPlan";

const router = useRouter();
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const modules = [
  {
    title: "考公资讯与公告",
    detail: "浏览招考公告、政策解读和备考资讯。",
    route: "gov-news",
    icon: Document,
    tone: "blue",
  },
  {
    title: "知识点学习",
    detail: "按行测六科查看章节和知识点。",
    route: "gov-knowledge",
    icon: Notebook,
    tone: "green",
  },
  {
    title: "智能题库与每日练习",
    detail: "进行专项练习、每日一练和错题重做。",
    route: "gov-practice",
    icon: Edit,
    tone: "orange",
  },
  {
    title: "模拟考试与测评",
    detail: "随机抽题进行模拟考试和结果分析。",
    route: "gov-assessment",
    icon: Timer,
    tone: "purple",
  },
  {
    title: "考公资料下载",
    detail: "按分类访问管理员维护的网盘资料。",
    route: "gov-materials",
    icon: FolderOpened,
    tone: "red",
  },
];
const goal = ref(null),
  tasks = ref([]),
  selectedDate = ref(today),
  loading = ref(true),
  taskLoading = ref(false),
  error = ref("");
const goalDialogVisible = ref(false),
  taskDialogVisible = ref(false),
  editingTaskId = ref(null),
  goalSaving = ref(false),
  taskSaving = ref(false);
const goalForm = reactive({
  examType: "",
  examName: "",
  examDate: "",
  note: "",
});
const taskForm = reactive({ taskDate: today, title: "", taskType: "OTHER" });
const daysLeft = computed(() => {
  if (!goal.value?.examDate) return null;
  return Math.ceil(
    (new Date(`${goal.value.examDate}T00:00:00`) -
      new Date(`${today}T00:00:00`)) /
      86400000,
  );
});
const completedCount = computed(
  () => tasks.value.filter((item) => item.status === 1).length,
);
function openModule(route) {
  router.push({ name: route });
}
function resetGoalForm() {
  Object.assign(
    goalForm,
    goal.value || { examType: "", examName: "", examDate: "", note: "" },
  );
}
function openGoalDialog() {
  resetGoalForm();
  goalDialogVisible.value = true;
}
async function submitGoal() {
  if (!goalForm.examName.trim() || !goalForm.examDate) return;
  goalSaving.value = true;
  try {
    goal.value = await saveGovGoal({
      ...goalForm,
      examName: goalForm.examName.trim(),
      note: goalForm.note.trim(),
    });
    goalDialogVisible.value = false;
    ElMessage.success("目标已保存");
  } catch (e) {
    ElMessage.error(e.message || "保存目标失败");
  } finally {
    goalSaving.value = false;
  }
}
async function loadTasks() {
  taskLoading.value = true;
  try {
    tasks.value = (await listGovPlanTasks(selectedDate.value)) || [];
  } catch (e) {
    ElMessage.error(e.message || "任务加载失败");
  } finally {
    taskLoading.value = false;
  }
}
function openCreateTask() {
  editingTaskId.value = null;
  Object.assign(taskForm, {
    taskDate: selectedDate.value,
    title: "",
    taskType: "OTHER",
  });
  taskDialogVisible.value = true;
}
function openEditTask(task) {
  editingTaskId.value = task.id;
  Object.assign(taskForm, {
    taskDate: task.taskDate,
    title: task.title,
    taskType: task.taskType || "OTHER",
  });
  taskDialogVisible.value = true;
}
async function submitTask() {
  if (!taskForm.title.trim() || !taskForm.taskDate) return;
  taskSaving.value = true;
  const editing = Boolean(editingTaskId.value);
  try {
    const payload = { ...taskForm, title: taskForm.title.trim() };
    if (editing) await updateGovPlanTask(editingTaskId.value, payload);
    else await createGovPlanTask(payload);
    taskDialogVisible.value = false;
    if (taskForm.taskDate === selectedDate.value) await loadTasks();
    ElMessage.success(editing ? "任务已保存" : "任务已创建");
  } catch (e) {
    ElMessage.error(e.message || "保存任务失败");
  } finally {
    taskSaving.value = false;
  }
}
async function completeTask(task) {
  try {
    await toggleGovPlanTask(task.id, task.status !== 1);
    await loadTasks();
  } catch (e) {
    ElMessage.error(e.message || "更新任务失败");
  }
}
async function removeTask(task) {
  try {
    await ElMessageBox.confirm(
      "删除后无法恢复，确定删除这条任务吗？",
      "删除任务",
      { type: "warning" },
    );
    await deleteGovPlanTask(task.id);
    await loadTasks();
    ElMessage.success("任务已删除");
  } catch (e) {
    if (e !== "cancel" && e !== "close")
      ElMessage.error(e.message || "删除任务失败");
  }
}
async function loadPage() {
  loading.value = true;
  error.value = "";
  try {
    goal.value = await getGovGoal();
    await loadTasks();
  } catch (e) {
    error.value = e.message || "页面加载失败";
  } finally {
    loading.value = false;
  }
}
onMounted(loadPage);
</script>

<template>
  <main class="gov-home-page">
    <section class="gov-home-shell">
      <header class="gov-home-header">
        <div>
          <p class="eyebrow">GOVERNMENT EXAM</p>
          <h1>考公专题</h1>
          <p>公告、知识、练习和备考资料集中管理。</p>
        </div>
        <div class="header-mark">
          <el-icon><Flag /></el-icon>
        </div>
      </header>
      <section class="goal-strip" aria-label="目标与学习计划">
        <div class="goal-icon">
          <el-icon><Calendar /></el-icon>
        </div>
        <div class="goal-copy" v-loading="loading">
          <template v-if="goal"
            ><span>当前目标</span><strong>{{ goal.examName }}</strong
            ><small
              >{{ goal.examType || "未填写考试类型" }} · {{ goal.examDate
              }}<template v-if="daysLeft !== null">
                ·
                {{
                  daysLeft >= 0
                    ? `距离考试 ${daysLeft} 天`
                    : `已过考试日期 ${Math.abs(daysLeft)} 天`
                }}</template
              ></small
            ></template
          ><template v-else
            ><span>当前目标</span><strong>还没有设置考试目标</strong
            ><small
              >设置一个目标考试，再用任务便签记录每天的安排。</small
            ></template
          >
        </div>
        <el-button type="primary" plain :icon="Edit" @click="openGoalDialog">{{
          goal ? "编辑目标" : "设置目标"
        }}</el-button>
      </section>
      <p v-if="error" class="page-error" role="alert">
        {{ error }}
        <el-button text :icon="Refresh" @click="loadPage">重试</el-button>
      </p>
      <section class="plan-section" aria-label="学习计划与打卡">
        <div class="section-heading">
          <div>
            <h2>学习计划与打卡</h2>
            <p>
              {{ selectedDate }} · 已完成 {{ completedCount }}/{{
                tasks.length
              }}
            </p>
          </div>
          <div class="section-actions">
            <el-button
              :icon="Refresh"
              text
              circle
              title="刷新任务"
              :loading="taskLoading"
              @click="loadTasks"
            /><el-button type="primary" :icon="Plus" @click="openCreateTask"
              >新建任务</el-button
            >
          </div>
        </div>
        <el-date-picker
          v-model="selectedDate"
          type="date"
          value-format="YYYY-MM-DD"
          :clearable="false"
          @change="loadTasks"
        />
        <div v-if="taskLoading" class="task-state">正在加载任务...</div>
        <div v-else-if="!tasks.length" class="task-state empty-state">
          这一天还没有任务，先添加一条学习便签。
        </div>
        <div v-else class="task-list">
          <div
            v-for="task in tasks"
            :key="task.id"
            class="task-item"
            :class="{ done: task.status === 1 }"
          >
            <button
              class="task-check"
              type="button"
              :aria-label="task.status === 1 ? '取消完成' : '标记完成'"
              @click="completeTask(task)"
            >
              <el-icon><Check /></el-icon>
            </button>
            <div class="task-content">
              <strong>{{ task.title }}</strong
              ><small
                >{{ task.taskType || "OTHER"
                }}<template v-if="task.completedAt">
                  · 完成于
                  {{
                    task.completedAt.replace("T", " ").slice(0, 16)
                  }}</template
                ></small
              >
            </div>
            <el-button
              text
              circle
              :icon="Edit"
              title="编辑任务"
              @click="openEditTask(task)"
            /><el-button
              text
              circle
              :icon="Delete"
              title="删除任务"
              @click="removeTask(task)"
            />
          </div>
        </div>
      </section>
      <div class="module-grid">
        <button
          v-for="item in modules"
          :key="item.route"
          class="module-card"
          type="button"
          @click="openModule(item.route)"
        >
          <span class="module-card-icon" :class="`tone-${item.tone}`"
            ><el-icon><component :is="item.icon" /></el-icon></span
          ><span class="module-card-copy"
            ><strong>{{ item.title }}</strong
            ><small>{{ item.detail }}</small></span
          ><el-icon class="module-card-arrow"><ArrowRight /></el-icon>
        </button>
      </div>
      <footer>Edu-F · 公考学习专题</footer>
    </section>
    <el-dialog v-model="goalDialogVisible" title="设置考试目标" width="480px"
      ><el-form label-position="top"
        ><el-form-item label="考试名称" required
          ><el-input
            v-model="goalForm.examName"
            maxlength="100"
            show-word-limit
            placeholder="例如：2027年国考" /></el-form-item
        ><el-form-item label="考试类型"
          ><el-input
            v-model="goalForm.examType"
            maxlength="30"
            placeholder="国考、省考等" /></el-form-item
        ><el-form-item label="考试日期" required
          ><el-date-picker
            v-model="goalForm.examDate"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%" /></el-form-item
        ><el-form-item label="备注"
          ><el-input
            v-model="goalForm.note"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit /></el-form-item></el-form
      ><template #footer
        ><el-button :icon="Close" @click="goalDialogVisible = false"
          >取消</el-button
        ><el-button type="primary" :loading="goalSaving" @click="submitGoal"
          >保存</el-button
        ></template
      ></el-dialog
    >
    <el-dialog
      v-model="taskDialogVisible"
      :title="editingTaskId ? '编辑学习任务' : '新建学习任务'"
      width="460px"
      ><el-form label-position="top"
        ><el-form-item label="任务日期" required
          ><el-date-picker
            v-model="taskForm.taskDate"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%" /></el-form-item
        ><el-form-item label="任务内容" required
          ><el-input
            v-model="taskForm.title"
            maxlength="200"
            show-word-limit
            placeholder="例如：完成10道题" /></el-form-item
        ><el-form-item label="任务类型"
          ><el-select v-model="taskForm.taskType" style="width: 100%"
            ><el-option label="题目" value="QUESTION" /><el-option
              label="阅读"
              value="READING" /><el-option
              label="其他"
              value="OTHER" /></el-select></el-form-item></el-form
      ><template #footer
        ><el-button :icon="Close" @click="taskDialogVisible = false"
          >取消</el-button
        ><el-button type="primary" :loading="taskSaving" @click="submitTask"
          >保存</el-button
        ></template
      ></el-dialog
    >
  </main>
</template>

<style scoped>
.gov-home-page {
  min-height: 100%;
  padding: 34px;
  background: #f5f7fb;
  color: #1f2937;
}
.gov-home-shell {
  width: min(1120px, 100%);
  min-height: calc(100vh - 132px);
  margin: 0 auto;
  padding: 48px 54px 26px;
  border: 1px solid #e3e8f1;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 18px 45px rgb(28 45 76 / 9%);
}
.gov-home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.eyebrow {
  margin: 0;
  color: #2f80ed;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
}
h1 {
  margin: 10px 0 0;
  color: #172033;
  font-size: clamp(32px, 5vw, 48px);
  line-height: 1.1;
}
.gov-home-header p:last-child {
  margin: 14px 0 0;
  color: #718096;
  font-size: 15px;
}
.header-mark {
  display: grid;
  width: 70px;
  height: 70px;
  place-items: center;
  border-radius: 16px;
  background: #eaf3ff;
  color: #2f80ed;
}
.header-mark .el-icon {
  font-size: 34px;
}
.goal-strip {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 44px;
  padding: 17px 18px;
  border: 1px solid #dfe8f5;
  border-radius: 8px;
  background: #f8fbff;
}
.goal-icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 9px;
  background: #e7f0ff;
  color: #2f80ed;
}
.goal-copy {
  min-width: 0;
  flex: 1;
}
.goal-copy span,
.goal-copy strong,
.goal-copy small {
  display: block;
}
.goal-copy span {
  color: #7b879a;
  font-size: 11px;
  font-weight: 800;
}
.goal-copy strong {
  margin-top: 3px;
  color: #27354a;
  font-size: 15px;
}
.goal-copy small {
  margin-top: 4px;
  overflow: hidden;
  color: #7b879a;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.plan-section {
  margin-top: 22px;
  padding: 20px;
  border: 1px solid #e6ebf2;
  border-radius: 8px;
  background: #fff;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.section-heading h2 {
  margin: 0;
  color: #27354a;
  font-size: 18px;
}
.section-heading p {
  margin: 5px 0 0;
  color: #7b879a;
  font-size: 12px;
}
.section-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.plan-section > .el-date-editor {
  width: 180px;
  margin-top: 16px;
}
.task-list {
  display: grid;
  gap: 4px;
  margin-top: 12px;
}
.task-item {
  display: flex;
  min-height: 52px;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px solid #edf0f5;
}
.task-item:last-child {
  border-bottom: 0;
}
.task-check {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #c8d2e0;
  border-radius: 50%;
  background: #fff;
  color: transparent;
  cursor: pointer;
}
.task-check:hover {
  border-color: #2f80ed;
  color: #2f80ed;
}
.task-item.done .task-check {
  border-color: #18a66a;
  background: #18a66a;
  color: #fff;
}
.task-content {
  min-width: 0;
  flex: 1;
}
.task-content strong,
.task-content small {
  display: block;
}
.task-content strong {
  color: #27354a;
  font-size: 14px;
  font-weight: 600;
}
.task-content small {
  margin-top: 4px;
  color: #8b96a7;
  font-size: 11px;
}
.task-item.done .task-content strong {
  color: #8b96a7;
  text-decoration: line-through;
}
.task-state {
  padding: 24px 8px 10px;
  color: #8b96a7;
  font-size: 13px;
  text-align: center;
}
.module-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 13px;
  margin-top: 22px;
}
.module-card {
  display: flex;
  min-height: 104px;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border: 1px solid #e6ebf2;
  border-radius: 8px;
  background: #fff;
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}
.module-card:hover,
.module-card:focus-visible {
  border-color: #bcd5f4;
  box-shadow: 0 8px 18px rgb(31 74 125 / 9%);
  outline: none;
  transform: translateY(-1px);
}
.module-card-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
}
.module-card-icon .el-icon {
  font-size: 22px;
}
.tone-blue {
  background: #eaf3ff;
  color: #2f80ed;
}
.tone-green {
  background: #e9f8f0;
  color: #18a66a;
}
.tone-orange {
  background: #fff4e5;
  color: #d8891e;
}
.tone-purple {
  background: #f1edff;
  color: #7258d8;
}
.tone-red {
  background: #fff0f0;
  color: #d15b5b;
}
.module-card-copy {
  min-width: 0;
  flex: 1;
}
.module-card-copy strong,
.module-card-copy small {
  display: block;
}
.module-card-copy strong {
  color: #27354a;
  font-size: 14px;
}
.module-card-copy small {
  margin-top: 7px;
  color: #7b879a;
  font-size: 12px;
  line-height: 1.5;
}
.module-card-arrow {
  color: #a0acbd;
}
footer {
  margin-top: 34px;
  color: #a0aaba;
  font-size: 12px;
  text-align: center;
}
@media (max-width: 700px) {
  .gov-home-page {
    padding: 14px;
  }
  .gov-home-shell {
    min-height: calc(100vh - 92px);
    padding: 34px 20px 22px;
  }
  .header-mark {
    width: 54px;
    height: 54px;
  }
  .header-mark .el-icon {
    font-size: 27px;
  }
  .goal-strip {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .goal-strip .el-button {
    width: 100%;
    margin-left: 50px;
  }
  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .section-actions {
    width: 100%;
    justify-content: flex-end;
  }
  .module-grid {
    grid-template-columns: 1fr;
  }
}
</style>
