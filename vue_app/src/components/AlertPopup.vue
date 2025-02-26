<template>
  <div v-if="isVisible" class="popup-overlay">
    <div class="popup-container">
      <!-- Header -->
      <div class="popup-header">
        <h3>{{ title }}</h3>
        <button @click="closePopup" class="close-btn" aria-label="Close Popup">✕</button>
      </div>
      <!-- Body -->
      <div class="popup-body">
        <p>{{ message }}</p>
      </div>
      <!-- Footer -->
      <div class="popup-footer">
        <button @click="confirmAction" class="confirm-btn">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    title: {
      type: String,
      default: 'แจ้งเตือน',
    },
    message: {
      type: String,
      required: true,
    },
    confirmText: {
      type: String,
      default: 'ตกลง',
    },
    isVisible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close', 'confirm'],
  methods: {
    closePopup() {
      this.$emit('close') // Event ปิด Popup
    },
    confirmAction() {
      this.$emit('confirm') // Event ยืนยัน
    },
  },
}
</script>

<style scoped>
/* พื้นหลังของ Popup */
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5); /* พื้นหลังโปร่งแสง */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

/* กล่อง Popup */
.popup-container {
  background: white;
  border-radius: 8px; /* มุมโค้ง */
  width: 50%;
  max-width: 90%;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2); /* เงา */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* ตัดส่วนเกิน */
}

/* Header */
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #ddd; /* เส้นใต้ */
}

.popup-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 500;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #333;
}

/* Body */
.popup-body {
  padding: 1rem;
  text-align: center;
  font-size: 1rem;
  color: #555;
}

/* Footer */
.popup-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  border-top: 1px solid #ddd; /* เส้นขอบด้านบน */
}

.confirm-btn {
  background-color: #135200;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
}

.confirm-btn:hover {
  background-color: #0f4000; /* สีเมื่อ hover */
}
</style>
