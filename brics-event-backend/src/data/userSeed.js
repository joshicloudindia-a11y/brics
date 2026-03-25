// src/data/userSeed.js
import User from '../models/User.js'; 
import { v4 as uuidv4 } from 'uuid'; 

const seedAdminUser = async () => {
  try {
    const adminEmail = "joshicloudindia@gmail.com";
    const superAdminId = "a1c9e8f2-44b7-4e0a-b9a1-91c3e2f4aa01";
    
    const existingUser = await User.findOne({ email: adminEmail });
    
    if (!existingUser) {
      console.log("🌱 Seeding Super Admin...");
      const adminUser = new User({
        id: "c7f4a9d2-8b3e-4c1f-9a22-55d1e8b3c113", 
        first_name: "Deepanshu",
        last_name: "Joshi",
        email: adminEmail,
        mobile_no: "8368436412",
        role: "SUPER_ADMIN", 
        role_id: superAdminId, 
        status: "active",
        is_verified: true,
      });

      await adminUser.save();
      console.log("Super Admin 'Deepanshu' created successfully!");
    } else {
      console.log("Admin user already exists. Skipping seed.");
    }
  } catch (error) {
    console.error("❌ Seeding Error:", error.message);
  }
};

export default seedAdminUser;