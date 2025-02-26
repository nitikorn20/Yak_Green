import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    userId: localStorage.getItem('userId') || null,
    email: localStorage.getItem('email') || null,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token && !state.isTokenExpired,
    isTokenExpired: (state) => {
      if (!state.token) return true // ❌ ถ้าไม่มี Token ถือว่าหมดอายุ
      try {
        const payload = JSON.parse(atob(state.token.split('.')[1])) // ✅ Decode JWT Token
        return payload.exp * 1000 < Date.now() // ❌ ถ้า Expired Time < เวลาปัจจุบัน ถือว่าหมดอายุ
      } catch (e) {
        return true // ❌ ถ้า Decode ไม่ได้ ถือว่าหมดอายุ
      }
    },
  },
  actions: {
    setUser(user) {
      this.token = user.token
      this.userId = user.userId
      this.email = user.email
      localStorage.setItem('token', user.token)
      localStorage.setItem('userId', user.userId)
      localStorage.setItem('email', user.email)
    },
    loadUserFromStorage() {
      this.token = localStorage.getItem('token')
      this.userId = localStorage.getItem('userId')
      this.email = localStorage.getItem('email')

      // ✅ เช็ค Token แค่ครั้งเดียวตอนเปิดเว็บ
      if (this.isTokenExpired) {
        console.log('❌ Token หมดอายุ, ต้อง Login ใหม่')
        this.logout() // ✅ แค่ Logout ไม่ต้อง Redirect
      }
    },
    logout() {
      this.token = null
      this.userId = null
      this.email = null
      localStorage.removeItem('token')
      localStorage.removeItem('userId')
      localStorage.removeItem('email')
    }
  }
})
