import type { NextFunction, Request, Response } from "express";
import * as serv from "../services/contingencia.services.js";

// ? LISTA: 17-09-2026
export async function postCargarDocumentosEnviadosController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const { codigo_usuario } = req.body;

    const result = await serv.postCargarDocumentosEnviadosService(codigo_usuario);

    res.status(201).json({
        error: false,
        status: 201,
        message: "Se cargaron los documentos fiscales correctamente",
        data: result,
        pagination: null,
    });
}

// ? LISTA: 17-09-2026
export async function postCargarCodigosRetencionIslrController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const { codigo_usuario } = req.body;

    const result = await serv.postCargarCodigosRetencionIslrService(codigo_usuario);

    res.status(201).json({
        error: false,
        status: 201,
        message: "Se cargaron los codigos de retencion de islr correctamente",
        data: result,
        pagination: null,
    });
}

// ! NO APLICA: 17-09-2026
// export async function postTasaDolaroficialController(
//     req: Request,
//     res: Response,
//     next: NextFunction,
// ): Promise<void> {
//     const result = await serv.postTasaDolaroficialService();

//     res.status(201).json({
//         error: false,
//         status: 201,
//         message: "Tasa actualizada correctamente",
//         data: result,
//         pagination: null,
//     });
// }

