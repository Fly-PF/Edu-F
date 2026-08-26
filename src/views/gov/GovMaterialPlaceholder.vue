<script setup>
import { FolderOpened } from '@element-plus/icons-vue'
import GovPlaceholderView from './GovPlaceholderView.vue'

const module = {
  index: '06',
  eyebrow: 'MATERIALS',
  title: '考公资料下载',
  description: '按管理员维护的分类浏览备考资料，点击网盘链接即可访问。',
  tone: 'red',
  icon: FolderOpened,
  footer: '网盘链接与资料分类',
  items: [
    { label: '资料分类', detail: '分类由管理员维护，可新增、编辑和停用。' },
    { label: '网盘链接', detail: '支持百度网盘、夸克网盘等多个链接和提取码。' },
    { label: '资料状态', detail: '管理员维护草稿、发布和下架状态。' },
  ],
}
</script>

<template><GovPlaceholderView :module="module" /></template>
