import swaggerUi from "swagger-ui-express";
import type { Request, Response } from "express";
import openApiSpec from "./openapi.js";

export const swaggerServe = swaggerUi.serve;
export const swaggerSetup = swaggerUi.setup(openApiSpec, {
    customSiteTitle: "API_SIGESP - Documentación",
    customCss: ".swagger-ui .topbar { display: none }",
    explorer: true,
});

// Sirve el spec OpenAPI en JSON para poder importarlo en Postman/otras herramientas
export function openApiJson(_req: Request, res: Response): void {
    res.json(openApiSpec);
}
