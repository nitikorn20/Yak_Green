import bcrypt from "bcryptjs";
import User from "../models/User.js";

export const createSuperAdmin = async () => {
  const adminEmail = "admin@example.com";
  const adminPassword = "supersecurepassword";

  try {
    console.log("🔍 Checking if Super Admin exists...");

    const existingAdmin = await User.findOne({ email: adminEmail }).exec(); // ✅ ใช้ .exec() เพื่อจับ error ง่ายขึ้น
    if (!existingAdmin) {
      console.log("🛠️ Creating Super Admin...");

      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const superAdmin = new User({
        email: adminEmail,
        password: hashedPassword,
        role: "superadmin",
      });

      await superAdmin.save();
      console.log("✅ Super Admin created successfully!");
    } else {
      console.log("ℹ️ Super Admin already exists.");
    }
  } catch (error) {
    console.error("❌ Error creating Super Admin:", error.message);
  }
};
