<script setup>
import { Notebook } from '@element-plus/icons-vue'
import GovPlaceholderView from './GovPlaceholderView.vue'

const module = {
  index: '02',
  eyebrow: 'KNOWLEDGE',
  title: '知识点学习',
  description: '按行测六个科目组织章节和知识点，后续可从知识点进入对应练习。',
  tone: 'green',
  icon: Notebook,
  footer: '章节、知识点与学习进度',
  items: [
    { label: '行测六科目录', detail: '政治理论、常识判断、语言理解与表达、数量关系、判断推理、资料分析。' },
    { label: '知识点内容', detail: '支持 Markdown、LaTeX 和管理员上传的图片。' },
    { label: '我的学习进度', detail: '记录未学习、学习中、已完成三种状态。' },
  ],
}
</script>

<template><GovPlaceholderView :module="module" /></template>
