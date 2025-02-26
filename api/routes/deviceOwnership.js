import express from 'express'
import DeviceOwnership from '../models/DeviceOwnership.js'
import User from '../models/User.js'
import Hardware from '../models/Hardware.js'
import verifyToken from '../middlewares/verifyToken.js'
import verifySuperAdmin from '../middlewares/verifySuperAdmin.js'

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: DeviceOwnership
 *   description: Manage device ownership between users and hardware
 */

/**
 * @swagger
 * /api/device-ownership:
 *   get:
 *     summary: Get all assigned devices (Super Admin Only)
 *     tags: [DeviceOwnership]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved all assigned devices
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userEmail:
 *                     type: string
 *                     example: "user@example.com"
 *                   hardwareSerial:
 *                     type: string
 *                     example: "HW-12345678"
 *       403:
 *         description: Access denied (Super Admin Only)
 *       500:
 *         description: Failed to retrieve devices
 */
router.get('/', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const devices = await DeviceOwnership.find()
      .populate('user', 'email')
      .populate('hardware', 'serialNumber')
    res.status(200).json(devices)
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve devices' })
  }
})

/**
 * @swagger
 * /api/device-ownership/assign:
 *   post:
 *     summary: Assign a hardware device to a user (Super Admin Only)
 *     tags: [DeviceOwnership]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userEmail:
 *                 type: string
 *                 example: "user@example.com"
 *               hardwareSerial:
 *                 type: string
 *                 example: "HW-12345678"
 *     responses:
 *       201:
 *         description: Device assigned successfully
 *       400:
 *         description: Device already assigned or User/Hardware not found
 *       403:
 *         description: Access denied (Super Admin Only)
 *       500:
 *         description: Failed to assign device
 */
router.post('/assign', verifyToken, verifySuperAdmin, async (req, res) => {
  const { userEmail, hardwareSerial } = req.body

  try {
    const user = await User.findOne({ email: userEmail })
    if (!user) return res.status(400).json({ error: 'User not found' })

    const hardware = await Hardware.findOne({ serialNumber: hardwareSerial })
    if (!hardware) return res.status(400).json({ error: 'Hardware not found' })

    const existingOwnership = await DeviceOwnership.findOne({ hardware: hardware._id })
    if (existingOwnership) return res.status(400).json({ error: 'Device already assigned' })

    const ownership = new DeviceOwnership({ user: user._id, hardware: hardware._id })
    await ownership.save()

    res.status(201).json({ message: 'Device assigned successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign device' })
  }
})

/**
 * @swagger
 * /api/device-ownership/unassign/{hardwareSerial}:
 *   delete:
 *     summary: Unassign a hardware device from a user (Super Admin Only)
 *     tags: [DeviceOwnership]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hardwareSerial
 *         required: true
 *         schema:
 *           type: string
 *         description: The serial number of the hardware device to unassign
 *     responses:
 *       200:
 *         description: Device unassigned successfully
 *       404:
 *         description: Device not assigned
 *       403:
 *         description: Access denied (Super Admin Only)
 *       500:
 *         description: Failed to unassign device
 */
router.delete('/unassign/:hardwareSerial', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const hardware = await Hardware.findOne({ serialNumber: req.params.hardwareSerial })
    if (!hardware) return res.status(404).json({ error: 'Hardware not found' })

    const ownership = await DeviceOwnership.findOneAndDelete({ hardware: hardware._id })
    if (!ownership) return res.status(404).json({ error: 'Device not assigned' })

    res.status(200).json({ message: 'Device unassigned successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to unassign device' })
  }
})

/**
 * @swagger
 * /api/device-ownership/user/{userEmail}:
 *   get:
 *     summary: Get all devices assigned to a user
 *     tags: [DeviceOwnership]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userEmail
 *         required: true
 *         schema:
 *           type: string
 *         description: The email of the user
 *     responses:
 *       200:
 *         description: Successfully retrieved device list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   hardwareId:
 *                     type: string
 *                     example: "6799e11f15d5de67de1389f0"
 *                   serialNumber:
 *                     type: string
 *                     example: "HW-12345678"
 *                   assignedAt:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-01-29T08:05:14.004Z"
 *       404:
 *         description: No devices found for user
 *       500:
 *         description: Failed to retrieve devices
 */

router.get('/user/:userEmail', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.userEmail })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const devices = await DeviceOwnership.find({ user: user._id }).populate('hardware', 'serialNumber')

    if (!devices.length) return res.status(404).json({ error: 'No devices found for this user' })

    // ✅ ส่งข้อมูลกลับเป็น Array ถูกต้อง
    res.status(200).json(
      devices.map(device => ({
        hardwareId: device.hardware._id,
        serialNumber: device.hardware.serialNumber,
        assignedAt: device.assignedAt,
      }))
    )
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve devices' })
  }
})

export default router
