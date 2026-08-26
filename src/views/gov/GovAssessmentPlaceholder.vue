<script setup>
import { Timer } from '@element-plus/icons-vue'
import GovPlaceholderView from './GovPlaceholderView.vue'

const module = {
  index: '04',
  eyebrow: 'ASSESSMENT',
  title: '模拟考试与测评',
  description: '预留全真模拟考试入口，后续接入试卷、计时、交卷和成绩分析。',
  tone: 'purple',
  icon: Timer,
  footer: '模拟考试与成绩测评',
  items: [
    { label: '考试活动', detail: '展示管理员发布的模拟考试和考试时间。' },
    { label: '限时作答', detail: '后续支持试卷、倒计时、答题卡和自动交卷。' },
    { label: '测评报告', detail: '后续提供总分、科目表现和错题复盘。' },
  ],
}
</script>

<template><GovPlaceholderView :module="module" /></template>
