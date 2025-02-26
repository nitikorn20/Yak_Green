<template>
  <div class="auth-layout" :style="{ backgroundColor: theme.primaryColor }">
    <div class="auth-container">
      <slot></slot>
      <!-- เนื้อหาของหน้า Login จะถูกแทรกที่นี่ -->
    </div>
  </div>
</template>

<script>
import theme from '../theme'

export default {
  data() {
    return {
      theme,
    }
  },
}
</script>

<style scoped>
.auth-layout {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.auth-container {
  background-color: #ffffff;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
  width: 400px;
}

@media (max-width: 768px) {
  .auth-container {
    width: 90%;
  }
}
</style>
