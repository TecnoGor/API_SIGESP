import type { NextFunction, Request, Response } from "express";
import * as serv from "../services/notaCredito.services.js";

// ? VERIFICADA - 27-07-2026
export async function postCrearNCController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const { id_doc } = req.params as any;
    const { codigo_usuario } = req.body;

    const result = await serv.postCrearNCService(parseInt(id_doc), codigo_usuario);

    res.status(201).json({
        error: false,
        status: 201,
        message: "Nota de Creditro creada correctamente",
        data: result,
        pagination: null,
    });
}

// ? VERIFICADA - 27-07-2026
export async function postCrearNCParcialController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const { id_doc } = req.params as any;
    const { codigo_usuario } = req.body;

    const result = await serv.postCrearNCParcialService(parseInt(id_doc), codigo_usuario);

    res.status(201).json({
        error: false,
        status: 201,
        message: "Nota de Creditro Parcial creada correctamente",
        data: result,
        pagination: null,
    });
}