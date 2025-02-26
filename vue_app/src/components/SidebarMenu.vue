<template>
  <div :class="['sidebar', { collapsed: isCollapsed }]">
    <div class="logo">
      <img :class="{ 'collapsed-logo': isCollapsed }" src="@/assets/logo.png" alt="YAKGREEN Logo" />
    </div>

    <nav>
      <router-link
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="menu-item"
        :class="{ active: isActive(item.path) }"
        @click="handleMenuClick"
      >
        <font-awesome-icon :icon="['fas', item.icon]" class="menu-icon" />
        <span v-if="!isCollapsed">{{ item.label }}</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  faGauge, // Dashboard
  faPenToSquare, // คำสั่งรดน้ำ
  faList, // จัดการอุปกรณ์
  faCircleCheck, // ตั้งค่าบอร์ด
  faUser // ตั้งค่า Account
} from "@fortawesome/free-solid-svg-icons";

// ✅ เพิ่มไอคอนเข้า FontAwesome
library.add(faGauge, faPenToSquare, faList, faCircleCheck, faUser);

const menuItems = ref([
  { label: "Dashboard", path: "/dashboard", icon: "gauge" },
  { label: "คำสั่งรดน้ำ", path: "/watering", icon: "pen-to-square" },
  { label: "จัดการอุปกรณ์", path: "/devices", icon: "list" },
  { label: "ตั้งค่าบอร์ด", path: "/commands", icon: "circle-check" },
  { label: "ตั้งค่า Account", path: "/account", icon: "user" }
]);

const route = useRoute();
const isCollapsed = ref(false);
const isMobile = ref(window.innerWidth < 768);

// ✅ ปรับขนาด Sidebar ตามอุปกรณ์
const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 768;
  if (isMobile.value) {
    isCollapsed.value = true; // ✅ ย่ออัตโนมัติเมื่อเป็น Mobile
  }
};

const isActive = (path) => route.path.startsWith(path);

// ✅ ปิด Sidebar อัตโนมัติใน Mobile เมื่อเลือกเมนู
const handleMenuClick = () => {
  if (isMobile.value) {
    isCollapsed.value = true;
  }
};

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

defineExpose({
  toggleCollapse
});

watch(() => route.path, () => {
  if (isMobile.value) {
    isCollapsed.value = true;
  }
});
</script>

<style scoped>
.sidebar {
  width: 200px;
  height: 100vh;
  background-color: white;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  color: #000000d9;
  transition: width 0.3s ease-in-out;
  border-right: 1px solid #ddd;
}

/* ✅ ทำให้ Sidebar ย่อได้ */
.sidebar.collapsed {
  width: 80px;
}

/* ✅ โลโก้ */
.logo {
  text-align: center;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease-in-out;
}

.logo img {
  width: 80%;
  max-width: 150px;
  height: auto;
  transition: all 0.3s ease-in-out;
}

/* ✅ ปรับขนาดโลโก้ให้ใหญ่ขึ้นเมื่อ Sidebar ถูกย่อ */
.sidebar.collapsed .logo img {
  max-width: 60px;
}

/* ✅ ปรับแต่งปุ่มเมนู */
.menu-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  color: #000000d9;
  text-decoration: none;
  transition: background 0.3s, color 0.3s;
  border-radius: 5px;
  font-size: 1rem;
}

/* ✅ ปรับสีเมื่อ Hover */
.menu-item:hover {
  background: #e6f7ff;
  color: #1890ff;
}

/* ✅ ปรับสีเมื่อเมนูถูกเลือก (Active) */
.menu-item.active {
  background: #e6f7ff;
  color: #1890ff;
  font-weight: bold;
  border-right: 4px solid #1890ff;
}

/* ✅ ปรับขนาด icon และระยะห่าง */
.menu-icon {
  width: 18px;
  height: 18px;
  margin-right: 10px;
}

/* ✅ ปรับให้ Sidebar ย่อได้ */
.sidebar.collapsed .menu-item span {
  display: none;
}

.sidebar.collapsed .menu-item {
  justify-content: center;
}

/* ✅ Responsive สำหรับมือถือ */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    height: 100vh;
    z-index: 1000;
    left: 0;
    top: 0;
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  }

  .sidebar.collapsed {
    width: 80px;
  }
}
</style>
