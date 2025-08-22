import express from "express";
import Log from "../models/Logs.js";
import verifyToken from "../middlewares/verifyToken.js";
import moment from "moment-timezone";

const toDisplayIdx = (idx) => (idx == null ? "-" : idx + 1);
const router = express.Router();

/**
 * @swagger
 * /logs/{serialNumber}:
 *   get:
 *     summary: Retrieve raw logs for a specific device (User-restricted)
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serialNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the device
 *     responses:
 *       200:
 *         description: Successfully retrieved logs
 *       404:
 *         description: No logs found
 *       500:
 *         description: Failed to retrieve logs
 */
router.get("/:serialNumber", verifyToken, async (req, res) => {
  try {
    const { serialNumber } = req.params;

    if (!serialNumber) {
      return res.status(400).json({ error: "Missing serial number" });
    }

    console.log(`🔍 Fetching raw logs for serialNumber: ${serialNumber}`);

    const logs = await Log.find({ serialNumber }).sort({ timestamp_hw: -1 });

    if (!logs.length) {
      return res.status(404).json({ error: "No logs found for this device" });
    }

    const formattedLogs = logs.map((log) => ({
      date: moment(log.timestamp_hw).tz("Asia/Bangkok").format("YYYY-MM-DD"),
      openTime:
        log.status_code === 1
          ? moment(log.timestamp_hw).tz("Asia/Bangkok").format("HH:mm:ss")
          : "-",
      closeTime:
        log.status_code === 2
          ? moment(log.timestamp_hw).tz("Asia/Bangkok").format("HH:mm:ss")
          : "-",
      status: log.detail_status || "N/A",
      program_index: toDisplayIdx(log.program_index), // ✅ 1-based + กัน null
      valve_id: log.valve_id ?? "-", // ✅ กัน 0 ไม่หาย
    }));

    res.status(200).json(formattedLogs);
  } catch (error) {
    console.error("❌ Internal Server Error:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch logs", details: error.message });
  }
});

/**
 * @swagger
 * /logs/{serialNumber}/grouped:
 *   get:
 *     summary: Retrieve grouped logs for a specific device
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serialNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number of the device
 *     responses:
 *       200:
 *         description: Successfully retrieved grouped logs
 *       404:
 *         description: No logs found
 *       500:
 *         description: Failed to retrieve logs
 */
router.get("/:serialNumber/grouped", verifyToken, async (req, res) => {
  try {
    const { serialNumber } = req.params;

    if (!serialNumber) {
      return res.status(400).json({ error: "Missing serial number" });
    }

    console.log(`🔍 Fetching grouped logs for serialNumber: ${serialNumber}`);

    const logs = await Log.find({ serialNumber })
      .sort({ timestamp_hw: 1 })
      .lean();

    if (!logs.length) {
      return res.status(404).json({ error: "No logs found for this device" });
    }

    let pairedValves = [];
    let failedValves = [];
    let skippedPrograms = [];
    let manualCancel = [];
    let valvePairs = {};

    logs.forEach((log) => {
      const {
        status_code,
        valve_id,
        program_index, // raw index (อาจเป็น 0 หรือ null จากข้อมูลเก่า)
        timestamp_hw,
        detail_status,
      } = log;

      const displayProgramIndex = toDisplayIdx(program_index); // ✅ 1-based สำหรับแสดงผล
      const key = `${valve_id}-${String(program_index ?? "null")}`; // ✅ key จับคู่ รองรับ null

      const formattedDate = moment(timestamp_hw)
        .tz("Asia/Bangkok")
        .format("YYYY-MM-DD");
      const formattedTime = moment(timestamp_hw)
        .tz("Asia/Bangkok")
        .format("HH:mm:ss");

      if (status_code === 1) {
        // เปิดวาล์ว
        valvePairs[key] = {
          date: formattedDate,
          valve_id,
          program_index_display: displayProgramIndex, // ✅ เก็บค่าที่จะโชว์
          openTime: formattedTime,
          closeTime: "-",
        };
      } else if (status_code === 2) {
        // ปิดวาล์ว
        if (valvePairs[key]) {
          valvePairs[key].closeTime = formattedTime;
          // ✅ push แบบใช้ค่าแสดงผล 1-based
          pairedValves.push({
            date: valvePairs[key].date,
            openTime: valvePairs[key].openTime,
            closeTime: valvePairs[key].closeTime,
            status: "รดน้ำสำเร็จ",
            program_index: valvePairs[key].program_index_display,
            valve_id: valvePairs[key].valve_id,
          });
          delete valvePairs[key];
        } else {
          // ปิดมาเดี่ยว ๆ (ไม่เจอ open คู่)
          pairedValves.push({
            date: formattedDate,
            openTime: "-",
            closeTime: formattedTime,
            status: "รดน้ำสำเร็จ",
            program_index: displayProgramIndex, // ✅ 1-based
            valve_id,
          });
        }
      }

      // Error 3/4
      if (status_code === 3 || status_code === 4) {
        failedValves.push({
          date: formattedDate,
          openTime: formattedTime,
          closeTime: "-",
          status: detail_status,
          program_index: displayProgramIndex, // ✅ 1-based
          valve_id,
        });
      }

      // ข้ามโปรแกรม 5
      if (status_code === 5) {
        skippedPrograms.push({
          date: formattedDate,
          openTime: formattedTime,
          closeTime: "-",
          status: `ข้ามโปรแกรม (Valve ${valve_id ?? "-"} มีปัญหา)`,
          program_index: displayProgramIndex, // ✅ 1-based
          valve_id: valve_id ?? "-", // ✅ กัน 0 ไม่หาย
        });
      }

      // ยกเลิกโดยผู้ใช้ 6
      if (status_code === 6) {
        manualCancel.push({
          date: formattedDate,
          openTime: formattedTime,
          closeTime: "-",
          status: "ยกเลิกโดยผู้ใช้",
          program_index: displayProgramIndex, // ✅ 1-based
          valve_id: "-",
        });
      }
    });

    const groupedLogs = [
      ...pairedValves,
      ...failedValves,
      ...skippedPrograms,
      ...manualCancel,
    ];

    res.status(200).json(groupedLogs);
  } catch (error) {
    console.error("❌ Internal Server Error:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch logs", details: error.message });
  }
});

export default router;
