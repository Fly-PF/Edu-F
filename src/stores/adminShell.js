import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAdminShellStore = defineStore(
  'adminShell',
  () => {
    const openedMenus = ref([])
    const activeMenu = ref('')

    function openMenu(index) {
      openedMenus.value = index ? [index] : []
    }

    function closeMenu(index) {
      openedMenus.value = openedMenus.value.filter((item) => item !== index)
    }

    function setActiveMenu(index) {
      activeMenu.value = index
    }

    return {
      openedMenus,
      activeMenu,
      openMenu,
      closeMenu,
      setActiveMenu,
    }
  },
  {
    persist: true,
  },
)
