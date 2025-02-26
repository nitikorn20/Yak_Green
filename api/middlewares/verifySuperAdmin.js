import User from '../models/User.js'

const verifySuperAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId)
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied: Super Admin only' })
    }
    next()
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify Super Admin' })
  }
}

export default verifySuperAdmin
