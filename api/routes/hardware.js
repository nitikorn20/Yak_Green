import express from 'express'
import Hardware from '../models/Hardware.js'
import verifyToken from '../middlewares/verifyToken.js'
import verifySuperAdmin from '../middlewares/verifySuperAdmin.js'

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Hardware
 *   description: Manage hardware devices
 */

/**
 * @swagger
 * /api/hardware:
 *   post:
 *     summary: Add new hardware (Super Admin Only)
 *     tags: [Hardware]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serialNumber:
 *                 type: string
 *                 example: "HW-12345678"
 *               model:
 *                 type: string
 *                 example: "Smart Irrigation System V1"
 *     responses:
 *       201:
 *         description: Hardware added successfully
 *       400:
 *         description: Hardware already exists
 *       403:
 *         description: Forbidden (Super Admin Only)
 *       500:
 *         description: Failed to add hardware
 */
router.post('/', verifyToken, verifySuperAdmin, async (req, res) => {
  const { serialNumber, model } = req.body
  try {
    const existingHardware = await Hardware.findOne({ serialNumber })
    if (existingHardware) return res.status(400).json({ error: 'Hardware already exists' })

    const hardware = new Hardware({ serialNumber, model, valveSettings: [] }) // ✅ เพิ่มค่า valveSettings ไว้ในอุปกรณ์ใหม่
    await hardware.save()

    res.status(201).json({ message: 'Hardware added successfully', hardware })
  } catch (error) {
    res.status(500).json({ error: 'Failed to add hardware' })
  }
})

/**
 * @swagger
 * /api/hardware:
 *   get:
 *     summary: Get all hardware devices (Super Admin Only)
 *     tags: [Hardware]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved hardware list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   serialNumber:
 *                     type: string
 *                     example: "HW-12345678"
 *                   model:
 *                     type: string
 *                     example: "Smart Irrigation System V1"
 *       403:
 *         description: Forbidden (Super Admin Only)
 *       500:
 *         description: Failed to retrieve hardware list
 */
router.get('/', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const hardwareList = await Hardware.find()
    res.status(200).json(hardwareList)
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve hardware list' })
  }
})

/**
 * @swagger
 * /api/hardware/{serialNumber}/settings:
 *   get:
 *     summary: Get all valve settings for a specific hardware
 *     tags: [Hardware]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serialNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: The serial number of the hardware
 *     responses:
 *       200:
 *         description: Successfully retrieved valve settings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   detail:
 *                     type: string
 *                   install:
 *                     type: boolean
 *                   status:
 *                     type: boolean
 *       404:
 *         description: Hardware not found
 *       403:
 *         description: Forbidden (Super Admin Only)
 *       500:
 *         description: Failed to retrieve valve settings
 */
router.get('/:serialNumber/settings', verifyToken, async (req, res) => {
  try {
    const { serialNumber } = req.params
    const hardware = await Hardware.findOne({ serialNumber })

    if (!hardware) return res.status(404).json({ error: 'Hardware not found' })

    res.status(200).json(hardware.valveSettings)
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve valve settings' })
  }
})

/**
 * @swagger
 * /api/hardware/{serialNumber}/settings/{valveId}:
 *   put:
 *     summary: Update a single valve setting for a specific hardware device
 *     tags: [Hardware]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serialNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: The serial number of the hardware
 *       - in: path
 *         name: valveId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the valve to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               detail:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully updated valve setting
 *       404:
 *         description: Hardware or valve not found
 *       403:
 *         description: Forbidden (Super Admin Only)
 *       500:
 *         description: Failed to update valve setting
 */
router.put('/:serialNumber/settings/:valveId', verifyToken, async (req, res) => {
  const { serialNumber, valveId } = req.params
  const { name, detail } = req.body // ✅ ดึงข้อมูลที่ต้องการอัปเดต

  try {
    console.log(`📥 Received request to update Valve ${valveId} in Hardware ${serialNumber}`)
    console.log('📥 Data received:', { name, detail })

    // ✅ ค้นหา Hardware ตาม Serial Number
    const hardware = await Hardware.findOne({ serialNumber })

    if (!hardware) {
      console.error(`❌ Hardware ${serialNumber} not found`)
      return res.status(404).json({ error: 'Hardware not found' })
    }

    if (!hardware.valveSettings) {
      hardware.valveSettings = []
    }

    // ✅ ค้นหาวาล์วตาม `valveId`
    const valveIndex = hardware.valveSettings.findIndex((v) => v.id === parseInt(valveId))

    if (valveIndex === -1) {
      // ✅ ถ้ายังไม่มี ให้เพิ่มใหม่
      console.log(`➕ Adding new valve ${valveId} to hardware ${serialNumber}`)
      hardware.valveSettings.push({
        id: parseInt(valveId),
        name: name || `วาล์ว ${valveId}`,
        detail: detail || 'รายละเอียดไม่ระบุ',
      })
    } else {
      // ✅ ถ้ามีอยู่แล้ว ให้แก้ไขข้อมูล
      console.log(`📝 Updating valve ${valveId} in hardware ${serialNumber}`)
      hardware.valveSettings[valveIndex].name = name || hardware.valveSettings[valveIndex].name
      hardware.valveSettings[valveIndex].detail =
        detail || hardware.valveSettings[valveIndex].detail
    }

    await hardware.save()

    console.log(`✅ Valve ${valveId} updated successfully in DB`)
    res.status(200).json({
      message: 'Valve settings updated successfully',
      valve: hardware.valveSettings.find((v) => v.id === parseInt(valveId)),
    })
  } catch (error) {
    console.error(`❌ Failed to update valve ${valveId} in DB:`, error)
    res.status(500).json({ error: 'Failed to update valve settings' })
  }
})

/**
 * @swagger
 * /api/hardware/{serialNumber}:
 *   delete:
 *     summary: Delete hardware by serial number (Super Admin Only)
 *     tags: [Hardware]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serialNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: The serial number of the hardware to delete
 *     responses:
 *       200:
 *         description: Hardware deleted successfully
 *       404:
 *         description: Hardware not found
 *       403:
 *         description: Forbidden (Super Admin Only)
 *       500:
 *         description: Failed to delete hardware
 */
router.delete('/:serialNumber', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const hardware = await Hardware.findOneAndDelete({ serialNumber: req.params.serialNumber })
    if (!hardware) return res.status(404).json({ error: 'Hardware not found' })

    res.status(200).json({ message: 'Hardware deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete hardware' })
  }
})

export default router
