<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import {
  createPersonnel,
  deletePersonnel,
  fetchPersonnelDetail,
  fetchPersonnelList,
  updatePersonnel,
  uploadPersonnelAvatar,
  updatePersonnelStatus,
} from '@/api/personnel'

const route = useRoute()

const resource = computed(() => route.meta.resource)
const pageTitle = computed(() => route.meta.title || '人员管理')

const listLoading = ref(false)
const tableData = ref([])
const total = ref(0)

const query = reactive({
  keyword: '',
  status: '',
  pageNum: 1,
  pageSize: 10,
})

const formRef = ref(null)
const dialogVisible = ref(false)
const dialogMode = ref('create')
const submitLoading = ref(false)
const avatarUploadLoading = ref(false)
const avatarPreviewFailed = ref(false)
const formError = ref('')
const currentId = ref(null)

const apiBaseURL = 'http://localhost:8080'
const defaultAvatar =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"%3E%3Crect width="160" height="160" rx="80" fill="%23eef2f7"/%3E%3Ccircle cx="80" cy="62" r="30" fill="%239aa6b2"/%3E%3Cpath d="M31 138c8-28 26-43 49-43s41 15 49 43" fill="%239aa6b2"/%3E%3C/svg%3E'

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailAvatarPreviewFailed = ref(false)
const detailData = ref(null)

const form = reactive(getDefaultForm())

const statusOptions = [
  { label: '全部', value: '' },
  { label: '正常', value: 1 },
  { label: '禁用', value: 0 },
]

const isEditMode = computed(() => dialogMode.value === 'edit')
const dialogTitle = computed(() => (isEditMode.value ? `编辑${pageTitle.value}` : `新增${pageTitle.value}`))
const avatarPreviewUrl = computed(() => getAvatarPreviewUrl(form.avatar))
const detailAvatarPreviewUrl = computed(() => getAvatarImageUrl(detailData.value?.avatar, detailAvatarPreviewFailed.value))
const canUploadAvatar = computed(() => isEditMode.value && currentId.value)

const rules = computed(() => ({
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    {
      pattern: /^[A-Za-z0-9_-]{2,50}$/,
      message: '账号需为2-50位字母、数字、下划线或短横线',
      trigger: 'blur',
    },
  ],
  password: [
    {
      validator: validatePassword,
      trigger: 'blur',
    },
  ],
  realName: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 1, max: 30, message: '姓名长度不能超过30个字符', trigger: 'blur' },
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的中国大陆手机号', trigger: 'blur' },
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
    { max: 100, message: '邮箱长度不能超过100个字符', trigger: 'blur' },
  ],
  avatar: [{ max: 255, message: '头像地址长度不能超过255个字符', trigger: 'blur' }],
  grade: [{ max: 20, message: '学段长度不能超过20个字符', trigger: 'blur' }],
  school: [{ max: 100, message: '学校名称长度不能超过100个字符', trigger: 'blur' }],
  extJsonText: [{ validator: validateExtJson, trigger: 'blur' }],
}))

watch(
  () => resource.value,
  () => {
    resetQuery()
    loadList()
  },
  { immediate: true },
)

function getDefaultForm() {
  return {
    username: '',
    password: '',
    realName: '',
    phone: '',
    email: '',
    avatar: '',
    grade: '',
    school: '',
    status: 1,
    extJsonText: '{}',
  }
}

function resetForm() {
  Object.assign(form, getDefaultForm())
  currentId.value = null
  formError.value = ''
  avatarPreviewFailed.value = false
  nextTick(() => formRef.value?.clearValidate())
}

function resetQuery() {
  query.keyword = ''
  query.status = ''
  query.pageNum = 1
  query.pageSize = 10
}

function validatePassword(_, value, callback) {
  if (!isEditMode.value && !value) {
    callback(new Error('请输入密码'))
    return
  }

  if (value && (value.length < 8 || value.length > 32)) {
    callback(new Error('密码需为8-32个字符'))
    return
  }

  callback()
}

