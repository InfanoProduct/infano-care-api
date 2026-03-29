import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Infano Care API",
      version: "0.1.0",
      description: "API documentation for the Infano Care backend services.",
    },
    servers: [
      {
        url: "http://localhost:4005",
        description: "Local Development Server",
      },
      {
        url: "http://109.199.120.104:8084",
        description: "Staging/Dev Remote Server",
      },
      {
        url: "http://109.199.120.104:8085",
        description: "Production Remote Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    "./src/app.ts",
    "./src/modules/**/*.routes.ts",
    "./dist/app.js",
    "./dist/modules/**/*.routes.js",
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
