import swaggerJsDoc from 'swagger-jsdoc';

const API_BASE_URL = process.env.NODE_ENV === "production"
  ? "https://yakgreen.farmbird.live/api"
  : "http://localhost:5000/api";  // ✅ ใช้ `/api` ให้ตรงกับ Proxy ของ Nginx

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Farm API',
      version: '1.0.0',
      description: 'API documentation for Smart Farm system',
    },
    servers: [
      {
        url: API_BASE_URL,
        description: process.env.NODE_ENV === "production" ? "Production server" : "Development server",
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js'], // ระบุ Path ที่เก็บ API Docs (Swagger Comments)
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
export default swaggerDocs;
