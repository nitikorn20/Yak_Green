import { defineStore } from 'pinia'
import axiosInstance from "@/utils/axiosInstance";

export const useDeviceStore = defineStore('device', {
  state: () => ({
    devices: [],
    isLoaded: false,
  }),
  actions: {
    async loadUserDevices(userEmail, token) {
      if (this.isLoaded) return // ✅ ป้องกันโหลดซ้ำ

      console.log(`🚀 Loading user devices for ${userEmail}...`)
      try {
        const response = await axiosInstance.get(`/api/device-ownership/user/${userEmail}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (Array.isArray(response.data)) {
          this.devices = response.data
          this.isLoaded = true
          console.log('✅ Devices loaded:', this.devices)
        } else {
          console.error('📌 API response format is incorrect:', response.data)
        }
      } catch (error) {
        console.error('❌ Failed to load device data', error)
      }
    },
  },
})
