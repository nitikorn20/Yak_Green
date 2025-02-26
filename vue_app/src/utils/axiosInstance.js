import axios from "axios";

// ✅ โหลดค่า BASE_URL จาก .env หรือใช้ default
const API_BASE_URL = process.env.VITE_API_BASE_URL || "http://localhost:5000";


// ✅ สร้าง instance ของ axios
const axiosInstance = axios.create({
  baseURL: API_BASE_URL, // ใช้ BASE URL ที่ตั้งค่าไว้
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // ตั้ง Timeout 10 วินาที
});

// ✅ เพิ่ม Interceptor สำหรับ Token (ถ้ามีการใช้ JWT)
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
