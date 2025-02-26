<template>
  <v-card class="program-card">
    <v-card-title class="card-title">
      <span>Program {{ program.index + 1 }}</span>
      <v-btn
        icon
        size="medium"
        variant="text"
        class="edit-btn"
        @click="openEditDialog"
      >
        <v-icon>mdi-pencil</v-icon>
      </v-btn>
    </v-card-title>
    <hr class="border-t border-gray-300 opacity-50 my-3" />
    <v-card-text>
      <div class="subtitle-container">
        <p class="subtitle">เริ่มโปรแกรมรดน้ำ</p>
        <v-switch
          v-model="program.enabled"
          @change="$emit('toggle', program)"
          inset
          class="custom-switch"
          color="#006d77"
          hide-details
        ></v-switch>
      </div>
      <p class="time-text">{{ formattedTime }}</p>
      <p class="duration">{{ program.duration }} นาที / วาล์ว</p>
      <p class="days mt-2">
        {{ formattedDays.length > 0 ? formattedDays : "--" }}
      </p>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router"; // ✅ นำเข้า Vue Router

const props = defineProps({
  program: Object,
});

const router = useRouter(); // ✅ ใช้งาน router

// ✅ แปลงเวลาเป็น "06 : 30 น."
const formattedTime = computed(() => {
  return `${String(props.program.hh).padStart(2, "0")} : ${String(props.program.mm).padStart(2, "0")} น.`;
});

// ✅ แปลง days เป็น "จ. อ. พ. พฤ. ศ. ส. อา."
const formattedDays = computed(() => {
  const daysMap = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  let selectedDays = [];
  for (let i = 0; i < 7; i++) {
    if ((props.program.days >> i) & 1) {
      selectedDays.push(daysMap[i]);
    }
  }
  return selectedDays.join(" ");
});

// ✅ เปิด Modal แก้ไข
const openEditDialog = () => {
  console.log(
    "🛠 Navigating to Edit Program:",
    props.program.index,
    props.program.days
  ); // ✅ Debugging
  router.push({
    name: "SettingProgram",
    params: { index: props.program.index },
  });
};
</script>

<style scoped>
/* ✅ ปรับ UI ของการ์ด */
.program-card {
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* ✅ หัวข้อ Program */
.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  font-size: 16px;
}

/* ✅ ปุ่มแก้ไข */
.edit-btn {
  color: #006d77;
}

/* ✅ ข้อความย่อย */
.subtitle {
  font-size: 20px;
  color: #777;
  margin-bottom: 8px;
}

/* ✅ ปรับ container ให้ subtitle และ toggle อยู่ row เดียวกัน */
.subtitle-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* ✅ เวลา */
.time-text {
  font-size: 36px;
  margin-bottom: 4px;
}

/* ✅ ระยะเวลา */
.duration {
  font-size: 30px;
  margin-bottom: 4px;
}

/* ✅ วันที่ */
.days {
  font-size: 20px;
  padding-top: 4px;
  color: #777;
}
</style>
