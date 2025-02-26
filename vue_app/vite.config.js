import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import path from "path";

export default defineConfig(({ mode }) => {
  // ✅ ให้ `loadEnv` โหลดค่าจาก `.env` ที่อยู่ **ระดับบน**
  const env = loadEnv(mode, path.resolve(process.cwd(), ".."), "VITE");

  // ✅ Debug: ตรวจสอบค่าที่โหลดมา
  console.log("🟢 API Base URL:", env.VITE_BASE_URL || "❌ NOT SET");

  // ✅ ถ้า VITE_BASE_URL ไม่มีค่า ให้ตั้งค่าดีฟอลต์
  const apiBaseUrl = env.VITE_BASE_URL;

  return {
    plugins: [vue(), vueDevTools()],
    define: {
      "process.env.VITE_API_BASE_URL": JSON.stringify(env.VITE_BASE_URL), // ✅ เพิ่ม define ตรงนี้
      "process.env.MQTT_BROKER_URL": JSON.stringify(env.MQTT_BROKER_URL)
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      server: {
        proxy: {
          "/api": env.VITE_API_BASE_URL || "http://localhost:5000",
        },
      },
    },
  };
});
