import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { useDeviceStore } from "@/stores/deviceStore";

// ✅ ใช้ Dynamic Import (Lazy Loading)
const MainLayout = () => import(/* webpackChunkName: "layout-main" */ "@/layouts/MainLayout.vue");
const Dashboard = () => import(/* webpackChunkName: "dashboard" */ "@/pages/Dashboard.vue");
const Login = () => import(/* webpackChunkName: "login" */ "@/pages/Login.vue");
const Watering = () => import(/* webpackChunkName: "watering" */ "@/pages/Watering.vue");
const Devices = () => import(/* webpackChunkName: "devices" */ "@/pages/Devices.vue");
const Commands = () => import(/* webpackChunkName: "commands" */ "@/pages/Commands.vue");
const Account = () => import(/* webpackChunkName: "account" */ "@/pages/Account.vue");
const SettingProgram = () => import(/* webpackChunkName: "setting-program" */ "@/pages/SettingProgram.vue");


const routes = [
  {
    path: "/login",
    name: "Login",
    component: Login,
    beforeEnter: (to, from, next) => {
      const authStore = useAuthStore();
      if (authStore.isLoggedIn) {
        return next("/dashboard");
      }
      next();
    },
  },
  {
    path: "/",
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      { path: "", redirect: "/dashboard" },
      { path: "dashboard", name: "Dashboard", component: Dashboard },
      { path: "watering", name: "Watering", component: Watering },
      { path: "devices", name: "Devices", component: Devices },
      { path: "commands", name: "Commands", component: Commands },
      { path: "account", name: "Account", component: Account },
      {
        path: "watering/program/:index",
        name: "SettingProgram",
        component: SettingProgram,
        props: true,
      },
    ],
  },
  // ✅ แก้ปัญหา 404 ใน Nginx
  { path: "/:pathMatch(.*)*", name: "NotFound", redirect: "/dashboard" },
];

const router = createRouter({
  history: createWebHistory(), // ✅ ใช้ History Mode (ต้องแก้ config Nginx ด้วย)
  routes,
});

// ✅ ป้องกัน redirect loop และโหลดข้อมูลก่อนใช้งาน
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  const deviceStore = useDeviceStore();

  try {
    // ✅ โหลด User & Token จาก Local Storage (แค่ครั้งแรก)
    if (!authStore.token) {
      await authStore.loadUserFromStorage();
    }

    // ❌ ถ้า Token หมดอายุ → Logout และให้ไปหน้า Login
    if (authStore.isTokenExpired) {
      console.warn("⚠️ Token expired, logging out...");
      authStore.logout();

      // ✅ ถ้าอยู่หน้า `/login` แล้ว ไม่ต้อง Redirect ซ้ำ
      if (to.path !== "/login") {
        return next("/login");
      }
    }

    // ✅ ถ้า Login อยู่แล้ว และไปหน้า `/login` → ให้ไป Dashboard แทน
    if (to.path === "/login" && authStore.isLoggedIn) {
      console.log("🔄 Already logged in, redirecting to Dashboard...");
      return next("/dashboard");
    }

    // ✅ โหลด Device ครั้งแรก (ถ้ายังไม่ได้โหลด)
    if (authStore.isLoggedIn && !deviceStore.isLoaded) {
      console.log("🚀 Loading user devices...");
      await deviceStore.loadUserDevices(authStore.email, authStore.token);
      deviceStore.isLoaded = true;
    }

    // ❌ ถ้าไม่ได้ Login แต่พยายามเข้า Page ที่ต้อง Auth → Redirect ไปหน้า Login
    if (to.meta.requiresAuth && !authStore.isLoggedIn) {
      console.warn("🚫 Unauthorized access, redirecting to Login...");
      return next("/login");
    }

    // ✅ อนุญาตให้ไปหน้าที่ต้องการ
    next();
  } catch (error) {
    console.error("❌ Error in navigation guard:", error);
    next("/login"); // ป้องกันหลุดจากการ login loop
  }
});

export default router;
