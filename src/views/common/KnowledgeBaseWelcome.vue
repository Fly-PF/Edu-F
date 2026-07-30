<script setup>
defineProps({
  prompts: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['select-prompt'])
</script>

<template>
  <div class="welcome-block">
    <div class="welcome-logo">AI</div>
    <h1>知识库问答</h1>
    <div class="prompt-row">
      <button v-for="prompt in prompts" :key="prompt" type="button" @click="emit('select-prompt', prompt)">
        {{ prompt }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.welcome-block {
  width: min(960px, 100%);
  margin: clamp(56px, 10vh, 112px) auto 24px;
  text-align: center;
}

.welcome-logo {
  display: grid;
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  place-items: center;
  border-radius: 16px;
  background: #2f80ed;
  box-shadow: 0 8px 18px rgba(47, 128, 237, 0.2);
  color: #ffffff;
  font-size: 21px;
  font-weight: 800;
}

.welcome-block h1 {
  margin: 0;
  color: #1f2d44;
  font-size: 32px;
  line-height: 1.3;
}

.prompt-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: min(960px, 100%);
  gap: 12px;
  margin: 28px auto 0;
}

.prompt-row button {
  display: flex;
  min-height: 92px;
  padding: 16px 18px;
  border: 1px solid #d7e4f4;
  border-radius: 8px;
  background: #fbfdff;
  box-shadow: 0 2px 7px rgba(34, 74, 128, 0.04);
  color: #3a4a61;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.6;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.prompt-row button:hover {
  border-color: #80b2f3;
  background: #f6faff;
  box-shadow: 0 8px 18px rgba(47, 128, 237, 0.12);
  color: #1d4ed8;
  transform: translateY(-1px);
}

.prompt-row button:focus-visible {
  outline: 2px solid #80b2f3;
  outline-offset: 2px;
}

@media (max-width: 720px) {
  .prompt-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .prompt-row {
    grid-template-columns: 1fr;
  }
}
</style>
