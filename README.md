# 🌿 Yak Green - Smart Farm Project

## 📌 Overview
Yak Green เป็นโปรเจคที่ใช้ **MQTT** และ **MongoDB** ในการจัดการข้อมูล **Sensor** โดยมี **Vue.js** เป็น Frontend และ **Node.js API** เป็น Backend

ระบบนี้รันอยู่บน **Docker Compose** และใช้ **Nginx** เป็น Reverse Proxy สำหรับการให้บริการ API และ Vue Web App

นอกจากนี้ **MongoDB Compass** ถูกใช้ในการ Monitor และจัดการฐานข้อมูล

---

## 🚀 1️⃣ เซิร์ฟเวอร์ที่ใช้ (Digital Ocean)
### 💾 สเปคขั้นต่ำที่แนะนำ
- **Ubuntu 22.04 LTS**
- **CPU:** 1 vCPU
- **RAM:** 2 GB (แนะนำ 2GB ขึ้นไป)
- **Storage:** 25GB SSD
- **Bandwidth:** 1TB (ขึ้นอยู่กับการใช้งาน)

---

## ⚙️ 2️⃣ ติดตั้งแพ็กเกจพื้นฐานในเซิร์ฟเวอร์
### 🔄 อัปเดตระบบ
```sh
sudo apt update && sudo apt upgrade -y
```

### 🐋 ติดตั้ง Docker และ Docker Compose
```sh
sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker
```

### 🔧 ให้สิทธิ์ Docker กับ User ปัจจุบัน (ไม่ต้องใช้ `sudo` ทุกครั้ง)
```sh
sudo usermod -aG docker $USER
```
🔄 รีล็อกอิน หรือรัน `newgrp docker` เพื่อให้มีผลทันที

---

## 🔑 3️⃣ ติดตั้ง SSL Certificate ด้วย Certbot
🔨 ติดตั้ง Certbot
```sh
sudo apt install -y certbot
```
🔒 ขอ SSL Certificate ใหม่ Certbot
```sh
sudo certbot certonly --standalone -d yakgreen.farmbird.live
```
🔄 Certificate จะถูกเก็บไว้ที่ `/etc/letsencrypt/live/yakgreen.farmbird.live/`

⚠️ เพิ่มสิทธิ์ให้ Certbot เพื่อแน่ให้ Mosquitto และ Nginx เข้าถึงได้
```sh
sudo chmod -R 755 /etc/letsencrypt/live /etc/letsencrypt/archive
sudo chmod 644 /etc/letsencrypt/archive/yakgreen.farmbird.live/*
```
---

## 🏗 4️⃣ เตรียม Vue Web App
### 🔹 Build Vue.js ก่อนนำขึ้นเซิร์ฟเวอร์
```sh
cd vue_app
npm install
npm run build
```
จากนั้น **คัดลอก `dist/` ไปยังเซิร์ฟเวอร์**
```sh
scp -r vue_app/dist deploy@your-server-ip:/home/deploy/Yak_Green/vue_app/
```

---

## 🐳 5️⃣ ตั้งค่าและรัน Docker Compose
```sh
docker-compose up -d --build
```
🔍 ตรวจสอบสถานะของทุก Container
```sh
docker ps
```

---

## 🛠 6️⃣ การอัปเดตและแก้ไขปัญหา
### 🔄 อัปเดต Code และ Restart
```sh
git pull origin main
docker-compose down
docker-compose up -d --build
```

### 🚑 ดู Log ของแต่ละ Service
```sh
docker logs -f api
docker logs -f mqtt-service
docker logs -f nginx
```

### 🗑 หยุดและลบ Container ทั้งหมด
```sh
docker-compose down -v
```

---

## 🔍 7️⃣ ใช้ MongoDB Compass เพื่อตรวจสอบ Database
### 🔗 Connection URI
```
mongodb://MONGO_INITDB_ROOT_USERNAME:MONGO_INITDB_ROOT_PASSWORD@your-server-ip:27017/?authSource=admin
```
📌 เปลี่ยน `your-server-ip` เป็น **IP ของเซิร์ฟเวอร์จริง**

---
## 💡 **พร้อมใช้งาน!** 🎉
```md
🔹 **Frontend:**  [https://yakgreen.farmbird.live/](https://yakgreen.farmbird.live/)
🔹 **API Docs:**  [https://yakgreen.farmbird.live/api-docs/](https://yakgreen.farmbird.live/api-docs/)
🔹 **MQTT:**  Port `1883 (TCP)` / `9001 (WebSocket)` / `8883 (WSS)`
🔹 **MongoDB:**  ใช้งานผ่าน MongoDB Compass
```
🚀 **เพียงทำตามขั้นตอนเหล่านี้ ระบบจะพร้อมใช้งานได้ทันที!** 😊