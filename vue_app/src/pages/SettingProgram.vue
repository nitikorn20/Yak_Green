<template>
  <v-container v-if="editData">
    <!-- ✅ Simple Fullscreen Loading -->
    <div v-if="isLoading" class="loading-screen">
      <v-progress-circular
        indeterminate
        size="64"
        color="primary"
      ></v-progress-circular>
      <p class="loading-text">กำลังบันทึกข้อมูล กรุณารอสักครู่...</p>
    </div>

    <v-btn variant="text" class="back-btn" @click="$router.push('/watering')">
      ← กลับไปหน้าคำสั่งรดน้ำ
    </v-btn>

    <h2 class="title">ตั้งค่า Program {{ programIndex + 1 }}</h2>

    <v-card class="section-card">
      <v-card-title>ตั้งเวลาเริ่มรดน้ำ</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="6">
            <v-text-field
              v-model="editData.hh"
              label="ชั่วโมง"
              type="number"
              suffix=":"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model="editData.mm"
              label="นาที"
              type="number"
              suffix="น."
            />
          </v-col>
        </v-row>
        <v-text-field
          v-model="editData.duration"
          label="ระยะเวลารดน้ำต่อวาล์ว (นาที)"
          type="number"
          suffix="นาที"
        />
      </v-card-text>
    </v-card>

    <!-- ✅ ปุ่มเลือกวัน -->
    <v-card class="section-card">
      <v-card-title>รดน้ำ</v-card-title>
      <v-card-text>
        <div class="day-toggle">
          <!-- ✅ ปุ่ม "ทุกวัน" -->
          <v-btn
            :class="{ 'active-day': isEveryDay }"
            class="day-btn all-days-btn"
            @click="toggleAllDays"
          >
            ทุกวัน
          </v-btn>

          <!-- ✅ ปุ่มวันแต่ละวัน -->
          <v-btn
            v-for="(day, i) in daysMap"
            :key="i"
            :class="{ 'active-day': isDaySelected(i) }"
            class="day-btn"
            @click="toggleDay(i)"
          >
            {{ day }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-card class="section-card">
      <v-card-title>ลำดับการรดน้ำ</v-card-title>
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="
            editData.valves.map((id, index) => ({
              index: index + 1,
              id,
              name: getValveName(id),
            }))
          "
          item-value="id"
          class="custom-table"
          :items-per-page="10"
          :items-per-page-options="[10, 15, -1]"
        >
          <template v-slot:item.actions="{ item }">
            <v-btn size="small" icon @click="moveUp(item.index - 1)">▲</v-btn>
            <v-btn size="small" icon @click="moveDown(item.index - 1)">▼</v-btn>
            <v-btn
              size="small"
              variant="text"
              color="red"
              @click="removeValve(item.index - 1)"
              >ลบ</v-btn
            >
          </template>
        </v-data-table>
      </v-card-text>
      <v-btn class="add-valve-btn" @click="openAddValveDialog"
        >+ เพิ่มลำดับรดน้ำ</v-btn
      >
    </v-card>

    <!-- ✅ Popup เพิ่มวาล์ว -->
    <v-dialog v-model="isAddValveDialogOpen" max-width="400px">
      <v-card>
        <v-card-title>เพิ่มลำดับรดน้ำ</v-card-title>
        <v-card-text>
          <p>ลำดับที่ {{ editData.valves.length + 1 }}</p>
          <v-select
            v-model="selectedValve"
            :items="availableValves"
            item-title="name"
            item-value="id"
            label="เลือกวาล์วที่ต้องการจะเพิ่ม"
            outlined
            dense
          ></v-select>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="isAddValveDialogOpen = false">ยกเลิก</v-btn>
          <v-btn color="#006d75" @click="confirmAddValve">ตกลง</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-row class="action-buttons">
      <v-col>
        <v-btn color="white" class="mr-4" @click="$router.push('/watering')"
          >ยกเลิก</v-btn
        >
        <v-btn color="#006d75" @click="saveProgram">บันทึก</v-btn>
      </v-col>
    </v-row>

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

  <v-container v-else>
    <v-progress-circular indeterminate color="primary"></v-progress-circular>
  </v-container>
</template>

<script setup>
import { computed, ref, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDeviceSettingStore } from "@/stores/deviceStoreSetting";
import { useDeviceStore } from "@/stores/deviceStore";
import { publishMessage, waitForMqttResponse } from "@/services/mqttService";

const route = useRoute();
const router = useRouter();
const deviceSettingStore = useDeviceSettingStore();
const deviceStore = useDeviceStore();

const programIndex = computed(() => Number(route.params.index));
const editData = ref(null);

const isAddValveDialogOpen = ref(false);
const selectedValve = ref(null);

const daysMap = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const selectedDays = ref(Array(7).fill(0));

const isLoading = ref(false); // ✅ ใช้ควบคุม Fullscreen Loading
const timeoutRef = ref(null); // ✅ ใช้จับ Timeout ของ MQTT

const snackbar = ref({
  show: false,
  text: "",
  title: "แจ้งเตือน", // ✅ เพิ่ม Title
});

// ✅ โหลดข้อมูลวันจาก bitwise days
const setSelectedDaysFromBits = () => {
  if (!editData.value) return;
  let newSelectedDays = Array(7).fill(0);

  for (let i = 0; i < 7; i++) {
    newSelectedDays[i] = (editData.value.days >> i) & 1;
  }

  selectedDays.value = newSelectedDays;
};

// ✅ โหลดค่าโปรแกรมใหม่ทุกครั้งที่เข้า
const loadProgram = () => {
  const program = deviceSettingStore.getProgramByIndex(programIndex.value);
  if (!program) return;

  editData.value = JSON.parse(JSON.stringify(program));
  setSelectedDaysFromBits();
};

onMounted(loadProgram);

// ✅ ตรวจสอบว่าทุกวันถูกเลือกหรือไม่
const isEveryDay = computed(() => selectedDays.value.every((val) => val === 1));

// ✅ ตรวจสอบว่าวันไหนถูกเลือก
const isDaySelected = (day) => selectedDays.value[day] === 1;

// ✅ Toggle วันรดน้ำ
const toggleDay = (day) => {
  selectedDays.value[day] = selectedDays.value[day] ? 0 : 1;

  let daysValue = 0;
  selectedDays.value.forEach((val, index) => {
    if (val === 1) daysValue |= 1 << index;
  });

  editData.value.days = daysValue;
};

// ✅ Toggle ทุกวัน
const toggleAllDays = () => {
  const newState = isEveryDay.value ? 0 : 1;
  selectedDays.value = Array(7).fill(newState);

  let daysValue = newState ? 127 : 0; // 127 = 1111111 ในฐาน 2
  editData.value.days = daysValue;
};

// ✅ ดึงรายการวาล์วทั้งหมดและกรองเฉพาะที่ยังไม่ได้เลือก
const availableValves = computed(() => {
  const allValves = deviceSettingStore.getValveSettings();
  return allValves.filter((v) => !editData.value.valves.includes(v.id));
});

// ✅ ดึงชื่อวาล์วจาก store
const getValveName = (id) => {
  const valve = deviceSettingStore.getValveSettings().find((v) => v.id === id);
  return valve ? valve.name : `วาล์ว ${id}`;
};

// ✅ Headers สำหรับ DataTable
const headers = [
  { title: "ลำดับ", key: "index", align: "center" },
  { title: "VID", key: "id", align: "center" },
  { title: "ชื่อ", key: "name", align: "left" },
  { title: "ตัวเลือก", key: "actions", align: "center" },
];

// ✅ เปิด popup เพิ่มวาล์ว
const openAddValveDialog = () => {
  selectedValve.value = null;
  isAddValveDialogOpen.value = true;
};

// ✅ ยืนยันการเพิ่มวาล์ว
const confirmAddValve = () => {
  if (selectedValve.value !== null) {
    editData.value.valves.push(selectedValve.value);
  }
  isAddValveDialogOpen.value = false;
};

// ✅ เลื่อนขึ้น
const moveUp = (index) => {
  if (index > 0) {
    const newValves = [...editData.value.valves];
    [newValves[index], newValves[index - 1]] = [
      newValves[index - 1],
      newValves[index],
    ];
    editData.value.valves = newValves;
  }
};

// ✅ เลื่อนลง
const moveDown = (index) => {
  if (index < editData.value.valves.length - 1) {
    const newValves = [...editData.value.valves];
    [newValves[index], newValves[index + 1]] = [
      newValves[index + 1],
      newValves[index],
    ];
    editData.value.valves = newValves;
  }
};

// ✅ ลบวาล์ว
const removeValve = (index) => {
  editData.value.valves = editData.value.valves.filter((_, i) => i !== index);
};

// ✅ ฟังก์ชันบันทึกข้อมูล
const saveProgram = async () => {
  console.log("🔍 กำลังตรวจสอบข้อมูลโปรแกรม...");
  console.log(
    "⏰ เวลาเริ่มต้น:",
    editData.value.hh,
    "ชม.",
    editData.value.mm,
    "นาที"
  );
  console.log(
    "📅 วันรดน้ำ (Base 10):",
    editData.value.days.toString(2).padStart(7, "0")
  );
  console.log("💧 วาล์วที่ใช้:", editData.value.valves);

  // ⛔ [1] ตรวจสอบความถูกต้องของเวลา
  if (
    editData.value.hh < 0 ||
    editData.value.hh > 23 ||
    editData.value.mm < 0 ||
    editData.value.mm > 59
  ) {
    console.error("❌ เวลาที่กรอกไม่ถูกต้อง!");
    snackbar.value = {
      show: true,
      title: "แจ้งเตือน",
      text: "❌ เวลาที่กรอกต้องอยู่ในช่วง 0-23 ชั่วโมง และ 0-59 นาที",
    };

    return;
  }

  // ⛔ [2] ตรวจสอบว่าต้องเลือกวันอย่างน้อย 1 วัน
  if (editData.value.days === 0) {
    console.error("❌ ไม่ได้เลือกวันรดน้ำ!");
    snackbar.value = {
      show: true,
      title: "แจ้งเตือน",
      text: "❌ ต้องเลือกวันรดน้ำอย่างน้อย 1 วัน",
    };

    return;
  }

  // ⛔ [3] ตรวจสอบว่าต้องมีวาล์วอย่างน้อย 1 ตัว
  if (editData.value.valves.length === 0) {
    console.error("❌ ไม่มีวาล์วที่ใช้รดน้ำ!");
    snackbar.value = {
      show: true,
      title: "แจ้งเตือน",
      text: "❌ ต้องเพิ่มวาล์วในโปรแกรมอย่างน้อย 1 ตัวในการรดน้ำ",
    };
    return;
  }

  // ✅ คำนวณเวลารดน้ำเป็น "นาทีทั้งหมด"
  const startTime =
    parseInt(editData.value.hh) * 60 + parseInt(editData.value.mm);
  const duration =
    parseInt(editData.value.duration) * parseInt(editData.value.valves.length);

  // ✅ ตรวจสอบค่าที่ได้ เพื่อป้องกันค่าผิดปกติ
  if (duration <= 0 || duration > 60) {
    // 1440 นาที = 24 ชม.
    console.error("❌ คำนวณ duration ผิดพลาด:", duration);
    snackbar.value = {
      show: true,
      title: "แจ้งเตือน",
      text: "❌ ระยะเวลารดน้ำรวมต้องอยู่ในช่วง 1-60 นาที",
    };

    return;
  }

  const endTime = startTime + duration; // เวลาสิ้นสุดเป็นนาที

  console.log(`⏳ คำนวณเวลา: ${startTime} → ${endTime} นาที`);

  // ✅ ตรวจสอบว่าเวลาไม่คาบเกี่ยวกับโปรแกรมอื่น
  const allPrograms = deviceSettingStore.getProgramSettings(); // โหลดโปรแกรมทั้งหมด
  console.log(
    `📌 ตรวจสอบการซ้อนทับกับ ${allPrograms.length} โปรแกรมที่มีอยู่...`
  );

  for (const program of allPrograms) {
    if (program.index === programIndex.value) continue; // ข้ามโปรแกรมที่กำลังแก้ไข

    // ✅ คำนวณช่วงเวลาของโปรแกรมที่มีอยู่ (เป็นนาทีทั้งหมด)
    const programStartTime = parseInt(program.hh) * 60 + parseInt(program.mm);
    const programEndTime =
      programStartTime +
      parseInt(program.duration) * parseInt(program.valves.length);

    console.log(
      `🔄 ตรวจสอบกับ Program ${program.index + 1}: ${programStartTime} → ${programEndTime} นาที`
    );

    // ✅ ตรวจสอบว่ามีวันรดน้ำตรงกันหรือไม่
    const hasCommonDays = (editData.value.days & program.days) !== 0; // ใช้ bitwise & เพื่อตรวจสอบวันซ้อนกัน
    console.log(
      "📅 มีวันรดน้ำที่ซ้อนกัน:",
      hasCommonDays ? "✅ ใช่" : "❌ ไม่"
    );

    if (hasCommonDays) {
      // ✅ ตรวจสอบว่าช่วงเวลาคาบเกี่ยวกันหรือไม่
      const isOverlapping =
        (startTime >= programStartTime && startTime < programEndTime) || // โปรแกรมใหม่เริ่มในช่วงที่มีอยู่
        (endTime > programStartTime && endTime <= programEndTime) || // โปรแกรมใหม่จบในช่วงที่มีอยู่
        (startTime <= programStartTime && endTime >= programEndTime) || // โปรแกรมใหม่ครอบคลุมโปรแกรมเดิม
        startTime === programEndTime ||
        endTime === programStartTime; // ⛔ ห้ามชนกับเวลาเริ่ม/จบของโปรแกรมอื่น

      console.log(
        "🔍 มีการคาบเกี่ยวของเวลา:",
        isOverlapping ? "❌ ใช่" : "✅ ไม่"
      );

      if (isOverlapping) {
        console.log(
          `❌ เวลารดน้ำของโปรแกรมใหม่คาบเกี่ยวกับ Program ${program.index + 1}`
        );
        snackbar.value = {
          show: true,
          title: "แจ้งเตือน",
          text: `❌ การรดน้ำของโปรแกรมที่กำลังแก้ไขซ้อนทับกับโปรแกรม Program ${program.index + 1} จึงไม่สามารถบันทึกได้`,
        };
        return;
      }
    }
  }

  // ✅ เพิ่ม popup ยืนยัน
  if (!window.confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการบันทึกการเปลี่ยนแปลง?")) {
    console.log("❌ ผู้ใช้ยกเลิกการบันทึก");
    return;
  }

  isLoading.value = true; // ✅ เปิด Loading
  await nextTick(); // ✅ อัปเดต UI ก่อนทำงานต่อ

  // ✅ บันทึกค่าเดิมก่อนเปลี่ยน
  const originalData = JSON.parse(JSON.stringify(editData.value));

  // ✅ สร้าง Payload สำหรับ MQTT
  const payload = {
    index: parseInt(programIndex.value),
    hh: parseInt(editData.value.hh),
    mm: parseInt(editData.value.mm),
    duration: parseInt(editData.value.duration),
    days: parseInt(editData.value.days),
    valves: editData.value.valves,
    enabled: editData.value.enabled ? true : false,
  };

  console.log("📡 กำลังส่งข้อมูลไปยัง MQTT:", payload);

  try {
    // ✅ ส่งข้อมูลไปที่ MQTT

    const publishTopic = `device/${deviceStore.devices[0].serialNumber}/post/program`;
    const responseTopic = `server/${deviceStore.devices[0].serialNumber}/post/response`;

    publishMessage(publishTopic, JSON.stringify(payload));

    // ✅ รอ Hardware ตอบกลับ
    const response = await waitForMqttResponse(responseTopic, 5000);

    clearTimeout(timeoutRef.value);
    timeoutRef.value = null;

    if (response.status === "ok") {
      console.log("✅ Hardware ตอบกลับ: บันทึกสำเร็จ!");

      // ✅ บันทึกข้อมูลลง Store โดยแปลงเป็น int ล่วงหน้า
      deviceSettingStore.updateProgramSetting(
        programIndex.value,
        "hh",
        parseInt(editData.value.hh, 10)
      );
      deviceSettingStore.updateProgramSetting(
        programIndex.value,
        "mm",
        parseInt(editData.value.mm, 10)
      );
      deviceSettingStore.updateProgramSetting(
        programIndex.value,
        "duration",
        parseInt(editData.value.duration, 10)
      );
      deviceSettingStore.updateProgramSetting(
        programIndex.value,
        "days",
        parseInt(editData.value.days, 10)
      );
      deviceSettingStore.updateProgramSetting(
        programIndex.value,
        "valves",
        editData.value.valves.map((v) => parseInt(v, 10)) // ✅ แปลง array ให้เป็น int[]
      );

      console.log("✅ บันทึกโปรแกรมสำเร็จ!");
      snackbar.value = {
        show: true,
        title: "แจ้งเตือน",
        text: "✅ บันทึกโปรแกรมรดน้ำสำเร็จ!",
      };
      setTimeout(() => {
        router.push("/watering");
      }, 2000);
    } else {
      console.error("❌ Hardware ปฏิเสธการบันทึก:", response.reason);
      snackbar.value = {
        show: true,
        title: "แจ้งเตือน",
        text: `❌ Hardware ปฏิเสธการบันทึก: ${response.reason}`,
      };

      // ✅ คืนค่าเดิม
      editData.value = originalData;
      router.push("/watering");
    }
  } catch (error) {
    console.error("❌ ไม่ได้รับการตอบกลับจาก Hardware:", error);
    snackbar.value = {
      show: true,
      title: "แจ้งเตือน",
      text: "❌ ไม่ได้รับการตอบกลับจาก Hardware",
    };
    // ✅ คืนค่าเดิม
    editData.value = originalData;
    router.push("/watering");
  } finally {
    isLoading.value = false; // ✅ ปิด Loading หลังจากเสร็จ
  }
};
</script>

<style scoped>
.section-card {
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 10px;
  box-shadow: 0px 2px 10px rgba(0, 0, 0, 0.1);
}

.action-buttons {
  text-align: start;
}

.day-toggle {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.day-btn {
  border-radius: 20px;
  min-width: 40px;
  padding: 6px 12px;
  text-transform: none;
  font-size: 14px;
  font-weight: bold;
  border: 1px solid #ccc;
  background-color: #f5f5f5;
  color: #00000040;
  transition:
    background 0.2s,
    color 0.2s;
}

.back-btn {
  color: #006d77;
  margin-bottom: 6px;
}

.add-valve-btn {
  background-color: #006d75 !important;
  color: white !important;
  border: none;
  padding: 16px 24px !important; /* ✅ เพิ่มขนาด padding */
  font-size: 20px !important; /* ✅ เพิ่มขนาดตัวอักษร */
  border-radius: 8px; /* ✅ ทำให้ขอบมนขึ้น */
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  cursor: pointer; /* ✅ ทำให้รู้ว่าเป็นปุ่ม */
  transition: all 0.3s ease-in-out; /* ✅ เพิ่มเอฟเฟกต์เมื่อ Hover */
}

.day-btn.active-day {
  background-color: #006d75 !important;
  color: white !important;
  border: none;
}

.all-days-btn {
  font-weight: bold;
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
