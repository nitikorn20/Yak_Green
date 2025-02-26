<template>
  <v-container>
    <h2 class="mb-4">จัดการอุปกรณ์</h2>

    <p v-if="!onlineDevice" class="offline-message">
      🔴 ไม่มีอุปกรณ์ออนไลน์ กรุณาตรวจสอบการเชื่อมต่อของอุปกรณ์
    </p>

    <!-- ✅ Simple Fullscreen Loading -->
    <div v-if="isLoading" class="loading-screen">
      <v-progress-circular
        indeterminate
        size="64"
        color="primary"
      ></v-progress-circular>
      <p class="loading-text">กำลังบันทึกข้อมูล กรุณารอสักครู่...</p>
    </div>

    <div v-if="onlineDevice">
      <!-- ✅ Tab แบ่งกลุ่ม Valve (5 ตัวต่อกลุ่ม) -->
      <v-expansion-panels>
        <v-expansion-panel v-for="(group, index) in groupedValves" :key="index">
          <v-expansion-panel-title>
            <strong>{{ group.title }}</strong>
            <v-chip class="ml-2" color="green" size="small">
              Open {{ group.openCount }}
            </v-chip>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row>
              <v-col v-for="valve in group.valves" :key="valve.id" cols="12">
                <v-card class="pa-3">
                  <v-row align="center" justify="space-between">
                    <v-col cols="2"
                      ><strong>VID {{ valve.id }}</strong></v-col
                    >
                    <v-col cols="2">
                      <v-chip :color="valve.status ? 'green' : 'red'">
                        {{ valve.status ? "Online" : "Offline" }}
                      </v-chip>
                    </v-col>
                    <v-col cols="6">
                      <span>{{ valve.name }}</span>
                    </v-col>
                    <v-col cols="2">
                      <v-switch
                        v-model="valve.enable"
                        :disabled="!valve.install"
                        @change="toggleValve(valve)"
                        :label="valve.enable ? 'ON' : 'OFF'"
                        :color="valve.enable ? 'teal-darken-4' : 'grey'"
                        inset
                      />
                    </v-col>
                  </v-row>
                </v-card>
              </v-col>
            </v-row>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <!-- ✅ Snackbar แจ้งเตือน -->
    <v-snackbar
      v-model="snackbar.show"
      vertical
      :timeout="3000"
      color="#006d75"
    >
      <div class="flex items-center space-x-3 text-white p-3">
        <!-- ✅ ข้อความ -->
        <div>
          <div class="font-bold text-lg">{{ snackbar.title }}</div>
          <p class="text-sm">{{ snackbar.text }}</p>
        </div>
      </div>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { publishMessage, waitForMqttResponse } from "@/services/mqttService";
import { useDeviceSettingStore } from "@/stores/deviceStoreSetting";
import { useDeviceStore } from "@/stores/deviceStore";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";

const deviceStore = useDeviceStore();
const deviceSettingStore = useDeviceSettingStore();
const deviceStatusStore = useDeviceStatusStore();

const serialNumber = computed(() => deviceStore.devices[0]?.serialNumber);
const valveSettings = ref([...deviceSettingStore.valveSettings]); // ✅ ใช้ ref() แทน
const isLoading = ref(false); // ✅ ใช้ควบคุม Fullscreen Loading

const snackbar = ref({
  show: false,
  text: "",
  title: "แจ้งเตือน", // ✅ เพิ่ม Title
});

// ✅ ตรวจสอบว่าอุปกรณ์ออนไลน์หรือไม่
const onlineDevice = computed(() => {
  return (
    serialNumber.value && deviceStatusStore.isDeviceOnline(serialNumber.value)
  );
});

// ✅ Watch คอยฟังการเปลี่ยนแปลงของ Store และอัปเดต UI
watch(
  () => deviceSettingStore.valveSettings, // ✅ ฟังการเปลี่ยนแปลงของ Store
  (newValveSettings) => {
    console.log("🔄 Valve settings changed:", newValveSettings);
    valveSettings.value = [...newValveSettings]; // ✅ อัปเดตค่าใน ref() ได้
  },
  { deep: true, immediate: true }
);

