<template>
  <div class="login-container">
    <img :src="theme.logoUrl" alt="Logo" class="logo" />
    <p class="subtitle">Watering Management System</p>

    <form @submit.prevent="handleLogin">
      <div class="form-group">
        <label for="email">Email:</label>
        <input
          type="email"
          id="email"
          v-model="email"
          placeholder="example@example.com"
          autocomplete="email"
          required
        />
      </div>

      <div class="form-group">
        <label for="password">Password:</label>
        <div class="password-wrapper">
          <input
            :type="passwordVisible ? 'text' : 'password'"
            id="password"
            v-model="password"
            placeholder="Your Password"
            autocomplete="current-password"
            required
          />
          <button
            type="button"
            class="toggle-password"
            @click="togglePasswordVisibility"
            aria-label="Toggle Password Visibility"
          >
            <font-awesome-icon
              :icon="['fas', passwordVisible ? 'eye' : 'eye-slash']"
            />
          </button>
        </div>
      </div>

      <button type="submit" class="login-btn">เข้าสู่ระบบ</button>
    </form>

    <a href="#" @click.prevent="showForgotPasswordPopup" class="forgot-password"
      >ลืมรหัสผ่าน</a
    >
    <p class="footer-text">
      Email กับ Password ที่ใช้งานได้จะได้รับจากผู้ดูแลระบบ <br />
      สำหรับผู้ที่สนใจใช้งานระบบ กรุณาติดต่อผ่านทาง
      <a
        href="https://www.yakgreen.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        www.yakgreen.com
      </a>
    </p>

    <!-- ป๊อปอัพสำหรับแจ้งเตือนเมื่อเกิดข้อผิดพลาด -->
    <AlertPopup
      :isVisible="showAlert"
      :title="alertTitle"
      :message="alertMessage"
      confirmText="ตกลง"
      @close="showAlert = false"
      @confirm="showAlert = false"
    />

    <!-- ป๊อปอัพสำหรับลืมรหัสผ่าน -->
    <AlertPopup
      :isVisible="isForgotPasswordPopupVisible"
      title="ลืมรหัสผ่าน"
      message="กรุณาส่ง Email ของคุณมายังเราเพื่อรีเซ็ตรหัสผ่านผ่านทาง Email: ecx.nitikorn@gmail.com"
      confirmText="ตกลง"
      @close="closeForgotPasswordPopup"
      @confirm="confirmForgotPassword"
    />
  </div>
</template>

<script setup>
import { ref, nextTick } from "vue";
import axiosInstance from "@/utils/axiosInstance";
import theme from "../theme";
import { useAuthStore } from "../stores/authStore";
import AlertPopup from "./AlertPopup.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const router = useRouter();
// เพิ่มไอคอนที่ต้องการใน FontAwesome library
library.add(faEye, faEyeSlash);

const email = ref("");
const password = ref("");
const passwordVisible = ref(false);
const showAlert = ref(false);
const alertTitle = ref("แจ้งเตือน");
const alertMessage = ref("");
const isForgotPasswordPopupVisible = ref(false);

const API_BASE_URL = process.env.VITE_BASE_URL || "https://yakgreen.farmbird.live"; // ✅ ตรวจสอบทุกทาง

const togglePasswordVisibility = () => {
  passwordVisible.value = !passwordVisible.value;
};

const handleLogin = async () => {
  try {
    const response = await axiosInstance.post(`${API_BASE_URL}/api/auth/login`, {
      email: email.value,
      password: password.value,
    });

    if (response.data.token) {
      authStore.setUser({
        token: response.data.token,
        userId: response.data.userId,
        email: response.data.email,
        role: response.data.role,
      });
      console.log(response.data);
      // ✅ ใช้ router.push() ทันที ไม่ต้อง setTimeout()
      await nextTick();
      router.push("/dashboard");
    } else {
      showAlert.value = true;
      alertMessage.value = "⚠️ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
    }
  } catch (error) {
    showAlert.value = true;
    alertMessage.value =
      error.response?.status === 401
        ? "❌ Email หรือ Password ไม่ถูกต้อง"
        : "❌ มีปัญหาภายในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง";
  }
};

const showForgotPasswordPopup = () => {
  isForgotPasswordPopupVisible.value = true;
};

const closeForgotPasswordPopup = () => {
  isForgotPasswordPopupVisible.value = false;
};

const confirmForgotPassword = () => {
  isForgotPasswordPopupVisible.value = false;
};
</script>

<style scoped>
.logo {
  width: 50%;
  height: auto;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1rem;
  margin-bottom: 1.5rem;
  font-weight: bold;
}

.form-group {
  margin-bottom: 1rem;
  text-align: left;
}

input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.password-wrapper {
  position: relative;
}

.toggle-password {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
}

.login-btn {
  background-color: #135200;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  width: 100%;
  margin-top: 1rem;
}

.forgot-password {
  display: block;
  margin-top: 1rem;
  text-decoration: none;
  color: #1890ff;
}

.footer-text {
  font-size: 0.8rem;
  margin-top: 1.5rem;
  color: #555;
}
</style>
