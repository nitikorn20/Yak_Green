<template>
  <v-container>
    <h2 class="mb-4">คำสั่งรดน้ำ</h2>

    <!-- ✅ Simple Fullscreen Loading -->
    <div v-if="isLoading" class="loading-screen">
      <v-progress-circular
        indeterminate
        size="64"
        color="primary"
      ></v-progress-circular>
      <p class="loading-text">กำลังบันทึกข้อมูล กรุณารอสักครู่...</p>
    </div>

    <p v-if="!onlineDevice" class="offline-message">
      🔴 ไม่มีอุปกรณ์ออนไลน์ กรุณาตรวจสอบการเชื่อมต่อของอุปกรณ์
    </p>

    <div v-if="onlineDevice">
      <p class="mb-4">
        จำนวนคำสั่ง
        <b class="text-green-darken-2">Active {{ activePrograms }}/5</b>
      </p>

      <v-row>
        <v-col
          v-for="program in programs"
          :key="program.index"
          cols="12"
          md="6"
          lg="4"
        >
          <WateringProgramCard
            :program="program"
            @toggle="toggleProgram"
            @edit="editProgram"
          />
        </v-col>
      </v-row>
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
import { computed, ref } from "vue";
import { useDeviceSettingStore } from "@/stores/deviceStoreSetting";
import { useDeviceStore } from "@/stores/deviceStore";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import { publishMessage, waitForMqttResponse } from "@/services/mqttService";
import WateringProgramCard from "@/components/WateringProgramCard.vue";

const deviceStore = useDeviceStore();
const deviceSettingStore = useDeviceSettingStore();
const deviceStatusStore = useDeviceStatusStore();

const isLoading = ref(false); // ✅ ใช้ควบคุม Fullscreen Loading
const snackbar = ref({
  show: false,
  text: "",
  title: "แจ้งเตือน", // ✅ เพิ่ม Title
});

const programs = computed(() => deviceSettingStore.getProgramSettings());

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

// ✅ คำนวณจำนวน Active Programs
const activePrograms = computed(
  () => programs.value.filter((p) => p.enabled).length
);

// ✅ เปิด-ปิดโปรแกรม และส่งค่า MQTT พร้อมรอการตอบกลับ
const toggleProgram = async (program) => {
  console.log(
    `✅ Toggled Program ${program.index + 1}: ${program.enabled ? "เปิด" : "ปิด"}`
  );

  // ✅ ตรวจสอบว่ามีการตั้งค่าครบหรือไม่
  if (!program.days || program.valves.length === 0 || program.duration === 0) {
    console.warn(
      `⚠️ ไม่สามารถเปิดใช้งาน Program ${program.index + 1} เพราะยังไม่ได้ตั้งค่า!`
    );
    snackbar.value = {
      show: true,
      title: "แจ้งเตือน",
      text: `⚠️ ไม่สามารถเปิดใช้งาน Program ${program.index + 1} เพราะยังไม่ได้ตั้งค่า!`,
    };
    // ✅ คืนค่า enabled กลับเป็นค่าก่อนหน้า
    program.enabled = !program.enabled;
    return; // ⛔ หยุดการทำงาน และไม่ส่งไป Hardware
  }

  // ✅ สร้าง Payload ที่เหมือนกับ `saveProgram` แต่เปลี่ยนเฉพาะ enabled
  const payload = {
    index: parseInt(program.index, 10),
    hh: parseInt(program.hh, 10),
    mm: parseInt(program.mm, 10),
    duration: parseInt(program.duration, 10),
    days: parseInt(program.days, 10),
    valves: program.valves.map((v) => parseInt(v, 10)), // ✅ แปลง array ให้เป็น int[]
    enabled: program.enabled, // ✅ ค่าที่จะส่ง (true/false)
  };

  console.log("📡 ส่งคำสั่งเปิด-ปิดโปรแกรมไปยัง MQTT:", payload);
  isLoading.value = true; // ✅ เปิด Loading
  try {
    const publishTopic = `device/${deviceStore.devices[0].serialNumber}/post/program`;
    const responseTopic = `server/${deviceStore.devices[0].serialNumber}/post/response`;

    publishMessage(publishTopic, JSON.stringify(payload));

    // ✅ รอ Hardware ตอบกลับภายใน 5 วินาที
    const response = await waitForMqttResponse(responseTopic, 5000);

    if (response.status === "ok") {
      console.log(`✅ Hardware ตอบกลับ: เปิด-ปิดโปรแกรมสำเร็จ!`);

      // ✅ อัปเดต Store เพื่อสะท้อนค่า enabled ที่เปลี่ยน
      deviceSettingStore.updateProgramSetting(
        program.index,
        "enabled",
        program.enabled
      );
    } else {
      console.error(
        `❌ Hardware ปฏิเสธการเปลี่ยนค่า enabled:`,
        response.reason
      );
      snackbar.value = {
        show: true,
        title: "แจ้งเตือน",
        text: `❌ เปลี่ยนค่า enabled ไม่สำเร็จ: ${response.reason}`,
      };

      // ✅ คืนค่า enabled กลับเป็นค่าก่อนหน้า
      program.enabled = !program.enabled;
    }
  } catch (error) {
    console.error("❌ ไม่ได้รับการตอบกลับจาก Hardware:", error);
    snackbar.value = {
      show: true,
      title: "แจ้งเตือน",
      text: "❌ ไม่ได้รับการตอบกลับจาก Hardware",
    };

    // ✅ คืนค่า enabled กลับเป็นค่าก่อนหน้า
    program.enabled = !program.enabled;
  }
  isLoading.value = false; // ✅ เปิด Loading
};

// ✅ แก้ไขโปรแกรม
const editProgram = (program) => {
  console.log(`📝 Editing Program ${program.index + 1}`);
};
</script>

<style scoped>
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
