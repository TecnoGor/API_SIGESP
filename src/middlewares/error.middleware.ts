import { type NextFunction, type Request, type Response } from "express";
import { AppError } from "../utils/appError.js";

export function errorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) {
    const isProd = process.env.NODE_ENV === "production";
    const statusCode = Number(err.statusCode || err.status) || 500;
    const isServerError = statusCode >= 500;

    // 1. Trazabilidad completa en logs del servidor (PM2) para errores 500
    if (isServerError) {
        console.error(
            `❌ [${new Date().toISOString()}] Error ${statusCode} en ${req.method} ${req.originalUrl}:`,
            err.stack || err
        );
    }

    // 2. Sanitización del mensaje hacia el cliente (PHP / consumidor externo)
    // Si es un error 500 no controlado en producción, ocultamos los detalles técnicos de BD.
    let clientMessage = err.message?.trim() || "Error interno del servidor";
    if (isServerError && isProd && !(err instanceof AppError)) {
        clientMessage = "Ha ocurrido un error interno en el servidor. Por favor contacte al administrador.";
    }

    res.status(statusCode).json({
        error: true,
        status: statusCode,
        message: clientMessage,
        path: req.originalUrl?.trim(),
        method: req.method?.trim(),
        ...(isProd && isServerError ? {} : { location: err.location || "desconocido" }),
    });
}
