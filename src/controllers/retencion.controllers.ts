// import type { NextFunction, Request, Response } from "express";
// import * as serv from "../services/retencion.services.js";
// import { AppError } from "../utils/appError.js";

// export async function getRetencionesIslrController(
//     req: Request,
//     res: Response,
//     next: NextFunction,
// ): Promise<void> {
//     // 1. Desestructuras con 'as any' para evitar el error de string[]
//     const { _id } = req.params as any;

//     const results = await serv.getRetencionesIslrService(_id);

//     res.status(200).json({
//         error: false,
//         status: 200,
//         message: "Ok",
//         data: results,
//         pagination: null,
//     });
// }

// export async function getRetencionesIvaController(
//     req: Request,
//     res: Response,
//     next: NextFunction,
// ): Promise<void> {
//     // 1. Desestructuras con 'as any' para evitar el error de string[]
//     const { _id } = req.params as any;

//     const results = await serv.getRetencionesIvaService(_id);

//     res.status(200).json({
//         error: false,
//         status: 200,
//         message: "Ok",
//         data: results,
//         pagination: null,
//     });
// }

// export async function postAgregarRetencionIsrlController(
//     req: Request,
//     res: Response,
//     next: NextFunction,
// ): Promise<void> {
//     const result = await serv.postAgregarRetencionIsrlService();

//     res.status(200).json({
//         error: false,
//         status: 200,
//         message:
//             result.length > 0
//                 ? "Sedes sincronizadas correctamente"
//                 : "No hubo sedes nuevas para crear",
//         data: result,
//         pagination: null,
//     });
// }

// export async function postAgregarRetencionIvaController(
//     req: Request,
//     res: Response,
//     next: NextFunction,
// ): Promise<void> {
//     const result = await serv.postAgregarRetencionIvaService();

//     res.status(200).json({
//         error: false,
//         status: 200,
//         message:
//             result.length > 0
//                 ? "Sedes sincronizadas correctamente"
//                 : "No hubo sedes nuevas para crear",
//         data: result,
//         pagination: null,
//     });
// }

// export async function postAnularRetencionIvaIslrController(
//     req: Request,
//     res: Response,
//     next: NextFunction,
// ): Promise<void> {
//     const result = await serv.postAnularRetencionIvaIslrService();

//     res.status(200).json({
//         error: false,
//         status: 200,
//         message:
//             result.length > 0
//                 ? "Sedes sincronizadas correctamente"
//                 : "No hubo sedes nuevas para crear",
//         data: result,
//         pagination: null,
//     });
// }