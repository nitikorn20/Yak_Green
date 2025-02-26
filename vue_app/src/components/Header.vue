<template>
  <header class="header">
    <span class="dashboard-title"></span>
    <div class="user-info">
      <button @click="$emit('toggleSidebar')" class="toggle-sidebar">
        <font-awesome-icon :icon="['fas', 'bars']" />
      </button>
      <span>User: {{ userEmail }}</span>
      <button @click="logout" class="logout-btn">
        <font-awesome-icon :icon="['fas', 'arrow-right-from-bracket']" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { useAuthStore } from '@/stores/authStore'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faArrowRightFromBracket, faBars } from '@fortawesome/free-solid-svg-icons'

library.add(faArrowRightFromBracket, faBars)

const authStore = useAuthStore()
const router = useRouter()
const userEmail = computed(() => authStore.email || 'Guest')

const logout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #00656a;
  color: white;
}

.user-info {
  display: flex;
  align-items: center;
}

.toggle-sidebar {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  margin-right: 1rem;
}

/* ✅ ปรับไอคอน Logout */
.logout-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  margin-left: 1rem;
  transition: transform 0.2s ease-in-out;
}

.logout-btn:hover {
  transform: scale(1.2);
}
</style>
