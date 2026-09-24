import { AppError } from "../utils/appError.js";
import * as func from "../utils/funcionesGlobales.js";
import type { IPayLoadToken } from "../types/IPayLoadToken.js";
import type { IRequestToken } from "../types/IRequestToken.js";

// ? LISTA: 17-09-2026
export async function postTokenService(data: IRequestToken): Promise<string> {
    const validClientId = process.env.APP_API_CONFIG_ID_CLIENTE?.trim();
    const validClientKey = process.env.APP_API_CONFIG_KEY?.trim();

    // Medida de seguridad en caso de olvidar configurar el .env
    if (!validClientId || !validClientKey) {
        throw new AppError('Acceso Denegado. Error de configuración del servidor', 500, "service:postTokenService");
    }

    // Compara directamente las credenciales enviadas por la App A
    if (data.id_cliente.trim() !== validClientId || data.key.trim() !== validClientKey) {
        throw new AppError('Acceso Denegado. Credenciales Incorrectas', 401, "service:postTokenService");        
    }

    // Construye el cuerpo del payLoad
    const payLoadToken: IPayLoadToken = {
        id_cliente: await func.Encriptar(validClientId,"service:postTokenService"),
        aplicacion: process.env.APP_API_CONFIG_APLICACION?.trim()!
    };

    // Genero el AccessToken
    const accessToken = await func.GeneraToken(payLoadToken, "service:postTokenService");

    return accessToken;
}