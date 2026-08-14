import type { NextFunction, Request, Response } from "express";
import * as serv from "../services/integracion.services.js";

// ? VERIFICADA - 27-07-2026
export async function postXxxController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const { codigo_usuario } = req.body;

    const result = await serv.postXxxService(codigo_usuario);

    res.status(201).json({
        error: false,
        status: 201,
        message: "Se enviaron los documentos correctamente",
        data: result,
        pagination: null,
    });
}