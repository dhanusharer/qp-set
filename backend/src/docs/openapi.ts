export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "AMCEC QPSet Backend API",
    version: "1.0.0",
    description: "Versioned REST API for authentication, question paper assignments, courses, schemes, users, and notifications."
  },
  servers: [{ url: "/api/v1" }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    }
  },
  paths: {
    "/auth/login": {
      post: {
        security: [],
        summary: "Login with username, password, and role",
        responses: { "200": { description: "Access and refresh tokens plus user profile" } }
      }
    },
    "/assignments": {
      get: { summary: "List assignments scoped by caller role" },
      post: { summary: "Create assignment", responses: { "201": { description: "Assignment created" } } }
    },
    "/assignments/{id}": {
      patch: { summary: "Update assignment status or metadata" }
    },
    "/courses": {
      get: { summary: "List courses" },
      post: { summary: "Create course" }
    },
    "/schemes": {
      get: { summary: "List schemes" },
      post: { summary: "Create scheme with rows" }
    },
    "/notifications": {
      get: { summary: "List current user's notifications" },
      post: { summary: "Create notification" }
    }
  }
};
