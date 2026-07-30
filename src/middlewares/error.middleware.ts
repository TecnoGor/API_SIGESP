import { type NextFunction, type Request, type Response } from "express";

export function errorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) {
    const statusCode = err.statusCode || err.status || 500;

    res.status(statusCode).json({
        error: true,
        status: statusCode,
        message: err.message?.trim() || "Error interno del servidor",
        path: req.originalUrl?.trim(),
        method: req.method?.trim(),
        location: err.location || "desconocido",
    });
}
