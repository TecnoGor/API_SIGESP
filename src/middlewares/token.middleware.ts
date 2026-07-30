import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/appError.js";
import type { IPayLoadToken } from "../types/IPayLoadToken.js";

// ? VERIFICADA - 27-07-2026
export const verificaToken = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        // 1. Obtener el header de la petición HTTP
        const authHeader = req.headers['authorization'];

        // 2. Verificar si mandaron el header y si tiene el formato "Bearer <token>"
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('Acceso denegado. Se requiere token Bearer.', 401, "middleware:verificaToken");
        }

        // 3. Extraer solo la cadena del token (separando por el espacio)
        const token = authHeader.split(' ')[1];

        // 4. Intentar validar el token
        // Verifica que el AccessToken sea Valido o Expiro
        const payload = await validaToken(token);

        // // Type assertion para extender el request
        // const authReq = req as IAuthenticatedRequest;

        // // Agrega la informacion del token al request
        // authReq._id = decode._id;
        // authReq.email = decode.email;

        next();

    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        throw new AppError(error instanceof Error ? error.message.trim() : "Error desconocido", 500, "middleware:verificaToken");
    }    

    
};

// ? VERIFICADA - 27-07-2026
async function validaToken(token: string): Promise<IPayLoadToken> {
    try {
        // Verifica si el Token es Valido o si Expiro
        const decode: IPayLoadToken = (await jwt.verify(token, process.env.APP_ACCESS_TOKEN_SECRET!)) as IPayLoadToken;

        return decode;

    } catch (error: any) {
        switch (error?.name?.trim().toLowerCase()) {
            case "jsonwebtokenerror":
                throw new AppError("El Token de acceso no es válido", 401, "middleware:verificaToken");

            case "tokenexpirederror":
                throw new AppError("El token de acceso ha caducado", 401, "middleware:verificaToken");

            default:
                throw new AppError(error.message.trim(), 401, "middleware:verificaToken");
        }
    }
}
