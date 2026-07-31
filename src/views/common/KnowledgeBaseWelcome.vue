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
    <div class="welcome-copy">
      <span class="welcome-sticker">AI EXPLORATION LAB</span>
      <h1>AI 探索乐园</h1>
      <p>把好奇心变成问题，和知识库一起动手找答案。</p>
      <div class="welcome-actions" aria-hidden="true">
        <span class="welcome-chip">ASK</span>
        <span class="welcome-chip">MAKE</span>
        <span class="welcome-chip">DISCOVER</span>
      </div>
    </div>
    <div class="welcome-art" aria-hidden="true">
      <span class="welcome-orbit orbit-main"><i></i></span>
      <span class="welcome-orbit orbit-side"></span>
      <span class="welcome-note note-idea">IDEA</span>
      <span class="welcome-note note-go">GO!</span>
      <span class="welcome-star star-a">+</span>
      <span class="welcome-star star-b">*</span>
      <span class="welcome-dot dot-pink"></span>
      <span class="welcome-dot dot-mint"></span>
    </div>
    <div class="prompt-row">
      <button v-for="prompt in prompts" :key="prompt" type="button" @click="emit('select-prompt', prompt)">
        {{ prompt }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.welcome-block {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(250px, 0.72fr);
  align-items: center;
  width: min(960px, 100%);
  min-height: 254px;
  margin: clamp(34px, 7vh, 76px) auto 24px;
  padding: 30px 36px 28px;
  overflow: hidden;
  border: 2px solid #3d3564;
  border-radius: 9px;
  background: linear-gradient(118deg, #e8e4ff 0%, #f9ddec 48%, #d3f2f2 100%);
  box-shadow: 7px 8px 0 rgb(61 53 100 / 58%);
  text-align: left;
}

.welcome-copy {
  position: relative;
  z-index: 2;
  max-width: 560px;
}

.welcome-sticker,
.welcome-chip,
.welcome-note {
  display: inline-flex;
  align-items: center;
  border: 1px solid #3d3564;
  border-radius: 5px;
  box-shadow: 2px 3px 0 rgb(61 53 100 / 20%);
  color: #3d3564;
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-weight: 900;
  letter-spacing: 0;
}

.welcome-sticker {
  min-height: 26px;
  padding: 4px 9px;
  background: #fff1a8;
  font-size: 11px;
  transform: rotate(-3deg);
}

.welcome-block h1 {
  margin: 16px 0 8px;
  color: #3d3564;
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: clamp(38px, 5vw, 58px);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.08;
}

.welcome-block p {
  max-width: 480px;
  margin: 0;
  color: #4e4473;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.7;
}

.welcome-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.welcome-chip {
  min-height: 24px;
  padding: 3px 8px;
  background: rgb(255 255 255 / 72%);
  font-size: 10px;
}

.welcome-art {
  position: absolute;
  inset: 0 0 0 auto;
  width: 45%;
  pointer-events: none;
}

.welcome-orbit {
  position: absolute;
  display: block;
  border: 2px dashed #3d3564;
  border-radius: 50%;
  opacity: 0.65;
  animation: welcome-orbit 15s linear infinite;
}

.orbit-main {
  top: 20px;
  right: 40px;
  width: 248px;
  aspect-ratio: 1.35;
  transform: rotate(-18deg);
}

.orbit-main i {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 68px;
  aspect-ratio: 1;
  border: 2px solid #3d3564;
  border-radius: 50%;
  background: #9de4eb;
  box-shadow: 5px 5px 0 rgb(61 53 100 / 18%);
  transform: translate(-50%, -50%);
}

.orbit-side {
  right: 75px;
  bottom: 18px;
  width: 194px;
  aspect-ratio: 1.35;
  border-color: #ee91bb;
  transform: rotate(26deg);
  animation-direction: reverse;
}

.welcome-note {
  position: absolute;
  display: grid;
  min-width: 60px;
  min-height: 40px;
  place-items: center;
  padding: 5px 8px;
  font-size: 11px;
  animation: welcome-float 6s ease-in-out infinite;
}

.note-idea { top: 48px; right: 128px; background: #fff1a8; transform: rotate(7deg); }
.note-go { right: 28px; bottom: 42px; background: #9de4eb; transform: rotate(-6deg); animation-delay: -3s; }

.welcome-star {
  position: absolute;
  color: #8178cf;
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 34px;
  font-weight: 900;
  animation: welcome-breathe 4.5s ease-in-out infinite;
}

.star-a { top: 30px; right: 16px; }
.star-b { right: 222px; bottom: 20px; color: #ee91bb; animation-delay: -2s; }

.welcome-dot {
  position: absolute;
  width: 16px;
  aspect-ratio: 1;
  border: 1px solid #3d3564;
  border-radius: 50%;
  animation: welcome-float 7s ease-in-out infinite;
}

.dot-pink { top: 108px; right: 278px; background: #ee91bb; }
.dot-mint { right: 188px; bottom: 28px; background: #52bbc4; animation-delay: -4s; }

.prompt-row {
  position: relative;
  z-index: 3;
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: 100%;
  gap: 12px;
  margin-top: 24px;
}

.prompt-row button {
  display: flex;
  min-height: 92px;
  align-items: flex-start;
  padding: 16px 18px;
  border: 1px solid rgb(61 53 100 / 62%);
  border-radius: 6px;
  background: rgb(255 255 255 / 90%);
  box-shadow: 4px 5px 0 rgb(61 53 100 / 14%);
  color: #3d3564;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.6;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.prompt-row button:hover {
  border-color: #3d3564;
  background: #fff1f7;
  box-shadow: 6px 7px 0 rgb(61 53 100 / 22%);
  color: #4e4473;
  transform: translate(-2px, -2px);
}

.prompt-row button:focus-visible {
  outline: 3px solid #fff1a8;
  outline-offset: 3px;
}

@keyframes welcome-orbit { to { rotate: 360deg; } }
@keyframes welcome-breathe { 50% { opacity: 0.5; transform: scale(1.1); } }
@keyframes welcome-float { 50% { translate: 0 -7px; } }

@media (max-width: 720px) {
  .welcome-block {
    grid-template-columns: 1fr;
    min-height: 430px;
    padding: 26px 22px 22px;
  }

  .welcome-art {
    top: auto;
    bottom: 130px;
    width: 64%;
    opacity: 0.48;
  }

  .prompt-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .welcome-block {
    min-height: 520px;
    margin-top: 24px;
  }

  .welcome-block h1 { font-size: 40px; }
  .welcome-block p { font-size: 14px; }

  .welcome-art {
    right: -24px;
    bottom: 198px;
    width: 72%;
    opacity: 0.34;
  }

  .orbit-main { right: -18px; width: 210px; }
  .orbit-side { right: 14px; width: 160px; }
  .star-b,
  .dot-pink { display: none; }

  .prompt-row { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
