import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerDocs from "./swagger/swaggerConfig.js";
import connectDB from "./config/db.js"; // Import ฟังก์ชันเชื่อมต่อ MongoDB
import { createSuperAdmin } from "./services/superAdminService.js";
import path from "path";
import { fileURLToPath } from "url";

// แปลง __dirname ให้ใช้ใน ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ ตรวจสอบตำแหน่งของไฟล์ .env
const envPath = path.resolve(__dirname, "../.env"); // อยู่ระดับเดียวกับ `docker-compose.yml`
console.log("🟢 Loading .env from:", envPath);

dotenv.config({ path: envPath });

const app = express();

// ✅ ตั้งค่า CORS
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://yakgreen.farmbird.live"]
    : ["http://localhost:5000"];

app.use(
  cors({
    origin: allowedOrigins,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);
app.options("*", cors());

// ✅ ต้องกำหนด CORS ก่อน `bodyParser`
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // ✅ รองรับ Form Data

// เชื่อมต่อ MongoDB
connectDB();
createSuperAdmin(); // สร้าง Super Admin

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Import Routes
import authRoutes from "./routes/auth.js";
import hardwareRoutes from "./routes/hardware.js";
import deviceOwnershipRoutes from "./routes/deviceOwnership.js";
import logRoutes from "./routes/logs.js";

// Routes (API)
app.use("/api/auth", authRoutes);
app.use("/api/hardware", hardwareRoutes);
app.use("/api/device-ownership", deviceOwnershipRoutes);
app.use("/api/logs", logRoutes);

// ✅ Route เช็คสุขภาพเซิร์ฟเวอร์
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "API is running smoothly!" });
});

// ✅ เริ่มต้นเซิร์ฟเวอร์
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `🚀 Server running on ${
      process.env.NODE_ENV === "production"
        ? "https://yakgreen.farmbird.live"
        : `http://localhost:${PORT}`
    }`
  );
});
