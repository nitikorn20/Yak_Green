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

## 🔐 3️⃣ ติดตั้ง SSL Certificate ด้วย Certbot (Webroot + Docker)
🧰 ติดตั้ง Certbot บน Host OS
```sh
sudo apt install -y certbot
```
🔒 ขอใบรับรอง Let's Encrypt ด้วย Webroot ผ่าน Docker
```sh
docker-compose run --rm certbot certonly --webroot -w /var/www/html -d yakgreen.farmbird.live
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

## 🔐 7️⃣ ใช้งาน MongoDB Compass อย่างปลอดภัย (SSH Tunnel + Private Key)

> เพื่อความปลอดภัย ไม่ควรเปิดพอร์ต MongoDB สู่ public internet  
> ให้ใช้การเชื่อมต่อแบบ **SSH Tunnel + Key File (.pem/.ppk)** แทน

### 🧩 ตัวอย่างการตั้งค่า MongoDB Compass:

| Field                   | ค่า / คำอธิบาย                          |
| ----------------------- | ------------------------------------ |
| SSH Hostname            | `your-server-ip`                     |
| SSH Username            | `deploy` (หรือชื่อผู้ใช้บนเซิร์ฟเวอร์ของคุณ)   |
| SSH Identity File       | ไฟล์ `.pem` หรือ `.ppk` สำหรับเชื่อมต่อ SSH |
| MongoDB Hostname        | `127.0.0.1`                          |
| MongoDB Port            | `27017`                              |
| Authentication Database | `admin`                              |
| Username                | `${MONGO_INITDB_ROOT_USERNAME}`      |
| Password                | `${MONGO_INITDB_ROOT_PASSWORD}`      |

✅ ไม่จำเป็นต้องเปิดพอร์ต 27017 จาก firewall/public → ปลอดภัยกว่า

---

## 🔁 8️⃣ ตั้ง Cron Job สำหรับ Certbot (ต่ออายุ SSL อัตโนมัติ)

> ใช้ `cron` จาก **host OS** เพื่อควบคุมการต่ออายุใบรับรอง Let's Encrypt อย่างเสถียร
> ดีกว่ารัน certbot แบบ loop ภายใน container

### 🛠 ขั้นตอนการตั้งค่า:

1. เปิด Crontab:

   ```bash
   crontab -e
   ```

2. เพิ่มบรรทั้งนี้ (เปลี่ยน path ให้ตรงกับตำแหน่งโปรเจกต์ของคุณ):

   ```cron
   0 3 * * * cd /home/deploy/Yak_Green && docker-compose run --rm certbot renew --webroot -w /var/www/html && docker exec nginx nginx -s reload
   ```

### ✅ คำสั่งนี้จะ:

* ตรวจสอบใบรับ SSL ทุกวันตอนตี 3
* หากเริยกว่าสามเป็นเวลาต่ออายุ → Certbot จะ renew cert ให้
* แล้ว reload nginx เพื่อใส่ cert ใบใหม่

### 🔍 ทดสอบ้วยตนเอง:

```bash
cd /home/deploy/Yak_Green
docker-compose run --rm certbot renew --webroot -w /var/www/html
docker exec nginx nginx -s reload
```

📃 หากไม่พบการต่อ cert ลองเบบ manual แล้ว cron จะต่ออายุให้เบ็บอัตโนมัติได้อัตโมมัติ ✅


## 💡 **พร้อมใช้งาน!** 🎉
```md
🔹 **Frontend:**  [https://yakgreen.farmbird.live/](https://yakgreen.farmbird.live/)
🔹 **API Docs:**  [https://yakgreen.farmbird.live/api-docs/](https://yakgreen.farmbird.live/api-docs/)
🔹 **MQTT:**  Port `1883 (TCP)` / `9001 (WebSocket)` / `8883 (WSS)`
🔹 **MongoDB:**  ใช้งานผ่าน MongoDB Compass
```
🚀 **เพียงทำตามขั้นตอนเหล่านี้ ระบบจะพร้อมใช้งานได้ทันที!** 😊
