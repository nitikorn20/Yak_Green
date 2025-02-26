import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import verifyToken from '../middlewares/verifyToken.js'
import verifySuperAdmin from '../middlewares/verifySuperAdmin.js'

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and authorization
 */

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Super Admin registers a new user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               role:
 *                 type: string
 *                 enum: [admin, user]
 *                 example: user
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: "Access denied: Super Admins only"
 *       500:
 *         description: Failed to create user
 */
router.post('/signup', verifyToken, verifySuperAdmin, async (req, res) => {
  const { email, password, role } = req.body

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required' })
  }

  try {
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = new User({ email, password: hashedPassword, role })
    await newUser.save()

    res.status(201).json({ message: 'User created successfully' })
  } catch (error) {
    console.error('Error creating user:', error.message)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 token:
 *                   type: string
 *                   example: "your_jwt_token_here"
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Email and password are required
 *       500:
 *         description: Failed to login
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const user = await User.findOne({ email }).select('+password') // ✅ ดึง password มาเช็ค
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' }) // ❌ User ไม่พบ
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' }) // ❌ Password ไม่ถูกต้อง
    }

    // ✅ สร้าง JWT Token พร้อมข้อมูลเพิ่มเติม
    const expiresIn = '24h'
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn },
    )

    // ✅ ส่งข้อมูล User กลับไปให้ Frontend ใช้งาน
    res.status(200).json({
      message: 'Login successful',
      token,
      expiresIn,
      userId: user._id,
      email: user.email,
      role: user.role,
    })
  } catch (error) {
    console.error('Login error:', error.message)
    res.status(500).json({ error: 'Failed to login' })
  }
})

/**
 * @swagger
 * /api/auth/login-as/{id}:
 *   post:
 *     summary: Super Admin login as a user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: Logged in as the user successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged in as user@example.com
 *                 token:
 *                   type: string
 *                   example: "user_jwt_token_here"
 *       403:
 *         description: Super Admins only
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to login as user
 */
router.post('/login-as/:id', verifyToken, verifySuperAdmin, async (req, res) => {
  const { id } = req.params

  try {
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    })

    res.status(200).json({
      message: `Logged in as ${user.email}`,
      token,
    })
  } catch (error) {
    console.error('Error logging in as user:', error.message)
    res.status(500).json({ error: 'Failed to login as user' })
  }
})

/**
 * @swagger
 * /api/auth/reset-password:
 *   put:
 *     summary: User resets their own password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 example: oldpassword123
 *               newPassword:
 *                 type: string
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Old and new password required
 *       401:
 *         description: Old password is incorrect
 *       500:
 *         description: Failed to reset password
 */
router.put('/reset-password', verifyToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old and new password required' })
  }

  try {
    const user = await User.findById(req.user.userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Old password is incorrect' })
    }

    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()

    res.status(200).json({ message: 'Password reset successfully' })
  } catch (error) {
    console.error('Error resetting password:', error.message)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

/**
 * @swagger
 * /api/auth/admin-reset-password/{id}:
 *   put:
 *     summary: Super Admin resets a user's password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: New password is required
 *       403:
 *         description: "Access denied: Super Admins only"
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to reset password
 */
router.put('/admin-reset-password/:id', verifyToken, verifySuperAdmin, async (req, res) => {
  const { id } = req.params
  const { newPassword } = req.body

  if (!newPassword) {
    return res.status(400).json({ error: 'New password is required' })
  }

  try {
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()

    res.status(200).json({ message: 'Password reset successfully' })
  } catch (error) {
    console.error('Error resetting password:', error.message)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

export default router