// ✅ แบ่ง Valve เป็นกลุ่ม ๆ ละ 5 ตัว และคำนวณจำนวนที่เปิดใช้งาน
const groupedValves = computed(() => {
  let groups = [];
  for (let i = 0; i < valveSettings.value.length; i += 5) {
    const valves = valveSettings.value.slice(i, i + 5);
    groups.push({
      title: `VID ${String(i + 1).padStart(3, "0")} - ${String(i + 5).padStart(3, "0")}`,
      valves: valves,
      openCount: valves.filter((v) => v.enable).length, // ✅ คำนวณจำนวนที่ `enable: true`
    });
  }
  return groups;
});

// ✅ Toggle เปิด-ปิดวาล์ว และส่งค่าไปยัง ESP32
const toggleValve = async (valve) => {
  if (!valve.install) {
    console.warn(`⚠️ Valve ${valve.id} is not installed, cannot toggle.`);
    return;
  }

  console.log(`🔄 Toggling Valve ${valve.id} enable state: ${valve.enable}`);

  // ✅ สร้าง Payload JSON สำหรับส่งไปยัง ESP32
  const payload = {
    index: valve.id, // ใช้ index ตามโค้ดของ ESP32
    enable: valve.enable,
  };

  console.log("📡 ส่งข้อมูลไปยัง /post/valve:", payload);
  isLoading.value = true; // ✅ เปิด Loading
  try {
    // ✅ ส่งข้อมูลผ่าน MQTT
    const publishTopic = `device/${deviceStore.devices[0].serialNumber}/post/valve`;
    const responseTopic = `server/${deviceStore.devices[0].serialNumber}/post/response`;

    publishMessage(publishTopic, JSON.stringify(payload));

    console.log(`📡 รอการตอบกลับจาก Hardware ที่ ${responseTopic}`);

    // ✅ รอการตอบกลับจาก ESP32 ภายใน 5 วินาที
    const response = await waitForMqttResponse(responseTopic, 5000);
    if (response.status === "ok") {
      console.log(
        `✅ Hardware ตอบกลับ: วาล์ว ${valve.id} เปลี่ยนค่า enable สำเร็จ`
      );

      snackbar.value = {
        show: true,
        title: "แจ้งเตือน",
        text: "✅ อัปเดตสถานะวาล์วสำเร็จ!",
      };

      // ✅ อัปเดตค่าใน store เพื่อสะท้อนค่า enable ที่เปลี่ยน
      deviceSettingStore.updateValveSetting(valve.id, "enable", valve.enable);
    } else {
      console.error(`❌ Hardware ปฏิเสธการเปลี่ยนค่า enable:`, response.reason);
      snackbar.value = {
        show: true,
        title: "แจ้งเตือน",
        text: `❌ ไม่สามารถเปลี่ยนสถานะวาล์ว ${valve.id}: ${response.reason}`,
      };

      // ✅ คืนค่า enable กลับเป็นค่าเดิม
      valve.enable = !valve.enable;
    }
  } catch (error) {
    console.error("❌ ไม่ได้รับการตอบกลับจาก Hardware:", error);
    snackbar.value = {
      show: true,
      title: "แจ้งเตือน",
      text: "❌ ไม่ได้รับการตอบกลับจาก Hardware",
    };
    // ✅ คืนค่า enable กลับเป็นค่าเดิม
    valve.enable = !valve.enable;
  }
  isLoading.value = false; // ✅ เปิด Loading
};
</script>

<style scoped>
/* ✅ ปรับขนาด UI */
.v-expansion-panel-title {
  display: flex;
  justify-content: space-between;
}

.offline-message {
  color: red;
  font-weight: bold;
  text-align: center;
  padding: 20px;
}

.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.85); /* ✅ ปรับความโปร่งใส */
  z-index: 9999; /* ✅ ให้ Overlay อยู่ด้านบนสุด */
}

.loading-text {
  margin-top: 12px;
  font-size: 18px;
  color: #333;
  font-weight: bold;
}
</style>
