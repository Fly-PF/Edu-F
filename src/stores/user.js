import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useUserStore = defineStore(
  'user',
  () => {
    const userId = ref(null)
    const username = ref('')
    const realName = ref('')
    const roleCode = ref('')
    const roleName = ref('')
    const userType = ref('')
    const avatar = ref('')
    const token = ref('')

    const isLoggedIn = computed(() => Boolean(token.value && username.value))
    const roleCodes = computed(() => (roleCode.value ? [roleCode.value] : []))
    const currentUser = computed(() => ({
      userId: userId.value,
      username: username.value,
      realName: realName.value,
      roleCode: roleCode.value,
      roleName: roleName.value,
      userType: userType.value,
      avatar: avatar.value,
      token: token.value,
    }))

    function setUser(userInfo = {}) {
      userId.value = userInfo.userId ?? userInfo.id ?? null
      username.value = userInfo.username ?? ''
      realName.value = userInfo.realName ?? userInfo.real_name ?? ''
      roleCode.value = userInfo.roleCode ?? userInfo.role_code ?? ''
      roleName.value = userInfo.roleName ?? userInfo.role_name ?? ''
      userType.value = userInfo.userType ?? userInfo.user_type ?? ''
      avatar.value = userInfo.avatar ?? ''
      token.value = userInfo.token ?? ''
    }

    function setProfile(userInfo = {}) {
      username.value = userInfo.username ?? username.value
      realName.value = userInfo.realName ?? userInfo.real_name ?? realName.value
      userType.value = userInfo.userType ?? userInfo.user_type ?? userType.value
      avatar.value = userInfo.avatar ?? avatar.value
    }

    function clearUser() {
      userId.value = null
      username.value = ''
      realName.value = ''
      roleCode.value = ''
      roleName.value = ''
      userType.value = ''
      avatar.value = ''
      token.value = ''
    }

    function hasAnyRole(allowedRoles = []) {
      if (!allowedRoles.length) {
        return true
      }

      return allowedRoles.some((item) => roleCodes.value.includes(item))
    }

    return {
      userId,
      username,
      realName,
      roleCode,
      roleName,
      userType,
      avatar,
      roleCodes,
      token,
      isLoggedIn,
      currentUser,
      setUser,
      setProfile,
      clearUser,
      hasAnyRole,
    }
  },
  {
    persist: true,
  },
)
