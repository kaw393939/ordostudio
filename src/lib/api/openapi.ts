export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "LMS 219 API",
    version: "0.1.0",
    description: "API contract skeleton for Sprint 07 foundation.",
  },
  servers: [{ url: "/" }],
  paths: {
    "/api/v1": {
      get: {
        summary: "API root",
        responses: {
          "200": {
            description: "HAL root document",
          },
        },
      },
    },
    "/api/v1/docs": {
      get: {
        summary: "OpenAPI document",
        responses: {
          "200": {
            description: "OpenAPI 3.1 JSON",
          },
        },
      },
    },
  },
} as const;
