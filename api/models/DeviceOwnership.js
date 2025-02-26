import mongoose from 'mongoose';
import moment from 'moment-timezone';

const deviceOwnershipSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hardware: { type: mongoose.Schema.Types.ObjectId, ref: 'Hardware', required: true },
  assignedAt: {
    type: Date,
    default: () => moment().tz("Asia/Bangkok").toDate(), // ✅ ใช้เวลา UTC+7
  },
});

const DeviceOwnership = mongoose.model('DeviceOwnership', deviceOwnershipSchema);
export default DeviceOwnership;
