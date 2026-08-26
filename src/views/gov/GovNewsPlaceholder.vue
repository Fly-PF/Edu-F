<script setup>
import { Document } from '@element-plus/icons-vue'
import GovPlaceholderView from './GovPlaceholderView.vue'

const module = {
  index: '01',
  eyebrow: 'INFORMATION',
  title: '考公资讯与公告',
  description: '集中查看招考公告、政策解读和备考资讯，管理员发布内容后将在这里呈现。',
  tone: 'blue',
  icon: Document,
  footer: '资讯内容与分类管理',
  items: [
    { label: '资讯分类与搜索', detail: '按管理员维护的分类浏览，支持关键词搜索。' },
    { label: '公告详情', detail: '正文采用 Markdown + LaTeX，支持图片展示。' },
    { label: '发布状态', detail: '管理员维护草稿、发布和下架状态。' },
  ],
}
</script>

<template><GovPlaceholderView :module="module" /></template>
