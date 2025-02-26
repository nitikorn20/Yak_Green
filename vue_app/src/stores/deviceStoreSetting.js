import { defineStore } from "pinia";
import { ref } from "vue";
import axiosInstance from "@/utils/axiosInstance";

export const useDeviceSettingStore = defineStore("deviceSetting", () => {
  // ✅ เก็บค่าการตั้งค่าเวลา (ใช้ใน TimeUpdateCard)
  const setting = ref({ hh: 0, mm: 0, day: 0 });
  // ✅ เก็บค่าของ ValveSettings (30 ตัว)
  const valveSettings = ref(
    Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      name: `วาล์ว ${i + 1}`, // ✅ ชื่อดีฟอลต์ (ถ้ายังไม่มีข้อมูลจาก DB)
      detail: "รายละเอียดไม่ระบุ", // ✅ รายละเอียดดีฟอลต์
      install: false,
      status: false,
      opto_status: 0,
      relay_status: 0,
      enable: false,
    }))
  );
  // ✅ เก็บค่าของ ProgramSettings (5 โปรแกรม)
  const programSettings = ref(
    Array.from({ length: 5 }, (_, i) => ({
      index: i,
      programName: `โปรแกรม ${i + 1}`,
      duration: 0,
      hh: 0,
      mm: 0,
      days: 0,
      enabled: false,
      valves: [],
      valveNames: [],
    }))
  );

  const isDataLoaded = ref(false); // ✅ ป้องกันโหลดซ้ำ

  const setDeviceSetting = (settingData) => {
    // ✅ อัปเดต setting
    if (settingData.setting) {
      setting.value = {
        hh: settingData.setting.hh ?? setting.value.hh,
        mm: settingData.setting.mm ?? setting.value.mm,
        dayofweeks: settingData.setting.dayofweeks ?? setting.value.dayofweeks,
      };
    }

    if (settingData.valves && Array.isArray(settingData.valves)) {
      settingData.valves.forEach((valve) => {
        const existingValve = valveSettings.value.find(
          (v) => v.id === valve.id
        );
        if (existingValve) {
          Object.assign(existingValve, {
            name: valve.name || existingValve.name,
            detail: valve.detail || existingValve.detail,
            install: valve.install ?? existingValve.install,
            status: valve.status ?? existingValve.status,
            opto_status: valve.opto_status ?? existingValve.opto_status,
            relay_status: valve.relay_status ?? existingValve.relay_status,
            enable: valve.enable ?? existingValve.enable,
          });
        }
      });
    }

    if (settingData.programs && Array.isArray(settingData.programs)) {
      settingData.programs.forEach((program) => {
        const existingProgram = programSettings.value.find(
          (p) => p.index === program.index
        );
        if (existingProgram) {
          Object.assign(existingProgram, {
            duration: program.duration ?? existingProgram.duration,
            hh: program.hh ?? existingProgram.hh,
            mm: program.mm ?? existingProgram.mm,
            days: program.days ?? existingProgram.days,
            enabled: program.enabled ?? existingProgram.enabled,
            valves: program.valves ?? existingProgram.valves,
            valveNames: (program.valves || existingProgram.valves).map(
              (id) => `วาล์ว ${id}`
            ),
          });
        }
      });
    }
  };

  const loadValveMetadataFromDB = async (serialNumber, token) => {
    if (!serialNumber) {
      console.error("❌ No serialNumber provided. Cannot load valve settings.");
      return;
    }

    if (!token) {
      console.error("❌ No auth token provided. Cannot load valve settings.");
      return;
    }

    try {
      console.log(`📤 Fetching valve settings for: ${serialNumber}`);

      const response = await axiosInstance.get(
        `/api/hardware/${serialNumber}/settings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const valveData = response.data || [];
      isDataLoaded.value = true;
      console.log(`✅ Fetched valve data:`, valveData);

      // ✅ อัปเดตค่าของ valveSettings โดยไม่รีเซ็ตข้อมูลอื่น
      valveData.forEach((newValve) => {
        const existingValve = valveSettings.value.find(
          (v) => v.id === newValve.id
        );
        if (existingValve) {
          Object.assign(existingValve, {
            name: newValve.name || existingValve.name,
            detail: newValve.detail || existingValve.detail,
          });
        }
      });

      console.log("✅ Valve settings updated:", valveSettings.value);
    } catch (error) {
      console.error(
        "❌ Failed to load valve settings:",
        error.response?.data || error
      );
    }
  };

  const saveSingleValveSettingToDB = async (serialNumber, valve, token) => {
    if (!serialNumber) {
      console.error("❌ No serialNumber provided. Cannot save to DB.");
      return;
    }

    if (!token) {
      console.error("❌ No auth token provided. Cannot save to DB.");
      return;
    }

    if (!valve || !valve.id) {
      console.error("❌ Invalid valve data provided. Cannot save to DB.");
      return;
    }

    try {
      console.log(
        `📤 Sending request to update valve ${valve.id} for device: ${serialNumber}`
      );
      console.log("📤 Data sent:", {
        name: valve.name,
        detail: valve.detail,
      });

      const response = await axiosInstance.put(
        `/api/hardware/${serialNumber}/settings/${valve.id}`,
        {
          name: valve.name,
          detail: valve.detail,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        `✅ Valve ${valve.id} settings saved successfully:`,
        response.data
      );

      // ✅ อัปเดตค่าใน UI ทันที โดยไม่ต้องโหลดใหม่จาก DB
      const updatedValve = valveSettings.value.find((v) => v.id === valve.id);
      if (updatedValve) {
        Object.assign(updatedValve, {
          name: valve.name,
          detail: valve.detail,
        });
      }
    } catch (error) {
      console.error(
        `❌ Failed to save valve ${valve.id}:`,
        error.response?.data || error
      );
    }
  };

  // ✅ ดึงข้อมูล
  const getSetting = () => setting.value;
  const getValveSettings = () => valveSettings.value;
  const getProgramSettings = () => programSettings.value;

  // ✅ อัปเดตค่าแต่ละตัว
  const updateValveSetting = (id, key, value) => {
    const valve = valveSettings.value.find((v) => v.id === id);
    if (valve) valve[key] = value;
  };

  // ✅ อัปเดตค่าโปรแกรม
  const updateProgramSetting = (index, key, value) => {
    const program = programSettings.value.find((p) => p.index === index);
    if (program) {
      program[key] = value;
    }
  };

  const getProgramByIndex = (index) => {
    return programSettings.value.find((p) => p.index === index) || {};
  };

  return {
    setting,
    valveSettings,
    programSettings,
    isDataLoaded,
    setDeviceSetting,
    getSetting,
    getValveSettings,
    getProgramSettings,
    getProgramByIndex,
    updateValveSetting,
    updateProgramSetting,
    saveSingleValveSettingToDB,
    loadValveMetadataFromDB, // ✅ โหลดข้อมูลจาก MongoDB
  };
});
