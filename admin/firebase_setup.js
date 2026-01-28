// firebase_setup.js

// 🔴 1. ใส่ Config ของคุณที่นี่ (เอาอันเดียวกับที่คุณใช้เติมข้อมูลสำเร็จ) 🔴
const firebaseConfig = {
  apiKey: "AIzaSyBoBjFEt-_L0x_s4LIx-ofKudaBZm2KECg",
  authDomain: "consumer-partner.firebaseapp.com",
  projectId: "consumer-partner",
  storageBucket: "consumer-partner.firebasestorage.app",
  messagingSenderId: "1010465725562",
  appId: "1:1010465725562:web:c0df6c2aadd65764f9afc3"
};

// 2. เริ่มทำงาน (โค้ดชุดนี้รองรับทุกหน้า)
if (typeof firebase !== 'undefined') {
    // ป้องกันการเชื่อมต่อซ้ำ
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    // ประกาศตัวแปร db ให้ทุกหน้าใช้ได้
    window.db = firebase.firestore();
    
    console.log("✅ Firebase Connected via Setup File!");
} else {
    console.error("❌ Error: ไม่พบ Firebase Library ในหน้า HTML");
}