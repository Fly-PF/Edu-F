<script setup>
import { inject, nextTick, onMounted } from 'vue'
import { MarkdownRenderer } from 'x-markdown-vue'
import 'x-markdown-vue/style'
import 'katex/dist/katex.min.css'
import { ArrowDown, ArrowRight, CopyDocument, Plus } from '@element-plus/icons-vue'

const chatState = inject('knowledgeBaseChat')

if (!chatState) {
  throw new Error('KnowledgeBaseChatView must be used inside KnowledgeBaseView')
}

const {
  senderRef,
  bubbleListRef,
  composerValue,
  isLoading,
  isNewConversation,
  expandedSources,
  bubbleItems,
  promptCards,
  scrollBubbleListToBottom,
  setComposerText,
  handleSend,
  copyMessageContent,
  toggleSources,
} = chatState

function syncComposerText() {
  composerValue.value = senderRef.value?.getModelValue?.()?.text || ''
}

onMounted(async () => {
  await nextTick()
  scrollBubbleListToBottom(false)
})
</script>

<template>
  <div class="knowledge-base-chat">
    <div v-if="isNewConversation" class="welcome-block">
      <div class="welcome-logo">AI</div>
      <h1>知识库问答</h1>
      <p>查课程、查班级、查学习流程，先用模拟后端数据演示历史会话切换和 Markdown 渲染。</p>
      <div class="prompt-row">
        <button v-for="prompt in promptCards" :key="prompt" type="button" @click="setComposerText(prompt)">
          {{ prompt }}
        </button>
      </div>
    </div>

    <BubbleList
      ref="bubbleListRef"
      class="bubble-list"
      :list="bubbleItems"
      :auto-scroll="true"
      :smooth-scroll="true"
      :max-height="'100%'"
      :show-back-button="true"
      :always-show-scrollbar="true"
      :item-key="(item) => item.id"
      :btn-loading="isLoading"
      :should-follow-content="() => true"
    >
      <template #item="{ item }">
        <div class="message-row">
          <Bubble
            class="message-item"
            :class="`is-${item.role}`"
            :placement="item.placement"
            :loading="item.loading"
            :no-style="true"
            variant="filled"
            shape="round"
            :max-width="item.role === 'assistant' ? '640px' : '560px'"
          >
            <template #avatar>
              <div v-if="item.role === 'assistant'" class="message-avatar is-assistant">AI</div>
              <div v-else class="message-avatar is-user">我</div>
            </template>

            <template #header>
              <div class="message-meta">
                <strong>{{ item.role === 'assistant' ? 'AI' : '用户' }}</strong>
                <span>{{ item.time }}</span>
              </div>
            </template>

            <template #content>
              <div class="message-stack">
                <div class="message-bubble">
                  <MarkdownRenderer
                    v-if="!item.loading"
                    :class="['markdown-body', { 'markdown-body--assistant': item.role === 'assistant' }]"
                    :markdown="item.content"
                    :enable-latex="true"
                    :enable-shiki="true"
                    :enable-mermaid="true"
                    :enable-animate="true"
                  />
                  <div
                    v-else
                    :class="['markdown-body', { 'markdown-body--assistant': item.role === 'assistant' }]"
                  >
                    <el-skeleton :rows="2" animated />
                  </div>

                  <div v-if="item.sources?.length" class="reference-box">
                    <button class="reference-toggle" type="button" @click.stop="toggleSources(item.id)">
                      <span>检索到参考文档共 {{ item.sources.length }} 篇</span>
                      <el-icon>
                        <ArrowDown v-if="expandedSources[item.id]" />
                        <ArrowRight v-else />
                      </el-icon>
                    </button>

                    <div v-if="expandedSources[item.id]" class="reference-list">
                      <a
                        v-for="(source, index) in item.sources"
                        :key="source"
                        class="reference-item"
                        href="#"
                        @click.prevent
                      >
                        <span class="reference-index">{{ index + 1 }}</span>
                        <span>{{ source }}</span>
                      </a>
                    </div>
                  </div>
                </div>

                <button class="copy-button" type="button" @click.stop="copyMessageContent(item.content)">
                  <el-icon><CopyDocument /></el-icon>
                </button>
              </div>
            </template>

            <template #footer>
              <div class="message-footer-space" />
            </template>

            <template #loading>
              <div class="message-loading">
                <div class="message-meta">
                  <strong>AI</strong>
                  <span>正在生成</span>
                </div>
                <div class="message-bubble loading-bubble">
                  <el-skeleton :rows="1" animated />
                </div>
              </div>
            </template>
          </Bubble>
        </div>
      </template>
    </BubbleList>

    <div class="composer-wrap">
      <XSender
        ref="senderRef"
        class="composer"
        placeholder="发消息或按住空格说话..."
        submit-type="enter"
        :clearable="true"
        :loading="isLoading"
        variant="updown"
        :custom-style="{ minHeight: '86px' }"
        @submit="handleSend"
        @change="syncComposerText"
      >
        <template #prefix>
          <el-button :icon="Plus" circle text />
        </template>
      </XSender>
    </div>
  </div>
