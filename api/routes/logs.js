import express from "express";
import Log from "../models/Logs.js";
import verifyToken from "../middlewares/verifyToken.js";
import moment from "moment-timezone";

const router = express.Router();

/**
 * @swagger
 * /api/logs/{serialNumber}:
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
      program_index: log.program_index || "-",
      valve_id: log.valve_id || "-",
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
 * /api/logs/{serialNumber}/grouped:
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
        program_index,
        timestamp_hw,
        detail_status,
      } = log;

      // ✅ เพิ่ม +1 ให้ program_index
      const adjustedProgramIndex = (program_index ?? 0) + 1;

      const formattedDate = moment(timestamp_hw)
        .tz("Asia/Bangkok")
        .format("YYYY-MM-DD");
      const formattedTime = moment(timestamp_hw)
        .tz("Asia/Bangkok")
        .format("HH:mm:ss");

      if (status_code === 1) {
        valvePairs[`${valve_id}-${program_index}`] = {
          date: formattedDate,
          valve_id,
          program_index: adjustedProgramIndex,
          openTime: formattedTime,
          closeTime: "-",
        };
      } else if (status_code === 2) {
        const key = `${valve_id}-${program_index}`;
        if (valvePairs[key]) {
          valvePairs[key].closeTime = formattedTime;
          pairedValves.push(valvePairs[key]);
          delete valvePairs[key];
        } else {
          pairedValves.push({
            date: formattedDate,
            valve_id,
            program_index,
            openTime: "-",
            closeTime: formattedTime,
          });
        }
      }

      if (status_code === 3 || status_code === 4) {
        failedValves.push({
          date: formattedDate,
          valve_id,
          program_index,
          status: detail_status,
          timestamp: formattedTime,
        });
      }

      if (status_code === 5) {
        skippedPrograms.push({
          date: formattedDate,
          program_index,
          valve_id: valve_id || "-",
          timestamp: formattedTime,
        });
      }

      if (status_code === 6) {
        manualCancel.push({
          date: formattedDate,
          program_index,
          timestamp: formattedTime,
        });
      }
    });

    const groupedLogs = [
      ...pairedValves.map((v) => ({
        date: v.date,
        openTime: v.openTime,
        closeTime: v.closeTime,
        status: "รดน้ำสำเร็จ",
        program_index: v.program_index,
        valve_id: v.valve_id,
      })),
      ...failedValves.map((v) => ({
        date: v.date,
        openTime: v.timestamp,
        closeTime: "-",
        status: v.status,
        program_index: v.program_index,
        valve_id: v.valve_id,
      })),
      ...skippedPrograms.map((p) => ({
        date: p.date,
        openTime: p.timestamp,
        closeTime: "-",
        status: `ข้ามโปรแกรม (Valve ${p.valve_id} มีปัญหา)`,
        program_index: p.program_index,
        valve_id: p.valve_id,
      })),
      ...manualCancel.map((p) => ({
        date: p.date,
        openTime: p.timestamp,
        closeTime: "-",
        status: "ยกเลิกโดยผู้ใช้",
        program_index: p.program_index,
        valve_id: "-",
      })),
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
