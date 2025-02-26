// src/utils/log.js
const isProduction = import.meta.env.PROD; // ✅ เช็คว่าเป็น Production หรือไม่

const noop = () => {}; // ฟังก์ชันว่าง ไม่ทำอะไร

// ✅ ปิด log ใน Production
if (isProduction) {
  console.log = noop;
  console.warn = noop;
  console.error = noop;
}