</template>

<style scoped>
.knowledge-base-chat {
  position: relative;
  display: grid;
  height: 100%;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr) auto;
  overflow: hidden;
  --kb-composer-space: 196px;
}

.welcome-block {
  width: min(820px, 100%);
  margin: 10px auto 24px;
  text-align: center;
}

.welcome-logo {
  display: grid;
  width: 48px;
  height: 48px;
  margin: 0 auto 14px;
  place-items: center;
  border-radius: 14px;
  background: #2f80ed;
  color: #ffffff;
  font-size: 20px;
  font-weight: 800;
}

.welcome-block h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.25;
}

.welcome-block p {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.prompt-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
}

.prompt-row button {
  max-width: 260px;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fbfbfc;
  color: #4b5563;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.prompt-row button:hover {
  border-color: #bad6ff;
  color: #1d4ed8;
}

.bubble-list {
  flex: 1 1 auto;
  width: 100%;
  max-width: none;
  min-height: 0;
  margin: 0;
  pointer-events: auto;
}

.bubble-list :deep(.elx-bubble-list__list) {
  height: 100%;
  padding: 0 0 var(--kb-composer-space);
}

.bubble-list :deep(.elx-bubble-list__item--custom) {
  width: 100%;
  justify-content: center;
}

.message-row {
  width: min(860px, 100%);
  margin: 0 auto;
}

.message-item {
  width: 100%;
  --el-bubble-avatar-placeholder-width: 32px;
  --el-bubble-avatar-placeholder-height: 32px;
  --el-bubble-avatar-placeholder-gap: 12px;
}

.message-avatar {
  display: grid;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  margin-top: 20px;
  place-items: center;
  border-radius: 50%;
  background: #2f80ed;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
}

.message-avatar.is-assistant {
  background: #e0f2fe;
  color: #0369a1;
}

.message-avatar.is-user {
  background: #dbeafe;
  color: #1d4ed8;
}

.message-stack {
  display: flex;
  width: min(640px, 100%);
  max-width: 100%;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
}

.message-item.is-assistant .message-stack {
  margin-left: auto;
  align-items: flex-end;
}

.message-item.is-user .message-stack,
.message-item.is-user .message-meta {
  align-items: flex-end;
}

.message-bubble {
  max-width: 100%;
  min-width: 0;
  padding: 13px 15px;
  border: 1px solid #e8edf3;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 22px rgb(15 23 42 / 5%);
}

.message-item.is-assistant .message-bubble {
  border-color: #e5eaf2;
  background: #f3f6fa;
}

.message-item.is-user .message-bubble {
  border-color: #bfdbfe;
  background: #ffffff;
  color: #15315f;
}

.message-item.is-user .message-meta {
  justify-content: flex-end;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9aa0aa;
  font-size: 12px;
}

.message-meta strong {
  color: #111827;
  font-size: 13px;
}

.message-footer-space {
  height: 0;
}

.message-loading {
  display: grid;
  gap: 8px;
  width: min(360px, 100%);
}

.message-item.is-assistant .message-loading {
  margin-left: auto;
}

.loading-bubble {
  width: 220px;
}

.message-item.is-assistant .message-meta strong {
  color: #2563eb;
}

