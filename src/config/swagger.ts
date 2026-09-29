import swaggerJsdoc from "swagger-jsdoc";

let cachedSpec: any = null;

export function getSwaggerSpec() {
  if (cachedSpec) return cachedSpec;

  const isDist = process.env.NODE_ENV === "production" && !process.env.TSX_WATCH;
  const apis = isDist
    ? ["./dist/app.js", "./dist/modules/**/*.routes.js"]
    : ["./src/app.ts", "./src/modules/**/*.routes.ts"];

  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Infano Care API",
        version: "0.1.0",
        description: "API documentation for the Infano Care backend services.",
      },
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
    apis,
  };

  cachedSpec = swaggerJsdoc(options);
  return cachedSpec;
}

