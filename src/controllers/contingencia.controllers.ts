import type { NextFunction, Request, Response } from "express";
import * as serv from "../services/contingencia.services.js";

// ? VERIFICADA - 27-07-2026
export async function postCargarDocumentosEnviadosController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const result = await serv.postCargarDocumentosEnviadosService();

    res.status(201).json({
        error: false,
        status: 201,
        message: "Se cargaron los documentos correctamente",
        data: result,
        pagination: null,
    });
}