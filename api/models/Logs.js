import mongoose from "mongoose";
import moment from "moment-timezone";

const LOG_RETENTION_DAYS = 90; // ระยะเวลาการเก็บ Log (90 วัน)
const TTL_SECONDS = LOG_RETENTION_DAYS * 24 * 60 * 60; // แปลงเป็นวินาที

const logSchema = new mongoose.Schema({
  serialNumber: {
    type: String,
    required: true,
    index: true,
  },
  timestamp_server: {
    type: Date,
    default: () => moment().tz("Asia/Bangkok").toDate(), // ✅ เวลาเซิร์ฟเวอร์เป็น UTC+7
    index: true,
    expires: TTL_SECONDS, // ✅ ลบอัตโนมัติหลัง 90 วัน
  },
  timestamp_hw: {
    type: Date,
    required: true, // เวลาของ Hardware (อุปกรณ์ส่งมา)
  },
  status_code: {
    type: Number,
    required: true,
  },
  detail_status: {
    type: String,
    required: true,
  },
  valve_id: {
    type: Number,
    default: null,
  },
  program_index: {
    type: Number,
    default: null,
  },
});

// ✅ ป้องกัน Log ซ้ำซ้อน (กรณีอุปกรณ์ส่งค่าเดิมซ้ำ)
logSchema.index(
  {
    serialNumber: 1,
    timestamp_hw: 1,
    status_code: 1,
    valve_id: 1,
    program_index: 1,
  },
  { unique: true }
);

const Log = mongoose.model("Log", logSchema);
export default Log;
