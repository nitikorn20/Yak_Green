import mqtt from "mqtt";
import dotenv from "dotenv";
import LogData from "./models/Logs.js";
import Device from "./models/Hardware.js"; // Import Model อุปกรณ์
import connectDB from "./config/db.js"; // เชื่อมต่อ MongoDB
import path from "path";
import { fileURLToPath } from "url";

// แปลง __dirname ให้ใช้ใน ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ ตรวจสอบตำแหน่งของไฟล์ .env
const envPath = path.resolve(__dirname, "../.env"); // อยู่ระดับเดียวกับ `docker-compose.yml`
console.log("🟢 Loading .env from:", envPath);

dotenv.config({ path: envPath });

await connectDB(); // ✅ เชื่อมต่อ MongoDB
console.log("✅ Connected to MongoDB");

// ✅ ตั้งค่า MQTT Broker
const MQTT_BROKER_URL =
  process.env.MQTT_BROKER_URL || "wss://yakgreen.farmbird.live:8883/mqtt";

// ✅ เชื่อมต่อ MQTT Broker
const client = mqtt.connect(MQTT_BROKER_URL);
const subscribedDevices = new Set(); // ใช้ Set เก็บอุปกรณ์ที่ Subscribe ไปแล้วง

// ✅ Mapping `status_code` → `detail_status`
const STATUS_MAP = {
  1: "Valve เปิดสำเร็จ",
  2: "Valve ปิดสำเร็จ",
  3: "เปิด Valve ไม่สำเร็จ",
  4: "ปิด Valve ไม่สำเร็จ",
  5: "ข้ามโปรแกรม เนื่องจาก Valve อื่นเปิดอยู่",
  6: "User ยกเลิกการทำงานระหว่างรดน้ำ",
};

client.on("connect", async () => {
  console.log(`✅ Connected to MQTT Broker: ${MQTT_BROKER_URL}`);
  await subscribeToAllDevices(); // ✅ Subscribe อุปกรณ์ที่มีอยู่ใน DB
});

// ✅ ฟังก์ชัน Subscribe ไปยัง Log ของทุกอุปกรณ์
const subscribeToAllDevices = async () => {
  try {
    const devices = await Device.find({}, "serialNumber");

    devices.forEach((device) => {
      const logTopic = `server/${device.serialNumber}/post/log`;

      if (!subscribedDevices.has(device.serialNumber)) {
        client.subscribe(logTopic, (err) => {
          if (!err) {
            subscribedDevices.add(device.serialNumber);
            console.log(`📡 Subscribed to topic: ${logTopic}`);
          } else {
            console.error(`❌ Failed to subscribe to ${logTopic}:`, err);
          }
        });
      }
    });
  } catch (error) {
    console.error("❌ Error fetching devices from DB:", error);
  }
};

// ✅ ตั้ง Interval ให้ดึงอุปกรณ์ใหม่ทุก 30 วินาที
setInterval(async () => {
  console.log("🔄 Checking for new devices...");
  await subscribeToAllDevices();
}, 30000);

// ✅ รับข้อความจาก MQTT และบันทึกลง MongoDB
client.on("message", async (topic, message) => {
  console.log(`📩 Received message from ${topic}:`, message.toString());

  try {
    const dataArray = JSON.parse(message.toString()); // ✅ รับเป็น Array
    const topicParts = topic.split("/");

    if (
      topicParts.length < 4 ||
      topicParts[2] !== "post" ||
      topicParts[3] !== "log"
    ) {
      console.warn(`⚠️ Ignoring unknown topic format: ${topic}`);
      return;
    }

    const serialNumber = topicParts[1]; // ✅ ดึง serialNumber จาก topic

    if (!Array.isArray(dataArray)) {
      console.warn(`⚠️ Expected array but got:`, dataArray);
      return;
    }

    for (const data of dataArray) {
      const existingLog = await LogData.exists({
        serialNumber,
        timestamp_hw: new Date(data.timestamp * 1000),
        status_code: data.status_code,
        valve_id: data.valve_id,
        program_index: data.program_index,
      });

      if (!existingLog) {
        const logEntry = new LogData({
          serialNumber,
          timestamp_server: new Date(),
          timestamp_hw: new Date(data.timestamp * 1000),
          status_code: data.status_code,
          detail_status: STATUS_MAP[data.status_code] || "Unknown Status", // ✅ กำหนดค่าก่อน save
          valve_id: data.valve_id || null,
          program_index: data.program_index || null,
        });

        await logEntry.save();
        console.log(`✅ Log saved for ${serialNumber}:`, logEntry);
      } else {
        console.log(`⚠️ Duplicate log detected, skipping...`);
      }
    }
  } catch (error) {
    console.error("❌ Error processing MQTT message:", error);
  }
});

client.on("close", () => {
  console.warn("⚠️ MQTT Connection Closed");
});

// ✅ Export client เพื่อใช้ในส่วนอื่นของระบบ
export default client;
