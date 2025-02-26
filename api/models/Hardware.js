import mongoose from 'mongoose';
import moment from 'moment-timezone';

const valveSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  detail: { type: String, default: '' },
});

const hardwareSchema = new mongoose.Schema({
  serialNumber: { type: String, required: true, unique: true },
  model: { type: String, required: true },
  createdAt: {
    type: Date,
    default: () => moment().tz("Asia/Bangkok").toDate(), // ✅ ใช้เวลา UTC+7
  },
  valveSettings: { type: [valveSchema], default: [] },
});

const Hardware = mongoose.model('Hardware', hardwareSchema);
export default Hardware;
