<template>
  <!-- ✅ Simple Fullscreen Loading -->
  <div v-if="isLoading" class="loading-screen">
    <v-progress-circular
      indeterminate
      size="64"
      color="primary"
    ></v-progress-circular>
    <p class="loading-text">กำลังบันทึกข้อมูล กรุณารอสักครู่...</p>
  </div>

  <v-card class="time-card">
    <v-card-title class="time-title">เวลานาฬิกาในบอร์ดปัจจุบัน</v-card-title>

    <v-card-title>
      <p class="time-display">
        วัน
        <span class="wday-value">{{ getDayName(currentTime.dayofweeks) }} </span
        >เวลา
        <span class="time-value">{{
          formatTime(currentTime.hh, currentTime.mm)
        }}</span>
        น.
        <v-icon class="edit-icon" @click="openEditDialog">mdi-pencil</v-icon>
      </p>
    </v-card-title>

    <v-card-actions class="button-group">
      <!-- ✅ ปุ่ม "อัปเดตอัตโนมัติ" แถวแรก -->
      <v-row>
        <v-col>
          <v-btn
            dark
            @click="updateTimeFromBoard"
            style="background-color: #006d75; color: white"
          >
            Update เวลาอัตโนมัติ
          </v-btn>
        </v-col>
      </v-row>

      <!-- ✅ ปุ่ม "ยกเลิก" และ "บันทึก" อยู่แถวที่สอง -->
      <v-row>
        <v-col>
          <v-btn class="cancel-btn" variant="outlined" @click="resetTime">
            ยกเลิกการตั้งค่า
          </v-btn>
        </v-col>
        <v-col>
          <v-btn class="save-btn" color="#FFFF" dark @click="saveTime">
            บันทึก
          </v-btn>
        </v-col>
      </v-row>
    </v-card-actions>

    <!-- ✅ Popup ตั้งค่าเวลา -->
    <v-dialog v-model="isEditDialogOpen" width="450px" max-width="90%">
      <v-card class="dialog-card">
        <v-card-title class="dialog-title">ตั้งฟาฬิกาใหม่</v-card-title>
        <v-card-text>
          <v-row class="time-input">
            <v-col cols="5">
              <v-text-field
                v-model="manualTime.hh"
                label="ชั่วโมง"
                type="number"
                min="0"
                max="23"
                class="centered-input"
                @blur="validateTime"
              />
            </v-col>
            <v-col cols="2" class="time-separator">:</v-col>
            <v-col cols="5">
              <v-text-field
                v-model="manualTime.mm"
                label="นาที"
                type="number"
                min="0"
                max="59"
                class="centered-input"
                @blur="validateTime"
              />
            </v-col>
          </v-row>

          <p class="day-title">วัน</p>
          <div class="day-toggle">
            <v-btn
              v-for="(day, index) in daysMap"
              :key="index"
              class="day-btn"
              :class="{ 'active-day': manualTime.dayofweeks === index }"
              @click="manualTime.dayofweeks = index"
            >
              {{ day }}
            </v-btn>
          </div>
        </v-card-text>

        <v-card-actions class="dialog-actions">
          <v-btn text @click="isEditDialogOpen = false">ยกเลิก</v-btn>
          <v-btn color="primary" @click="confirmManualTime"
            >ตั้งนาฬิกาใหม่</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>

  <!-- ✅ Snackbar แจ้งเตือน -->
  <v-snackbar v-model="snackbar.show" vertical :timeout="3000" color="#006d75">
    <div class="flex items-center space-x-3 text-white p-3">
      <!-- ✅ ข้อความ -->
      <div>
        <div class="font-bold text-lg">{{ snackbar.title }}</div>
        <p class="text-sm">{{ snackbar.text }}</p>
      </div>
    </div>
  </v-snackbar>
</template>

<script setup>
import { ref, watch } from "vue";
import { DateTime } from "luxon";
import { publishMessage, waitForMqttResponse } from "@/services/mqttService";
import { useDeviceSettingStore } from "../stores/deviceStoreSetting";
import { useDeviceStore } from "@/stores/deviceStore";

