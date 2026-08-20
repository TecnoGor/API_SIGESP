import type { NextFunction, Request, Response } from "express";
import * as serv from "../services/integracion.services.js";
import type { IRequestIntegracionFactura } from "../types/IRequestIntegracionFactura.js";

// ! QUITAR SOLO POR PRUEBAS
export async function yyyyController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const result = await serv.yyyyService();

    res.status(200).json({
        error: false,
        status: 200,
        message: "Ok",
        data: result,
        pagination: null,
    });
}

// ? VERIFICADA - 27-07-2026
export async function postIntegracionFacturaController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const data: IRequestIntegracionFactura = req.body;

    const result = await serv.postIntegracionFacturaService(data);

    res.status(201).json({
        error: false,
        status: 201,
        message: "Se envio la factura correctamente",
        data: result,
        pagination: null,
    });
}