function validateExtJson(_, value, callback) {
  const text = value?.trim()

  if (!text) {
    callback()
    return
  }

  try {
    const parsed = JSON.parse(text)
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      callback(new Error('扩展信息必须是JSON对象'))
      return
    }

    if (JSON.stringify(parsed).length > 2000) {
      callback(new Error('扩展信息不能超过2000个字符'))
      return
    }
  } catch {
    callback(new Error('请输入合法的JSON格式'))
    return
  }

  callback()
}

function assertResponse(res, fallbackMessage = '操作失败') {
  if (res?.code !== 200) {
    throw new Error(res?.message || fallbackMessage)
  }

  return res.data
}

function getErrorMessage(error, fallbackMessage = '操作失败') {
  return error?.response?.data?.message || error?.message || fallbackMessage
}

function getAvatarImageUrl(avatar, hasFailed = false) {
  const value = avatar?.trim()

  if (hasFailed || !value) {
    return defaultAvatar
  }

  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) {
    return value
  }

  if (value.startsWith('/')) {
    return `${apiBaseURL}${value}`
  }

  return `${apiBaseURL}/api/user/avatar/image?objectName=${encodeURIComponent(value)}`
}

function getAvatarPreviewUrl(avatar) {
  return getAvatarImageUrl(avatar, avatarPreviewFailed.value)
}

function beforeAvatarUpload(file) {
  const allowTypes = ['image/jpeg', 'image/png', 'image/webp']
  const allowExt = /\.(jpe?g|png|webp)$/i.test(file.name)

  if (!allowTypes.includes(file.type) && !allowExt) {
    ElMessage.error('头像仅支持jpg、jpeg、png、webp格式')
    return false
  }

  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('头像文件不能超过5MB')
    return false
  }

  return true
}

function getUploadedAvatarValue(data = {}) {
  return data.avatar || data.objectName || data.object_name || data.path || data.url || ''
}

async function handleAvatarUpload({ file }) {
  if (!canUploadAvatar.value) {
    ElMessage.warning('请先创建用户后再编辑头像')
    return
  }

  avatarUploadLoading.value = true

  try {
    const data = assertResponse(
      await uploadPersonnelAvatar(currentId.value, file),
      '头像上传失败',
    )
    const avatar = getUploadedAvatarValue(data)

    if (!avatar) {
      throw new Error('头像上传成功但未返回头像地址')
    }

    form.avatar = avatar
    avatarPreviewFailed.value = false
    formRef.value?.clearValidate('avatar')
    ElMessage.success('头像上传成功')
    await loadList()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '头像上传失败'))
  } finally {
    avatarUploadLoading.value = false
  }
}

function buildListParams() {
  const params = {
    pageNum: query.pageNum,
    pageSize: query.pageSize,
  }

  const keyword = query.keyword.trim()
  if (keyword) {
    params.keyword = keyword
  }

  if (query.status !== '') {
    params.status = query.status
  }

  return params
}

async function loadList() {
  listLoading.value = true
  try {
    const data = assertResponse(
      await fetchPersonnelList(resource.value, buildListParams()),
      '查询人员列表失败',
    )
    tableData.value = data?.records || []
    total.value = data?.total || 0
  } catch (error) {
    tableData.value = []
    total.value = 0
    ElMessage.error(getErrorMessage(error, '查询人员列表失败'))
  } finally {
    listLoading.value = false
  }
}

function handleSearch() {
  query.pageNum = 1
  loadList()
}

function handleStatusChange() {
  query.pageNum = 1
  loadList()
}

function handleSizeChange(size) {
  query.pageSize = size
  query.pageNum = 1
  loadList()
}

function handleCurrentChange(page) {
  query.pageNum = page
  loadList()
}

function getRowClassName({ row }) {
  return row.status === 0 ? 'disabled-person-row' : ''
}

function formatStatus(row) {
  if (row.statusName) {
    return row.statusName
  }

  return row.status === 0 ? '禁用' : '正常'
}