const deviceStore = useDeviceStore();
const deviceSettingStore = useDeviceSettingStore();
const isEditDialogOpen = ref(false);
const isLoading = ref(false); // ✅ ใช้ควบคุม Fullscreen Loading

const snackbar = ref({
  show: false,
  text: "",
  title: "แจ้งเตือน", // ✅ เพิ่ม Title
});

// ✅ ใช้ค่าจาก Store แทนค่าตั้งต้น
const currentTime = ref(
  deviceSettingStore.setting.value || { hh: 0, mm: 0, dayofweeks: 0 }
);

// ✅ ค่าที่ผู้ใช้ตั้งเองใน popup
const manualTime = ref({
  hh: 0,
  mm: 0,
  dayofweeks: 0,
});

// ✅ แผนที่วันในสัปดาห์
const daysMap = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

// ✅ ดึงชื่อวันจาก index
const getDayName = (dayIndex) => daysMap[dayIndex];

// ✅ ฟอร์แมตเวลาให้เป็น 2 หลัก เช่น "06:30"
const formatTime = (hh, mm) =>
  `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;

// ✅ โหลดค่าจาก Store (ใช้ตอนเริ่มต้นเท่านั้น)
const loadTimeFromStore = () => {
  const setting = deviceSettingStore.getSetting();
  if (setting && setting.hh !== undefined) {
    currentTime.value = { ...setting };
  }
};

// ✅ เมื่อกดแก้ไข ให้ fill ค่าปัจจุบันเข้าไป
const openEditDialog = () => {
  manualTime.value = { ...currentTime.value }; // ✅ ใช้ค่าล่าสุดจาก `currentTime`
  isEditDialogOpen.value = true;
};

// ✅ อัปเดตเวลาตาม timezone ของไทย
const updateTimeFromBoard = () => {
  const now = DateTime.now().setZone("Asia/Bangkok");
  currentTime.value = {
    hh: now.hour,
    mm: now.minute,
    dayofweeks: now.weekday % 7, // ให้ อาทิตย์ = 0
    year: now.year, // ✅ ใส่ปีเข้าไป
    month: now.month,
    day: now.day,
  };
};

// ✅ ตรวจสอบค่าที่ผู้ใช้กรอก
const validateTime = () => {
  manualTime.value.hh = Math.min(
    23,
    Math.max(0, Number(manualTime.value.hh) || 0)
  );
  manualTime.value.mm = Math.min(
    59,
    Math.max(0, Number(manualTime.value.mm) || 0)
  );
};

// ✅ ยืนยันเวลาที่ตั้งเอง
const confirmManualTime = () => {
  currentTime.value = { ...manualTime.value };
  isEditDialogOpen.value = false;
};

// ✅ รีเซ็ตค่า
const resetTime = () => {
  loadTimeFromStore(); // โหลดค่ากลับจาก Store
};

// ✅ บันทึกเวลาไปยัง Hardware ผ่าน MQTT
const saveTime = async () => {
  const previousTime = { ...currentTime.value }; // ✅ สำรองค่าเดิม

  // ✅ สร้าง Payload JSON
  const payload = {
    hour: currentTime.value.hh,
    minute: currentTime.value.mm,
    day_of_week: currentTime.value.dayofweeks,
    year: currentTime.value.year, // ✅ ใส่ปีเข้าไป
    month: currentTime.value.month,
    day: currentTime.value.day,
  };

  console.log("📡 ส่งข้อมูลเวลาไปยัง MQTT:", payload);
  isLoading.value = true; // ✅ เปิด Loading
  try {
    const publishTopic = `device/${deviceStore.devices[0].serialNumber}/post/time`;
    const responseTopic = `server/${deviceStore.devices[0].serialNumber}/post/response`;

    publishMessage(publishTopic, JSON.stringify(payload));

    // ✅ รอการตอบกลับจาก Hardware ภายใน 5 วินาที
    const response = await waitForMqttResponse(responseTopic, 5000);

    if (response.status === "ok") {
      console.log(`✅ Hardware ตอบกลับ: ตั้งค่าเวลาใหม่สำเร็จ!`);

      // ✅ อัปเดตค่าใน Store
      deviceSettingStore.setting.hh = currentTime.value.hh;
      deviceSettingStore.setting.mm = currentTime.value.mm;
      deviceSettingStore.setting.dayofweeks = currentTime.value.dayofweeks;

      snackbar.value = {
        show: true,
        title: "แจ้งเตือน",
        text: `✅ บันทึกเวลาสำเร็จ: ${getDayName(currentTime.value.dayofweeks)} ${formatTime(
          currentTime.value.hh,
          currentTime.value.mm
        )} น.`,
      };
    } else {
      console.error(`❌ Hardware ปฏิเสธการตั้งเวลา:`, response.reason);
      snackbar.value = {
        show: true,
        title: "แจ้งเตือน",
        text: `❌ ไม่สามารถตั้งเวลาได้: ${response.reason}`,
      };
      // ✅ คืนค่าเดิม
      currentTime.value = { ...previousTime };
    }
  } catch (error) {
    console.error("❌ ไม่ได้รับการตอบกลับจาก Hardware:", error);
    snackbar.value = {
      show: true,
      title: "แจ้งเตือน",
      text: `"❌ ไม่ได้รับการตอบกลับจาก Hardware"`,
    };

    // ✅ คืนค่าเดิม
    currentTime.value = { ...previousTime };
  }
  isLoading.value = false; // ✅ เปิด Loading
};

// ✅ อัปเดต currentTime เมื่อค่า setting ใน Store เปลี่ยนแปลง
watch(
  () => deviceSettingStore.setting,
  (newSetting) => {
    console.log("🔄 อัปเดตค่าจาก Store → UI:", newSetting);
    currentTime.value = { ...newSetting };
  },
  { deep: true, immediate: true }
);
</script>

<style scoped>
.time-card {
  padding: 16px;
}

.time-title {
  font-size: 28px;
  color: #006d75;
}

.time-display {
  font-family: "Sarabun", sans-serif;
  font-size: 22px;
  display: flex;
  align-items: baseline; /* จัดให้อยู่ในแนวเดียวกัน */
  justify-content: flex-start; /* ชิดซ้าย */
  gap: 8px; /* ระยะห่างระหว่างองค์ประกอบ */
}

.time-value {
  font-weight: bold;
  font-size: 30px;
}

.wday-value {
  font-weight: bold;
  font-size: 30px;
}

.time-input {
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-icon {
  cursor: pointer;
  margin-left: 8px;
  color: #006d75;
  transition: transform 0.2s;
}

.day-toggle {
  display: flex;
  justify-content: center;
  gap: 5px;
  flex-wrap: wrap;
}

.day-btn {
  border-radius: 20px;
  padding: 8px 14px;
  min-width: 42px;
  font-size: 16px;
  font-weight: bold;
  border: 1px solid #ccc;
  background-color: #f5f5f5;
  color: #333;
  transition:
    background 0.2s,
    transform 0.2s;
}

.day-btn.active-day {
  background-color: #006d75 !important;
  color: white !important;
  border-color: #004c4f !important;
  transform: scale(1.05);
}

.time-separator {
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  color: #555;
}

/* ✅ ปรับแต่ง Input กลางหน้าจอ */
.centered-input {
  text-align: center;
  font-size: 18px;
}

/* 📌 ปรับปุ่มใน Dialog */
.dialog-actions {
  display: flex;
  justify-content: space-between;
  padding: 12px;
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

.button-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start; /* ✅ จัดปุ่มทั้งหมดชิดซ้าย */
}

.save-btn {
  flex: 1; /* ✅ ให้ปุ่ม "บันทึก" เล็กลง */
  min-width: 100px;
  background-color: #006d75 !important;
}
</style>