.message-item.is-user .message-meta strong {
  color: #1e3a8a;
}

.markdown-body {
  margin-top: 8px;
  color: #1f2937;
  font-size: 15px;
  line-height: 1.8;
  word-break: break-word;
}

.markdown-body--assistant {
  background-color: #f3f6fa !important;
}

.markdown-body :deep(p),
.markdown-body :deep(ul),
.markdown-body :deep(ol),
.markdown-body :deep(blockquote),
.markdown-body :deep(pre),
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin: 0 0 10px;
}

.markdown-body :deep(p:last-child),
.markdown-body :deep(ul:last-child),
.markdown-body :deep(ol:last-child),
.markdown-body :deep(blockquote:last-child),
.markdown-body :deep(pre:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 20px;
}

.markdown-body :deep(li + li) {
  margin-top: 4px;
}

.markdown-body :deep(strong) {
  color: #0f172a;
  font-weight: 700;
}

.markdown-body :deep(code) {
  padding: 0.12em 0.38em;
  border-radius: 6px;
  background: rgb(37 99 235 / 10%);
  color: #1d4ed8;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.92em;
}

.markdown-body :deep(pre) {
  overflow-x: auto;
  padding: 12px 14px;
  border-radius: 8px;
  background: transparent;
  color: #1f2937;
}

.markdown-body :deep(pre code) {
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: inherit;
  font-size: 13px;
  line-height: 1.7;
}

.markdown-body :deep(blockquote) {
  padding: 10px 14px;
  border-left: 3px solid #bfdbfe;
  background: transparent;
  color: #4b5563;
}

.markdown-body :deep(a) {
  color: #2563eb;
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  color: #0f172a;
  font-weight: 700;
  line-height: 1.35;
}

.markdown-body :deep(h1) {
  font-size: 20px;
}

.markdown-body :deep(h2) {
  font-size: 18px;
}

.markdown-body :deep(h3) {
  font-size: 17px;
}

.reference-box {
  margin-top: 12px;
}

.reference-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  line-height: 1.6;
}

.reference-toggle:hover,
.reference-toggle:focus-visible {
  color: #2563eb;
  outline: none;
}

.reference-list {
  display: grid;
  gap: 8px;
  max-height: 112px;
  margin-top: 8px;
  overflow-y: auto;
  padding-right: 6px;
  scrollbar-color: #c8d4e3 #eef2f7;
  scrollbar-width: thin;
}

.reference-list::-webkit-scrollbar {
  width: 6px;
}

.reference-list::-webkit-scrollbar-track {
  border-radius: 999px;
  background: #eef2f7;
}

.reference-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #c8d4e3;
}

.reference-list::-webkit-scrollbar-thumb:hover {
  background: #aebdd0;
}

.reference-item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 7px;
  align-items: start;
  color: #0b63e5;
  font-size: 13px;
  line-height: 1.55;
  text-decoration: none;
}

.reference-item:hover {
  color: #0046b8;
}

.reference-index {
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
  border-radius: 50%;
  background: #2563eb;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.copy-button {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  margin-top: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #7b8492;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.copy-button:hover,
.copy-button:focus-visible {
  border-color: #bfdbfe;
  background: #f8fbff;
  color: #2563eb;
  outline: none;
}

.composer-wrap {
  position: absolute;
  right: 24px;
  bottom: 20px;
  left: 24px;
  width: min(1000px, calc(100% - 48px));
  margin: 0 auto;
  border: 1px solid #8ec5ff;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 18px 44px rgb(37 99 235 / 16%);
}

.knowledge-base-chat :deep(.elx-bubble-list) {
  height: 100%;
}

.composer {
  border-radius: 18px;
}

@media (max-width: 640px) {
  .knowledge-base-chat {
    --kb-composer-space: 176px;
  }

  .message-stream {
    padding: 20px 14px 168px;
  }

  .bubble-list :deep(.elx-bubble-list__list) {
    padding-right: 0;
  }

  .composer-wrap {
    right: 12px;
    left: 12px;
    width: calc(100% - 24px);
  }

  .message-bubble {
    max-width: 100%;
  }
}
</style>
