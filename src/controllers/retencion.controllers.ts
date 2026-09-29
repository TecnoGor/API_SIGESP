import type { NextFunction, Request, Response } from "express";
import * as serv from "../services/retencion.services.js";

// ? LISTA: 17-09-2026
export async function postAgregarRetencionIsrlController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const { numcom } = req.params as any;
    const { codigo_usuario } = req.body;
        
    const result = await serv.postAgregarRetencionIsrlService(numcom, codigo_usuario);

    res.status(201).json({
        error: false,
        status: 201,
        message: "Retención creada correctamente",
        data: result,
        pagination: null,
    });
}

// ? LISTA: 17-09-2026
export async function postAgregarRetencionIvaController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const { numcom } = req.params as any;
    const { codigo_usuario } = req.body;
        
    const result = await serv.postAgregarRetencionIvaService(numcom, codigo_usuario);

    res.status(201).json({
        error: false,
        status: 201,
        message: "Retención creada correctamente",
        data: result,
        pagination: null,
    });
}
