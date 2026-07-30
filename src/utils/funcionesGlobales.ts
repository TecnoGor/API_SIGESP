import {type NextFunction, type Request, type Response } from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import { AppError } from "../utils/appError.js";
import type { IPayLoadToken } from "../types/IPayLoadToken.js";

// ? VERIFICADA - 27-07-2026
export function ValidaDatos(
    req: Request,
    res: Response,
    next: NextFunction,
    location: string,
) {
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];

        throw new AppError(firstError.msg.trim(), 400, location);
    }
}

// ? VERIFICADA - 27-07-2026
export async function GeneraToken(payLoadToken: IPayLoadToken, location: string,
) {
    try {
        // Genera el TOKEN
        const token = await jwt.sign(
            payLoadToken, 
            process.env.APP_ACCESS_TOKEN_SECRET!,
            { expiresIn: "1h" }
        );

        return token;
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        throw new AppError(
            error instanceof Error ? error.message.trim() : "Error desconocido",
            500,
            location,
        );
    }
}

// ? LISTO - 20-06-2025
export async function Encriptar(cadena: string, location: string) {
    try {
        const salt = await bcryptjs.genSaltSync(10);

        return await bcryptjs.hashSync(cadena.toString(), salt);
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, location);
    }
}
