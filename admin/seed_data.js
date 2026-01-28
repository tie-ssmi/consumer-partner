// seed_data.js - รันไฟล์นี้เพื่อเพิ่มข้อมูลตัวอย่างลง Firebase
import { db, collection, addDoc } from './firebase_config.js';

async function seedData() {
    try {
        // 1. เพิ่มข้อมูลระดับสมาชิก (Levels)
        const levels = [
            { level_id: 1, name: "VIP 1", price: 0, icon: "https://www.consumer-partnert.com/imgs/level_1.svg" },
            { level_id: 2, name: "VIP 2", price: 2000, icon: "https://www.consumer-partnert.com/imgs/level_2.svg" },
            { level_id: 3, name: "VIP 3", price: 5000, icon: "https://www.consumer-partnert.com/imgs/level_3.svg" },
            { level_id: 4, name: "VIP 4", price: 10000, icon: "https://www.consumer-partnert.com/imgs/level_4.svg" },
            { level_id: 5, name: "VIP 5", price: 20000, icon: "https://www.consumer-partnert.com/imgs/level_5.svg" }
        ];

        for (const lvl of levels) {
            await addDoc(collection(db, "levels"), lvl);
            console.log(`Added level: ${lvl.name}`);
        }

        // 2. เพิ่มข้อมูลสมาชิก (Users)
        const users = [
            { member_id: "2530", username: "แอรอน", level: "VIP 5", balance: 5000.86 },
            { member_id: "2529", username: "VF_o4o7s", level: "VIP 5", balance: 4255.01 },
            { member_id: "2528", username: "อาร์เอ็ม_เอปโบ", level: "VIP 1", balance: 5.00 },
            { member_id: "2527", username: "ดาเวน", level: "VIP 1", balance: 5000.00 }
        ];

        for (const user of users) {
            await addDoc(collection(db, "users"), user);
            console.log(`Added user: ${user.username}`);
        }

        alert("เพิ่มข้อมูลตัวอย่างสำเร็จ!");
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("เกิดข้อผิดพลาด: " + e.message);
    }
}

// ทำให้เรียกใช้ผ่าน Console Browser ได้
window.seedData = seedData;