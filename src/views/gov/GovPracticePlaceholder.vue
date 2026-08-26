<script setup>
import { EditPen } from '@element-plus/icons-vue'
import GovPlaceholderView from './GovPlaceholderView.vue'

const module = {
  index: '03',
  eyebrow: 'PRACTICE',
  title: '智能题库与每日练习',
  description: '围绕行测六类题型进行普通练习，保存作答记录并支持错题重做。',
  tone: 'orange',
  icon: EditPen,
  footer: '题目 JSON 与答题记录',
  items: [
    { label: '单题题库', detail: '每道题一条记录，题干、选项、答案和解析放在 JSON 中。' },
    { label: '普通练习', detail: '支持专项练习、每日一练和错题重做。' },
    { label: '错题本', detail: '自动记录答错题目，不做收藏和排名。' },
  ],
}
</script>

<template><GovPlaceholderView :module="module" /></template>
