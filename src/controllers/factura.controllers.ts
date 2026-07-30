import type { NextFunction, Request, Response } from "express";
import * as serv from "../services/factura.services.js";

// ? VERIFICADA - 27-07-2026
export async function postAgregarController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const { id_fact } = req.params as any;

    const result = await serv.postAgregarService(parseInt(id_fact));

    res.status(201).json({
        error: false,
        status: 201,
        message: "Factura creada correctamente",
        data: result,
        pagination: null,
    });
}

// ? VERIFICADA - 27-07-2026
export async function postAnularController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const { id_fact } = req.params as any;

    const result = await serv.postAnularService(parseInt(id_fact));

    res.status(201).json({
        error: false,
        status: 201,
        message: "Factura anulada correctamente",           
        data: null,
        pagination: null,
    });
}