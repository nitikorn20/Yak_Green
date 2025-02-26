<template>
  <v-container>
    <p>
      จำนวนวาล์ว Active
      <b :style="{ color: 'green' }"> {{ activeValves }} </b>
      /30
    </p>

    <!-- ✅ Search Box -->
    <v-text-field
      v-model="search"
      label="🔍 ค้นหา..."
      class="mb-4 mt-4"
      clearable
      variant="outlined"
      density="compact"
    ></v-text-field>

    <!-- ✅ Data Table -->
    <v-data-table
      v-model:items-per-page="itemsPerPage"
      :headers="headers"
      :items="valveSettings"
      :search="search"
      class="elevation-2 custom-table"
      density="comfortable"
      item-value="id"
      :sort-by="[{ key: 'id', order: 'asc' }]"
      :items-per-page-options="[10, 20, 30]"
      fixed-header
      height="600px"
    >
      <template v-slot:item.install="{ item }">
        <v-chip :color="item.install ? 'green' : 'gray'" size="small">
          ● {{ item.install ? "Installed" : "None" }}
        </v-chip>
      </template>

      <template v-slot:item.enable="{ item }">
        <v-chip :color="item.enable ? 'green' : 'red'" size="small">
          ● {{ item.enable ? "เปิดใช้งาน" : "ปิดใช้งาน" }}
        </v-chip>
      </template>

      <template v-slot:item.status="{ item }">
        <v-chip :color="item.status ? 'green' : 'red'" size="small">
          ● {{ item.status ? "เชื่อมต่อ" : "ไม่ได้เชื่อมต่อ" }}
        </v-chip>
      </template>

      <!-- ✅ ปุ่ม Edit -->
      <template v-slot:item.actions="{ item }">
        <v-btn
          color="primary"
          variant="text"
          size="small"
          @click="openEditDialog(item)"
        >
          Edit
        </v-btn>
      </template>
    </v-data-table>

    <!-- ✅ Edit Valve Dialog -->
    <v-dialog v-model="editDialog" max-width="400px">
      <v-card>
        <v-card-title> แก้ไขวาล์ว {{ selectedValve?.id }} </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="selectedValve.name"
            label="ชื่อวาล์ว"
          ></v-text-field>
          <v-text-field
            v-model="selectedValve.detail"
            label="รายละเอียด"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-btn color="gray" @click="editDialog = false">ยกเลิก</v-btn>
          <v-btn color="primary" :loading="isSaving" @click="saveValveSetting"
            >บันทึก</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

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
import { useDeviceSettingStore } from "@/stores/deviceStoreSetting";
import { useDeviceStore } from "@/stores/deviceStore";
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore();
const deviceStore = useDeviceStore();
const deviceSettingStore = useDeviceSettingStore();

const token = authStore.token; // ✅ ดึง token
const serialNumber = computed(() => deviceStore.devices[0]?.serialNumber); // ✅ คำนวณ serialNumber

const valveSettings = ref([...deviceSettingStore.valveSettings]); // ✅ ใช้ ref() แทน

const activeValves = computed(
  () => valveSettings.value.filter((v) => v.enable).length
);
const itemsPerPage = ref(10);
const search = ref("");
const isSaving = ref(false); // ✅ ใช้สำหรับแสดงสถานะปุ่มบันทึก

const headers = [
  { title: "ลำดับที่", key: "id", align: "center", sortable: true },
  { title: "VID", key: "id", align: "center", sortable: true },
  { title: "ชื่อ", key: "name", align: "center", sortable: true },
  { title: "รายละเอียด", key: "detail", align: "center", sortable: false },
  { title: "ติดตั้งแล้ว", key: "install", align: "center", sortable: true },
  { title: "เปิด/ปิดใช้งาน", key: "enable", align: "center", sortable: true },
  {
    title: "สถานะการเชื่อมต่อ",
    key: "status",
    align: "center",
    sortable: true,
  },
  { title: "Actions", key: "actions", align: "center", sortable: false },
];

const editDialog = ref(false);
const selectedValve = ref(null);
const snackbar = ref({
  show: false,
  text: "",
  title: "แจ้งเตือน", // ✅ เพิ่ม Title
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

// ✅ เปิด Modal แก้ไขวาล์ว
const openEditDialog = (valve) => {
  selectedValve.value = { ...valve };
  editDialog.value = true;
};

// ✅ บันทึกวาล์ว (แก้ไขเฉพาะชื่อและรายละเอียด)
const saveValveSetting = async () => {
  if (!selectedValve.value) return;
  isSaving.value = true;

  try {
    const serialNumberValue = serialNumber?.value || serialNumber;
    const tokenValue = token?.value || token;

    if (!serialNumberValue || !tokenValue) {
      console.error(
        "❌ No serialNumber or token provided. Cannot save valve settings."
      );
      return;
    }

    console.log("✅ Updating valve setting:", selectedValve.value);

    // ✅ บันทึกลง MongoDB
    await deviceSettingStore.saveSingleValveSettingToDB(
      serialNumberValue,
      selectedValve.value,
      tokenValue
    );

    console.log("✅ Saved valve setting to DB:", selectedValve.value);

    // ✅ อัปเดตค่าใน Store ทันที โดยไม่ต้องโหลดใหม่จาก DB
    const updatedValve = valveSettings.value.find(
      (v) => v.id === selectedValve.value.id
    );
    if (updatedValve) {
      Object.assign(updatedValve, selectedValve.value);
    }

    snackbar.value = {
      show: true,
      title: "แจ้งเตือน",
      text: `✅ บันทึกวาล์ว ${selectedValve.value.id} สำเร็จ!`,
    };
    editDialog.value = false;
  } catch (error) {
    console.error("❌ Error updating valve setting:", error);
    snackbar.value = {
      show: true,
      title: "แจ้งเตือน",
      text: `❌ ไม่สามารถบันทึกวาล์ว ${selectedValve.value.id} ได้`,
    };
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
/* ✅ ปรับระยะของแถว และเพิ่ม max-height */
.custom-table {
  border-radius: 8px;
  overflow: hidden;
}

/* ✅ ปรับความสูงของแถวให้พอดี */
:deep(.v-data-table__td),
:deep(.v-data-table__th) {
  padding: 12px 16px;
  font-size: 14px;
}

/* ✅ ปรับสีพื้นหลังให้ดูดีขึ้น */
:deep(.v-data-table__th) {
  background-color: #f4f4f4;
  font-weight: bold;
}

/* ✅ ปรับแต่งปุ่ม */
:deep(.v-btn) {
  text-transform: none;
  font-size: 12px;
}
</style>
