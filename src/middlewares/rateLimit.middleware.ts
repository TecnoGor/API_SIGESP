import type { Request, Response, NextFunction } from "express";
import { redis } from "../database/redis.js";
import { AppError } from "../utils/appError.js";

/**
 * Rate limiter distribuido respaldado por Redis para endpoints de autenticación.
 * Protege contra fuerza bruta y saturación permitiendo un máximo de 15 peticiones por minuto por IP.
 */
export async function rateLimitAuth(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const clientIp = req.ip || req.socket.remoteAddress || "desconocido";
        const key = `ratelimit:auth:${clientIp}`;
        const MAX_ATTEMPTS = 15;
        const WINDOW_SECONDS = 60;

        const currentAttempts = await redis.incr(key);

        if (currentAttempts === 1) {
            await redis.expire(key, WINDOW_SECONDS);
        }

        if (currentAttempts > MAX_ATTEMPTS) {
            return next(
                new AppError(
                    "Demasiados intentos de autenticación desde esta dirección IP. Por favor espere 1 minuto antes de reintentar.",
                    429,
                    "middleware:rateLimitAuth"
                )
            );
        }

        next();
    } catch (err) {
        // En caso de incidencia transitoria en Redis, no bloqueamos la autenticación legítima (fail-open)
        console.warn("⚠️ Advertencia: No se pudo verificar el rate limit en Redis:", err);
        next();
    }
}
