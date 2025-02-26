import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); // ✅ โหลดค่า .env

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URL;

    if (!mongoUri) {
      throw new Error("❌ MongoDB connection failed: MONGO_URL is not defined");
    }

    await mongoose.connect(mongoUri, {
      authSource: "admin", // ✅ ใช้ Authentication จาก database `admin`
      auth: {
        username: process.env.MONGO_INITDB_ROOT_USERNAME,
        password: process.env.MONGO_INITDB_ROOT_PASSWORD,
      },
    });

    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

export default connectDB;
