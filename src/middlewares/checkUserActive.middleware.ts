// import type { NextFunction, Request, Response } from "express";
// import type { IAuthenticatedRequest } from "../types/IAuthenticatedRequest.js";
// import { limpiarCookiesAutorizacion } from "../utils/funcionesGlobales.js";
// import { UsuarioModel } from "../models/usuario.model.js";
// import { AppError } from "../utils/appError.js";

// export const checkUserActive = async (
//     req: Request,
//     res: Response,
//     next: NextFunction,
// ) => {
//     // Type assertion para extender el request
//     const authReq = req as IAuthenticatedRequest;

//     const isProd = process.env.NODE_ENV === "production";

//     const user = await UsuarioModel.findById(authReq._id);

//     // SI EL USUARIO NO EXISTE O ESTÁ INACTIVO
//     if (!user || user.status.toLowerCase() === "inactivo") {
//         // Función auxiliar para matar la sesión en el navegador
//         limpiarCookiesAutorizacion(req, res);

//         // 2. Definimos el mensaje
//         const message = isProd
//             ? "No tienes autorización para acceder a este recurso"
//             : "Tu cuenta está inactiva";

//         // 3. Lanzamos el AppError con 401 (Identidad revocada)
//         throw new AppError(message, 401, "middleware:checkUserActive");
//     }

//     next();
// };
