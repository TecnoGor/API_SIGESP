import "dotenv/config";
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
// import cookieParser from "cookie-parser";
import cors from "cors";
import routes from "./routes/index.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { errorBodyHandler } from "./middlewares/errorBody.middleware.js";
import { swaggerServe, swaggerSetup, openApiJson } from "./docs/swagger.js";

// Inicializaciones
const app = express();

// Settings
app.set("port", process.env.APP_PORT || 4000);

// Middleware
const isProd = process.env.NODE_ENV === "production";
const allowedOrigins: string[] = [
    process.env.FRONTEND_URL || "",
].filter(Boolean);

// En desarrollo, permitir orígenes locales para pruebas
if (!isProd) {
    allowedOrigins.push("http://localhost:4200", "http://localhost:4300");
}

app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    }),
);

app.use(morgan("dev"));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());

// Valida el cuerpo del Body
app.use(errorBodyHandler);

// 📚 Documentación Swagger (OpenAPI) - solo se expone la documentación, no modifica rutas existentes
// helmet global aplica CSP que bloquea los assets de Swagger UI, por eso se desactiva solo en /api/docs
app.get("/api/docs/openapi.json", openApiJson);
app.use(
    "/api/docs",
    helmet({ contentSecurityPolicy: false }),
    swaggerServe,
    swaggerSetup,
);

app.use("/api", routes);

// 🧯 Manejador de errores general
app.use(errorHandler);

// Exportamos la aplicacion
export default app;