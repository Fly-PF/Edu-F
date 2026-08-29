<script setup>
import { computed } from 'vue'
import { MarkdownRenderer } from 'x-markdown-vue'
import 'x-markdown-vue/style'
import 'katex/dist/katex.min.css'

const props = defineProps({
  content: { type: String, default: '' },
})

const markdownContent = computed(() => props.content.replace(
  /(^|\r?\n)\$\$([^\r\n]+)\$\$(?=\r?\n|$)/g,
  (_match, prefix, formula) => `${prefix}$$\n${formula}\n$$`,
))

const katexSanitizeOptions = {
  sanitizeOptions: {
    tagNames: [
      'annotation', 'math', 'mfrac', 'mi', 'mn', 'mo', 'mrow', 'mspace',
      'msqrt', 'mstyle', 'msub', 'msubsup', 'msup', 'mtable', 'mtd', 'mtext',
      'mtr', 'munder', 'munderover', 'semantics',
    ],
    attributes: {
      annotation: ['encoding'],
      math: ['display', 'xmlns'],
      mo: ['fence', 'separator', 'stretchy'],
      mspace: ['height', 'linebreak', 'width'],
      span: ['ariaHidden', 'className', 'style'],
    },
  },
}
</script>

<template>
  <MarkdownRenderer
    class="gov-news-markdown"
    :markdown="markdownContent"
    :allow-html="false"
    :sanitize="true"
    :sanitize-options="katexSanitizeOptions"
    :enable-latex="true"
    :enable-mermaid="false"
    :enable-shiki="true"
  >
    <template #a="{ node, children }">
      <a :href="node?.properties?.href" target="_blank" rel="noopener noreferrer">
        <component :is="children" />
      </a>
    </template>
  </MarkdownRenderer>
</template>

<style scoped>
.gov-news-markdown { color: #344054; font-size: 16px; line-height: 1.9; overflow-wrap: anywhere; }
.gov-news-markdown :deep(img) { display: block; width: auto; max-width: 100%; height: auto; margin: 24px auto; border-radius: 10px; }
.gov-news-markdown :deep(a) { color: #2475d8; text-decoration: underline; text-underline-offset: 3px; }
.gov-news-markdown :deep(pre) { max-width: 100%; overflow-x: auto; }
.gov-news-markdown :deep(.katex-display) { max-width: 100%; overflow-x: auto; overflow-y: hidden; }
</style>
