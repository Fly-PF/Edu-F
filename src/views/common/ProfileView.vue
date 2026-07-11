<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Lock, Refresh, UploadFilled, User } from '@element-plus/icons-vue'
import {
  fetchUserProfile,
  updateUserPassword,
  updateUserProfile,
  uploadUserAvatar,
} from '@/api/user'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const activeMenu = ref('profile')
const profileLoading = ref(false)
const editVisible = ref(false)
const editSubmitting = ref(false)
const avatarUploading = ref(false)
const avatarLoadFailed = ref(false)
const passwordSubmitting = ref(false)
const lastPasswordSubmitAt = ref(0)
const editFormRef = ref(null)
const passwordFormRef = ref(null)

const passwordSubmitGap = 1500
const defaultAvatar =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"%3E%3Crect width="160" height="160" rx="80" fill="%23eef2f7"/%3E%3Ccircle cx="80" cy="62" r="30" fill="%239aa6b2"/%3E%3Cpath d="M31 138c8-28 26-43 49-43s41 15 49 43" fill="%239aa6b2"/%3E%3C/svg%3E'

const userTypeMap = {
  1: '学生',
  2: '教师',
  3: '教研人员',
  4: '平台管理员',
  5: '超级管理员',
}

const profile = reactive({
  username: '',
  realName: '',
  phone: '',
  email: '',
  userType: '',
  grade: '',
  school: '',
  avatar: '',
})

const editForm = reactive({
  username: '',
  realName: '',
  phone: '',
  email: '',
  userType: '',
  grade: '',
  school: '',
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

function validateConfirmPassword(_, value, callback) {
  if (!value) {
    callback(new Error('请再次输入新密码'))
    return
  }

  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的新密码不一致'))
    return
  }

  callback()
}

const editRules = {
  realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
}

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 32, message: '新密码长度需为6-32位', trigger: 'blur' },
  ],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }],
}

const displayAvatar = computed(() => {
  if (avatarLoadFailed.value || !profile.avatar) {
    return defaultAvatar
  }

  return profile.avatar
})

const profileItems = computed(() => [
  { label: '登录账号', value: profile.username },
  { label: '真实姓名', value: profile.realName },
  { label: '手机号', value: profile.phone },
  { label: '邮箱', value: profile.email },
  { label: '用户类型', value: formatUserType(profile.userType) },
  { label: '学段', value: profile.grade },
  { label: '学校名称', value: profile.school },
])

function formatUserType(value) {
  return userTypeMap[value] || value || '-'
}

function normalizeProfile(data = {}) {
  return {
    username: data.username ?? '',
    realName: data.realName ?? data.real_name ?? '',
    phone: data.phone ?? '',
    email: data.email ?? '',
    userType: data.userType ?? data.user_type ?? '',
    grade: data.grade ?? '',
    school: data.school ?? '',
    avatar: data.avatar ?? '',
  }
}

function getResponseMessage(error, fallback = '操作失败') {
  return error?.response?.data?.message || error?.message || fallback
}

function assertSuccess(res, fallback) {
  if (Number(res?.code) !== 200) {
    throw new Error(res?.message || fallback)
  }

  return res
}

function applyProfile(data = {}) {
  Object.assign(profile, normalizeProfile(data))
  avatarLoadFailed.value = false
  userStore.setProfile(profile)
}

async function loadProfile() {
  if (!userStore.token) {
    router.replace('/login')
    return
  }

  profileLoading.value = true

  try {
    const res = assertSuccess(await fetchUserProfile(), '获取个人信息失败')
    applyProfile(res.data)
  } catch (error) {
    ElMessage.error(getResponseMessage(error, '获取个人信息失败'))
  } finally {
    profileLoading.value = false
  }
}

function openEditDialog() {
  Object.assign(editForm, {
    username: profile.username,
    realName: profile.realName,
    phone: profile.phone,
    email: profile.email,
    userType: profile.userType,
    grade: profile.grade,
    school: profile.school,
  })

  editVisible.value = true
  nextTick(() => editFormRef.value?.clearValidate())
}

