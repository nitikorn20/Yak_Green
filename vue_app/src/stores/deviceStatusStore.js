import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDeviceStatusStore = defineStore('deviceStatus', () => {
  const deviceStatus = ref({}) // ✅ เก็บสถานะของแต่ละ device ตาม serialNumber

  const setDeviceOnline = (serialNumber) => {
    deviceStatus.value[serialNumber] = true
  }

  const setDeviceOffline = (serialNumber) => {
    deviceStatus.value[serialNumber] = false
  }

  const isDeviceOnline = (serialNumber) => {
    return deviceStatus.value[serialNumber] || false
  }

  return {
    deviceStatus,
    setDeviceOnline,
    setDeviceOffline,
    isDeviceOnline,
  }
})
