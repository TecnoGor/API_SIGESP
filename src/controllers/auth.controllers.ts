import type { NextFunction, Request, Response } from "express";
import * as serv from "../services/auth.services.js";

// ? VERIFICADA - 27-07-2026
export async function postTokenController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    // const isProd = process.env.NODE_ENV === "production";
    const respuesta = await serv.postTokenService(req.body);

    res.status(200).json({
        error: false,
        status: 200,
        message: "Token de Acceso",            
        data: respuesta,
        pagination: null,
    });
}