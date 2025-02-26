<template>
  <v-app>
    <div class="main-layout">
      <SidebarMenu ref="sidebarRef" :collapsed="isSidebarCollapsed" />
      <div class="main-content" :class="{ collapsed: isSidebarCollapsed }">
        <Header @toggleSidebar="toggleSidebar" />

        <template v-if="isLoading">
          <!-- ✅ Loading Page -->
          <div class="loading-overlay">
            <div class="loading-spinner"></div>
            <p>กำลังโหลดข้อมูลอุปกรณ์...</p>
          </div>
        </template>

        <template v-else>
          <!-- ✅ Router View (แสดงเมื่อโหลดเสร็จ) -->
          <div class="page-content">
            <router-view />
          </div>
        </template>
      </div>
      <div class="footer-text">2024 Power by ECX Innovation Co., Ltd.</div>
    </div>
  </v-app>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useDeviceStore } from "@/stores/deviceStore";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import { useDeviceSettingStore } from "@/stores/deviceStoreSetting";
import { useAuthStore } from "@/stores/authStore";
import {
  connectMQTT,
  publishMessage,
  subscribeUserTopics,
  disconnectMQTT,
} from "@/services/mqttService";
import SidebarMenu from "@/components/SidebarMenu.vue";
import Header from "@/components/Header.vue";

const deviceStore = useDeviceStore();
const authStore = useAuthStore();
const deviceStatusStore = useDeviceStatusStore();
const deviceSettingStore = useDeviceSettingStore();
const sidebarRef = ref(null);
const isLoading = ref(true); // ✅ ใช้เพื่อแสดงหน้า Loading
const isSidebarCollapsed = ref(false);


const toggleSidebar = () => {
  if (
    sidebarRef.value &&
    typeof sidebarRef.value.toggleCollapse === "function"
  ) {
    sidebarRef.value.toggleCollapse();
  } else {
    console.error("SidebarMenu.vue is not properly referenced!");
  }
};

// ✅ ฟังก์ชันหลัก: เชื่อมต่อ MQTT → Subscribe → ขอ Settings
const initializeDevices = async () => {
  console.log("🚀 Connecting to MQTT...");
  await connectMQTT();

  console.log("📡 Subscribing to all user device topics...");
  await subscribeUserTopics(); // ✅ รอให้สมัครสมาชิกเสร็จก่อนทำอย่างอื่น

  console.log("📡 Requesting settings for all devices...");

  for (const device of deviceStore.devices) {
    const settingTopic = `device/${device.serialNumber}/get/setting`;
    console.log(`📡 Requesting settings from ${device.serialNumber}...`);

    let isReceived = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (deviceStatusStore.isDeviceOnline(device.serialNumber)) {
        console.log(`✅ Device ${device.serialNumber} responded with settings`);
        isReceived = true;
        break; // 🛑 ออกจากลูปทันทีเมื่อได้รับการตอบกลับ
      }

      console.warn(
        `⚠️ Attempt ${attempt}: Requesting settings from ${device.serialNumber}`
      );
      publishMessage(settingTopic, ""); // ✅ ขอ setting

      if (attempt < 3) {
        // ⏳ รอ 5 วินาทีก่อนลองใหม่ (ถ้าไม่ใช่รอบสุดท้าย)
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    if (!isReceived) {
      console.warn(
        `❌ Device ${device.serialNumber} did not respond after 3 attempts`
      );
      deviceStatusStore.setDeviceOffline(device.serialNumber); // ❌ ถือว่า Offline
    }

    // ✅ โหลดข้อมูลเพิ่มเติมจากฐานข้อมูล MongoDB
    console.log(`📡 Mapping DB data for ${device.serialNumber}`);
    await deviceSettingStore.loadValveMetadataFromDB(
      device.serialNumber,
      authStore.token
    );
  }

  isLoading.value = false; // ✅ ปิดหน้า Loading หลังจากโหลดเสร็จ
};

// ✅ เรียก `initializeDevices()` เมื่อ Component โหลด
onMounted(() => {
  initializeDevices();
});

// ✅ ปิด MQTT เมื่อ Component ออกจาก Layout
onUnmounted(() => {
  console.log("❌ Disconnecting from MQTT...");
  disconnectMQTT();
});
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
}

.main-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.page-content {
  flex-grow: 1;
  overflow: overlay;
  padding: 1rem;
  transition: margin-left 0.3s ease-in-out;
  min-height: 80vh;
}

.page-content::-webkit-scrollbar {
  display: none;  /* ✅ ซ่อน Scroll ใน Chrome, Safari */
}

.collapsed .page-content {
  margin-left: 5px;
}

/* ✅ Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  color: white;
  font-size: 1.2rem;
}

/* ✅ Loading Spinner */
.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #fff;
  border-top: 5px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

.footer-text {
  position: fixed;
  bottom: 10px;
  right: 20px;
  font-size: 14px;
  color: #9e9e9e;
  font-weight: 400;
  text-align: right;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* ✅ Fade Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
