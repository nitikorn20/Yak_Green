<template>
  <v-container>
    <h2 class="mb-4">ส่งคำสั่ง</h2>
    <p v-if="!onlineDevice" class="offline-message">
      🔴 ไม่มีอุปกรณ์ออนไลน์ กรุณาตรวจสอบการเชื่อมต่อของอุปกรณ์
    </p>

    <div v-if="onlineDevice">
      <div>
        <TimeUpdateCard />
      </div>
    </div>
  </v-container>
</template>

<script setup></script>

<style scoped>
.offline-message {
  color: red;
  font-weight: bold;
  text-align: center;
  padding: 20px;
}
</style>

<script setup>
import TimeUpdateCard from "../components/TimeUpdateCard.vue";

import { useDeviceStore } from "@/stores/deviceStore";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import { useAuthStore } from "@/stores/authStore";
import { computed } from "vue";
import ValveTable from "@/components/ValveTable.vue"; // ✅ Import ValveTable

const deviceStore = useDeviceStore();
const deviceStatusStore = useDeviceStatusStore();
const authStore = useAuthStore();

const deviceList = computed(() => {
  return deviceStore.devices.map((device) => ({
    ...device,
    isOnline: deviceStatusStore.deviceStatus[device.serialNumber] || false, // ✅ ใช้ค่าอัปเดตจริงจาก store
  }));
});

// ✅ อัปเดต `onlineDevice` แบบเรียลไทม์
const onlineDevice = computed(() => {
  return deviceList.value.find((device) => device.isOnline);
});
</script>
