# ใช้ Node.js LTS เป็น Base Image
FROM node:18

# กำหนด Working Directory
WORKDIR /app

# คัดลอกไฟล์ package.json และ package-lock.json แล้วติดตั้ง dependencies
COPY package.json package-lock.json ./
RUN npm install

# คัดลอกไฟล์ทั้งหมดลง Container
COPY . .

# เปิดพอร์ตของ API (เช่น 5000)
EXPOSE 5000

# รันเซิร์ฟเวอร์
CMD ["npm", "start"]