async function saveProfile() {
  const valid = await editFormRef.value?.validate().catch(() => false)

  if (!valid) {
    return
  }

  editSubmitting.value = true

  try {
    assertSuccess(
      await updateUserProfile({
        realName: editForm.realName,
        phone: editForm.phone,
        email: editForm.email,
        grade: editForm.grade,
        school: editForm.school,
      }),
      '保存个人信息失败',
    )
    ElMessage.success('个人信息保存成功')
    editVisible.value = false
    await loadProfile()
  } catch (error) {
    ElMessage.error(getResponseMessage(error, '保存个人信息失败'))
  } finally {
    editSubmitting.value = false
  }
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

async function handleAvatarUpload({ file }) {
  avatarUploading.value = true

  try {
    assertSuccess(await uploadUserAvatar(file), '头像上传失败')
    ElMessage.success('头像更换成功')
    await loadProfile()
  } catch (error) {
    ElMessage.error(getResponseMessage(error, '头像上传失败'))
  } finally {
    avatarUploading.value = false
  }
}

function resetPasswordForm() {
  Object.assign(passwordForm, {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  nextTick(() => passwordFormRef.value?.clearValidate())
}

async function submitPassword() {
  const now = Date.now()

  if (passwordSubmitting.value || now - lastPasswordSubmitAt.value < passwordSubmitGap) {
    return
  }

  const valid = await passwordFormRef.value?.validate().catch(() => false)

  if (!valid) {
    return
  }

  lastPasswordSubmitAt.value = now
  passwordSubmitting.value = true

  try {
    assertSuccess(await updateUserPassword({ ...passwordForm }), '密码修改失败')
    await ElMessageBox.alert('密码修改成功，请重新登录', '修改成功', {
      type: 'success',
      confirmButtonText: '确定',
      showClose: false,
      closeOnClickModal: false,
      closeOnPressEscape: false,
    })
    userStore.clearUser()
    router.replace('/login')
  } catch (error) {
    ElMessage.error(getResponseMessage(error, '密码修改失败'))
  } finally {
    passwordSubmitting.value = false
  }
}

function handleMenuSelect(index) {
  activeMenu.value = index

  if (index === 'password') {
    resetPasswordForm()
  }
}

onMounted(loadProfile)
</script>

<template>
  <main class="profile-page">
    <el-card class="profile-card" shadow="never">
      <aside class="profile-menu-panel">
        <div class="profile-title">
          <el-icon><User /></el-icon>
          <span>个人中心</span>
        </div>
        <el-menu class="profile-menu" :default-active="activeMenu" @select="handleMenuSelect">
          <el-menu-item index="profile">
            <el-icon><User /></el-icon>
            <span>个人信息</span>
          </el-menu-item>
          <el-menu-item index="password">
            <el-icon><Lock /></el-icon>
            <span>修改密码</span>
          </el-menu-item>
        </el-menu>
      </aside>

      <section class="profile-content" v-loading="profileLoading">
        <template v-if="activeMenu === 'profile'">
          <div class="content-header">
            <div>
              <h2>个人信息</h2>
              <p>您可以在这里查看并编辑您的个人信息</p>
            </div>
            <el-button :icon="Refresh" :loading="profileLoading" @click="loadProfile">刷新</el-button>
          </div>

          <div class="avatar-row">
            <el-image
              class="avatar-image"
              fit="cover"
              :src="displayAvatar"
              :preview-src-list="[displayAvatar]"
              preview-teleported
              hide-on-click-modal
              @error="avatarLoadFailed = true"
            />
            <div class="avatar-actions">
              <div class="avatar-name">{{ profile.realName || profile.username || '-' }}</div>
              <div class="avatar-tip">{{ formatUserType(profile.userType) }}</div>
              <el-upload
                :show-file-list="false"
                :before-upload="beforeAvatarUpload"
                :http-request="handleAvatarUpload"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              >
                <el-button type="primary" :icon="UploadFilled" :loading="avatarUploading">
                  更换头像
                </el-button>
              </el-upload>
            </div>
          </div>

          <el-descriptions class="profile-descriptions" :column="2" border>
            <el-descriptions-item v-for="item in profileItems" :key="item.label" :label="item.label">
              {{ item.value || '-' }}
            </el-descriptions-item>
          </el-descriptions>

          <div class="form-actions">
            <el-button type="primary" :icon="Edit" @click="openEditDialog">编辑</el-button>
          </div>
        </template>

        <template v-else>
          <div class="content-header">
            <div>
              <h2>修改密码</h2>
              <p>修改成功后需要重新登录</p>
            </div>
          </div>

          <el-form
            ref="passwordFormRef"
            class="password-form"
            :model="passwordForm"
            :rules="passwordRules"
            label-width="110px"
          >
            <el-form-item label="原密码" prop="oldPassword">
              <el-input v-model="passwordForm.oldPassword" type="password" show-password clearable />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input
                v-model="passwordForm.newPassword"
                type="password"
                show-password
                clearable
                maxlength="32"
                placeholder="请输入6-32位新密码"
              />
            </el-form-item>
            <el-form-item label="确认新密码" prop="confirmPassword">
              <el-input v-model="passwordForm.confirmPassword" type="password" show-password clearable />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="passwordSubmitting" @click="submitPassword">
                提交修改
              </el-button>
              <el-button @click="resetPasswordForm">重置</el-button>
            </el-form-item>
          </el-form>
        </template>
      </section>
    </el-card>

    <el-dialog v-model="editVisible" title="编辑个人信息" width="560px" destroy-on-close>
      <el-form
        ref="editFormRef"
        class="edit-form"
        :model="editForm"
        :rules="editRules"
        label-width="108px"
      >
        <el-form-item label="登录账号" prop="username">
          <el-input v-model="editForm.username" disabled />
          <div class="readonly-tip">登录账号不可修改</div>
        </el-form-item>
        <el-form-item label="用户类型" prop="userType">
          <el-input :model-value="formatUserType(editForm.userType)" disabled />
          <div class="readonly-tip">用户类型不可修改</div>
        </el-form-item>
        <el-form-item label="真实姓名" prop="realName">
          <el-input v-model="editForm.realName" clearable maxlength="30" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="editForm.phone" clearable maxlength="11" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="editForm.email" clearable maxlength="100" />
        </el-form-item>
        <el-form-item label="学段" prop="grade">
          <el-input v-model="editForm.grade" clearable maxlength="20" />
        </el-form-item>
        <el-form-item label="学校名称" prop="school">
          <el-input v-model="editForm.school" clearable maxlength="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSubmitting" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<style scoped>
.profile-page {
  display: flex;
  min-height: 100%;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: #f4f6f9;
}

.profile-card {
  width: min(1120px, 100%);
  min-height: 620px;
  border: 1px solid #e5eaf2;
  border-radius: 8px;
}

.profile-card :deep(.el-card__body) {
  display: grid;
  min-height: 620px;
  grid-template-columns: 220px minmax(0, 1fr);
  padding: 0;
}

.profile-menu-panel {
  border-right: 1px solid #e5eaf2;
  background: #fbfdff;
}

.profile-title {
  display: flex;
  height: 72px;
  align-items: center;
  gap: 8px;
  padding: 0 22px;
  border-bottom: 1px solid #e5eaf2;
  color: #111827;
  font-size: 18px;
  font-weight: 700;
}

.profile-menu {
  border-right: 0;
}

.profile-content {
  min-width: 0;
  padding: 32px;
}

.content-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}

.content-header h2 {
  margin: 0;
  color: #111827;
  font-size: 24px;
  font-weight: 700;
}

.content-header p {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 22px;
  margin-bottom: 28px;
}

.avatar-image {
  width: 96px;
  height: 96px;
  overflow: hidden;
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  background: #f8fafc;
}

.avatar-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.avatar-name {
  color: #111827;
  font-size: 18px;
  font-weight: 700;
}

.avatar-tip,
.readonly-tip {
  color: #8a94a6;
  font-size: 12px;
  line-height: 1.5;
}

.profile-descriptions {
  margin-bottom: 28px;
}

.profile-descriptions :deep(.el-descriptions__label) {
  width: 120px;
  color: #4b5563;
  font-weight: 600;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.password-form {
  max-width: 520px;
}

.edit-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

@media (max-width: 820px) {
  .profile-page {
    align-items: flex-start;
    padding: 16px;
  }

  .profile-card :deep(.el-card__body) {
    grid-template-columns: 1fr;
  }

  .profile-menu-panel {
    border-right: 0;
    border-bottom: 1px solid #e5eaf2;
  }

  .profile-menu {
    display: flex;
  }

  .profile-menu :deep(.el-menu-item) {
    flex: 1;
  }

  .profile-content {
    padding: 24px 18px;
  }

  .content-header,
  .avatar-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