function openCreateDialog() {
  dialogMode.value = 'create'
  resetForm()
  dialogVisible.value = true
}

async function openDetailDialog(row) {
  detailVisible.value = true
  detailLoading.value = true
  detailAvatarPreviewFailed.value = false
  detailData.value = null
  try {
    detailData.value = assertResponse(
      await fetchPersonnelDetail(resource.value, row.id),
      '查询人员详情失败',
    )
    detailAvatarPreviewFailed.value = false
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '查询人员详情失败'))
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

async function openEditDialog(row) {
  dialogMode.value = 'edit'
  resetForm()
  dialogVisible.value = true
  submitLoading.value = true
  try {
    const data = assertResponse(
      await fetchPersonnelDetail(resource.value, row.id),
      '查询人员详情失败',
    )
    currentId.value = data.id
    Object.assign(form, {
      username: data.username || '',
      password: '',
      realName: data.realName || '',
      phone: data.phone || '',
      email: data.email || '',
      avatar: data.avatar || '',
      grade: data.grade || '',
      school: data.school || '',
      status: data.status ?? 1,
      extJsonText: JSON.stringify(data.extJson || {}, null, 2),
    })
    avatarPreviewFailed.value = false
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '查询人员详情失败'))
    dialogVisible.value = false
  } finally {
    submitLoading.value = false
  }
}

function buildSubmitPayload() {
  const extJson = form.extJsonText?.trim() ? JSON.parse(form.extJsonText) : {}
  const payload = {
    realName: form.realName.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    avatar: form.avatar.trim(),
    grade: form.grade.trim(),
    school: form.school.trim(),
    status: form.status,
    extJson,
  }

  if (!isEditMode.value) {
    payload.username = form.username.trim()
    payload.password = form.password
    return payload
  }

  if (form.password) {
    payload.password = form.password
  }

  return payload
}

async function handleSubmit() {
  formError.value = ''
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  submitLoading.value = true
  listLoading.value = true
  try {
    const payload = buildSubmitPayload()
    const res = isEditMode.value
      ? await updatePersonnel(resource.value, currentId.value, payload)
      : await createPersonnel(resource.value, payload)

    assertResponse(res, isEditMode.value ? '修改人员失败' : '新增人员失败')
    ElMessage.success(res.message || (isEditMode.value ? '修改成功' : '新增成功'))
    dialogVisible.value = false
    await loadList()
  } catch (error) {
    formError.value = getErrorMessage(error, isEditMode.value ? '修改人员失败' : '新增人员失败')
    ElMessage.error(formError.value)
  } finally {
    submitLoading.value = false
    listLoading.value = false
  }
}

async function handleStatusToggle(row) {
  const nextStatus = row.status === 0 ? 1 : 0
  const actionText = nextStatus === 1 ? '启用' : '禁用'

  try {
    await ElMessageBox.confirm(`确认${actionText}账号“${row.username}”吗？`, `${actionText}确认`, {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
      closeOnClickModal: true,
    })
  } catch {
    return
  }

  listLoading.value = true
  try {
    const res = await updatePersonnelStatus(resource.value, row.id, nextStatus)
    assertResponse(res, `${actionText}失败`)
    ElMessage.success(res.message || `${actionText}成功`)
    await loadList()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, `${actionText}失败`))
  } finally {
    listLoading.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      '删除后该人员所有关联数据永久清除、无法恢复。确认继续删除吗？',
      '删除确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'error',
        closeOnClickModal: true,
        confirmButtonClass: 'el-button--danger',
      },
    )
  } catch {
    return
  }

  listLoading.value = true
  try {
    const res = await deletePersonnel(resource.value, row.id)
    assertResponse(res, '删除失败')
    ElMessage.success(res.message || '删除成功')
    if (tableData.value.length === 1 && query.pageNum > 1) {
      query.pageNum -= 1
    }
    await loadList()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '删除失败'))
  } finally {
    listLoading.value = false
  }
}
</script>

