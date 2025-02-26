<template>
  <v-container>
    <h2 class="mb-4">Dashboard</h2>

    <p v-if="!onlineDevice" class="offline-message">
      🔴 ไม่มีอุปกรณ์ออนไลน์ กรุณาตรวจสอบการเชื่อมต่อของอุปกรณ์
    </p>

    <div class="log-header">
      <v-btn
        @click="fetchLogs"
        color="#006d77"
        variant="outlined"
        class="btn-download"
        >Download Log History CSV</v-btn
      >
      <span class="log-info"
        ><b>Log Data</b> จะมีข้อมูลย้อนหลัง <b>90 วัน</b></span
      >
    </div>

    <div v-if="onlineDevice">
      <ValveTable :device="onlineDevice" />
    </div>

    <v-dialog v-model="showModal" max-width="80%" persistent>
      <v-card>
        <v-card-title class="log-title">บันทึกการรดน้ำ</v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-data-table
            v-model:sort-by="sortBy"
            :headers="headers"
            :items="logs"
            class="custom-table elevation-2"
            dense
          >
          </v-data-table>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="dialog-actions">
          <v-btn @click="exportCSV" color="success" variant="outlined"
            >Save CSV</v-btn
          >
          <v-btn @click="showModal = false" color="red" variant="outlined"
            >ปิด</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import axiosInstance from "@/utils/axiosInstance";
import { computed, ref } from "vue";
import { useDeviceStore } from "@/stores/deviceStore";
import { useDeviceStatusStore } from "@/stores/deviceStatusStore";
import ValveTable from "@/components/ValveTable.vue";

const deviceStore = useDeviceStore();
const deviceStatusStore = useDeviceStatusStore();

const showModal = ref(false);
const logs = ref([]);
const sortBy = ref([]);

const API_BASE_URL = process.env.VITE_BASE_URL || "http://localhost:5000"; // ✅ ตรวจสอบทุกทาง

const headers = [
  { title: "วัน", key: "date", sortable: true },
  { title: "เวลาเปิด", key: "openTime", sortable: true },
  { title: "เวลาปิด", key: "closeTime", sortable: true },
  { title: "VID", key: "valve_id", sortable: true },
  { title: "โปรแกรม", key: "program_index", sortable: true },
  { title: "สถานะ", key: "status", sortable: true },
];

const deviceList = computed(() => {
  return deviceStore.devices.map((device) => ({
    ...device,
    isOnline: deviceStatusStore.deviceStatus[device.serialNumber] || false,
  }));
});

const onlineDevice = computed(() => {
  return deviceList.value.find((device) => device.isOnline);
});

const fetchLogs = async () => {
  try {

    const serialNumber = deviceStore.devices[0].serialNumber;
    if (!serialNumber) {
      console.error("No serial number found for the device");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No authentication token found");
      return;
    }

    console.log(`Fetching logs for serialNumber: ${serialNumber}`);
    const response = await axiosInstance.get(`/api/logs/${serialNumber}/grouped`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    logs.value = response.data;
    showModal.value = true;
  } catch (error) {
    console.error("Error fetching logs:", error);
    if (error.response) {
      console.error("Response Data:", error.response.data);
      console.error("Response Status:", error.response.status);
    }
  }
};

const exportCSV = () => {
  if (!logs.value.length) {
    console.error("No logs to export");
    return;
  }

  const headers = ["วัน", "เวลาเปิด", "เวลาปิด", "VID", "โปรแกรม", "สถานะ"];
  const rows = logs.value.map((log) => [
    log.date,
    log.openTime,
    log.closeTime,
    log.valve_id,
    log.program_index,
    log.status,
  ]);
  const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join(
    "\r\n"
  );
  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/:/g, "-")
    .replace("T", "_")
    .split(".")[0];
  const fileName = `log_${timestamp}.csv`;

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
</script>

<style scoped>
.offline-message {
  color: red;
  font-weight: bold;
  text-align: center;
  padding: 20px;
}
.log-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
}
.log-info {
  font-size: 14px;
  color: black;
}
.log-title {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
}
.dialog-actions {
  display: flex;
  justify-content: space-between;
  padding: 16px;
}
.custom-table {
  border-radius: 8px;
  overflow: hidden;
  font-size: 14px;
}
</style>
