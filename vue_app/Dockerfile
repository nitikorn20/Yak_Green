FROM nginx:stable-alpine AS production-stage

# ใช้ไฟล์ที่ build แล้ว (คัดลอกจากโฮสต์)
COPY ./dist /usr/share/nginx/html

# เปิด port 80
EXPOSE 80

# รัน Nginx
CMD ["nginx", "-g", "daemon off;"]