<template>
  <main class="personnel-page">
    <section class="toolbar-section">
      <div class="title-block">
        <h1>{{ pageTitle }}</h1>
      </div>

      <div class="toolbar-actions">
        <el-input
          v-model="query.keyword"
          class="keyword-input"
          clearable
          placeholder="姓名/账号模糊搜索"
          :disabled="listLoading"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="query.status"
          class="status-select"
          placeholder="账号状态"
          :disabled="listLoading"
          @change="handleStatusChange"
        >
          <el-option
            v-for="item in statusOptions"
            :key="String(item.value)"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-button type="primary" :loading="listLoading" @click="handleSearch">搜索</el-button>
        <el-button type="primary" :disabled="listLoading" @click="openCreateDialog">添加</el-button>
      </div>
    </section>

    <section class="table-section">
      <el-table
        v-loading="listLoading"
        :data="tableData"
        :row-class-name="getRowClassName"
        border
        height="100%"
      >
        <el-table-column prop="username" label="账号" min-width="140" show-overflow-tooltip />
        <el-table-column prop="realName" label="姓名" min-width="120" show-overflow-tooltip />
        <el-table-column label="性别" width="80" align="center">
          <template #default>-</template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" min-width="130" show-overflow-tooltip />
        <el-table-column prop="createTime" label="创建时间" min-width="170" show-overflow-tooltip />
        <el-table-column label="账号状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 0 ? 'info' : 'success'" effect="light">
              {{ formatStatus(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" :disabled="listLoading" @click="openDetailDialog(row)">
              详情
            </el-button>
            <el-button link type="primary" :disabled="listLoading" @click="openEditDialog(row)">
              编辑
            </el-button>
            <el-button link type="warning" :disabled="listLoading" @click="handleStatusToggle(row)">
              {{ row.status === 0 ? '启用' : '禁用' }}
            </el-button>
            <el-button link type="danger" :disabled="listLoading" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="table-empty-state">
            <el-empty description="暂无人员数据" :image-size="118" />
          </div>
        </template>
      </el-table>
    </section>

    <div v-if="tableData.length" class="pagination-bar">
      <el-pagination
        v-model:current-page="query.pageNum"
        v-model:page-size="query.pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        :disabled="listLoading"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="720px"
      append-to-body
      destroy-on-close
      @closed="resetForm"
    >
      <el-alert v-if="formError" class="dialog-error" :title="formError" type="error" show-icon />
      <el-form ref="formRef" :model="form" :rules="rules" label-width="92px" class="person-form">
        <el-row :gutter="18">
          <el-col :span="12">
            <el-form-item label="账号" prop="username">
              <el-input v-model="form.username" :readonly="isEditMode" placeholder="请输入账号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="密码" prop="password">
              <el-input
                v-model="form.password"
                type="password"
                show-password
                :placeholder="isEditMode ? '留空则不修改密码' : '请输入密码'"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名" prop="realName">
              <el-input v-model="form.realName" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入手机号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="账号状态" prop="status">
              <el-select v-model="form.status" class="form-select">
                <el-option label="正常" :value="1" />
                <el-option label="禁用" :value="0" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学段" prop="grade">
              <el-input v-model="form.grade" placeholder="请输入学段" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学校" prop="school">
              <el-input v-model="form.school" placeholder="请输入学校名称" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="头像" prop="avatar">
              <div class="avatar-upload-field">
                <el-image
                  class="avatar-preview"
                  fit="cover"
                  :src="avatarPreviewUrl"
                  :preview-src-list="[avatarPreviewUrl]"
                  preview-teleported
                  hide-on-click-modal
                  @error="avatarPreviewFailed = true"
                />
                <div class="avatar-upload-main">
                  <div class="avatar-upload-actions">
                    <el-upload
                      :show-file-list="false"
                      :before-upload="beforeAvatarUpload"
                      :http-request="handleAvatarUpload"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      :disabled="!canUploadAvatar"
                    >
                      <el-button
                        type="primary"
                        :icon="UploadFilled"
                        :loading="avatarUploadLoading"
                        :disabled="!canUploadAvatar"
                      >
                        上传头像
                      </el-button>
                    </el-upload>
                  </div>
                  <div class="avatar-path-text">{{ form.avatar || '未设置头像' }}</div>
                </div>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="扩展信息" prop="extJsonText">
              <el-input v-model="form.extJsonText" type="textarea" :rows="4" placeholder='例如：{"source":"manual"}' />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button :disabled="submitLoading" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="人员详情" width="720px" append-to-body>
      <div v-loading="detailLoading" class="detail-content">
        <el-descriptions v-if="detailData" :column="2" border>
          <el-descriptions-item label="用户ID">{{ detailData.id ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="账号">{{ detailData.username || '-' }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ detailData.realName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="性别">-</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ detailData.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ detailData.email || '-' }}</el-descriptions-item>
          <el-descriptions-item label="人员类型">{{ detailData.userTypeName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="账号状态">{{ formatStatus(detailData) }}</el-descriptions-item>
          <el-descriptions-item label="学段">{{ detailData.grade || '-' }}</el-descriptions-item>
          <el-descriptions-item label="学校">{{ detailData.school || '-' }}</el-descriptions-item>
          <el-descriptions-item label="头像" :span="2">
            <el-image
              class="detail-avatar-image"
              fit="cover"
              :src="detailAvatarPreviewUrl"
              :preview-src-list="[detailAvatarPreviewUrl]"
              preview-teleported
              hide-on-click-modal
              @error="detailAvatarPreviewFailed = true"
            />
          </el-descriptions-item>
          <el-descriptions-item label="最后登录时间">{{ detailData.lastLoginTime || '-' }}</el-descriptions-item>
          <el-descriptions-item label="最后登录IP">{{ detailData.lastLoginIp || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ detailData.createTime || '-' }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ detailData.updateTime || '-' }}</el-descriptions-item>
          <el-descriptions-item label="扩展信息" :span="2">
            <pre class="ext-json">{{ JSON.stringify(detailData.extJson || {}, null, 2) }}</pre>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </main>
</template>

<style scoped>
.personnel-page {
  display: flex;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  flex-direction: column;
  padding: 24px;
  overflow: hidden;
}

.toolbar-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.title-block h1 {
  margin: 0;
  color: #111827;
  font-size: 24px;
  font-weight: 700;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.keyword-input {
  width: 240px;
}

.status-select {
  width: 132px;
}

.table-section {
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
  border-radius: 8px;
  background: #ffffff;
}

.table-empty-state {
  display: flex;
  width: 100%;
  min-height: calc(100vh - 254px);
  align-items: center;
  justify-content: center;
  padding: 48px 0;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

.dialog-error {
  margin-bottom: 16px;
}

.person-form {
  padding-right: 8px;
}

.form-select {
  width: 100%;
}

.avatar-upload-field {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.avatar-preview {
  width: 72px;
  height: 72px;
  overflow: hidden;
  flex: 0 0 auto;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #f8fafc;
}

.avatar-upload-main {
  min-width: 0;
  flex: 1;
}

.avatar-upload-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar-path-text {
  margin-top: 8px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.detail-content {
  min-height: 180px;
}

.detail-avatar-image {
  width: 72px;
  height: 72px;
  overflow: hidden;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #f8fafc;
}

.ext-json {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
}

:deep(.disabled-person-row) {
  color: #9ca3af;
  background: #f3f4f6;
}

:deep(.disabled-person-row td.el-table__cell) {
  background: #f3f4f6;
}

:deep(.el-table__empty-block) {
  width: 100% !important;
  min-height: 100%;
}

:deep(.el-table__empty-text) {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  line-height: 1.5;
}

@media (max-width: 980px) {
  .toolbar-section {
    align-items: stretch;
    flex-direction: column;
  }

  .toolbar-actions {
    flex-wrap: wrap;
  }

  .keyword-input {
    width: 100%;
    min-width: 220px;
    flex: 1 1 220px;
  }
}
</style>
