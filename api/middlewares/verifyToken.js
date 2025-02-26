import jwt from 'jsonwebtoken'

const verifyToken = (req, res, next) => {
  try {
    // ✅ ดึง Token จาก Header
    const authHeader = req.header('Authorization')
    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.' })
    }

    // ✅ ตรวจสอบว่า Token มี "Bearer " นำหน้าหรือไม่
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader
    if (!token) {
      return res.status(401).json({ error: 'Access denied. Invalid token format.' })
    }

    // ✅ ตรวจสอบความถูกต้องของ Token
    const verified = jwt.verify(token, process.env.JWT_SECRET)
    req.user = verified // 👉 ผูกข้อมูล User ไว้ที่ `req.user`

    next() // ✅ ดำเนินการต่อไป
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' }) // 🚨 ป้องกัน Token หมดอายุ
  }
}

export default verifyToken
