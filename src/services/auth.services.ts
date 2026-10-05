import { timingSafeEqual } from "crypto";
import { AppError } from "../utils/appError.js";
import * as func from "../utils/funcionesGlobales.js";
import type { IPayLoadToken } from "../types/IPayLoadToken.js";
import type { IRequestToken } from "../types/IRequestToken.js";

// Comparación de strings inmune a ataques de temporización (Timing Attack).
// Siempre compara la longitud completa sin abortar en el primer caracter diferente.
function comparacionSegura(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    if (bufA.length !== bufB.length) {
        // Comparamos contra sí mismo para consumir el mismo tiempo de CPU
        // y no revelar la longitud esperada por diferencia de latencia.
        timingSafeEqual(bufA, bufA);
        return false;
    }

    return timingSafeEqual(bufA, bufB);
}

// ? LISTA: 17-09-2026
export async function postTokenService(data: IRequestToken): Promise<string> {
    const validClientId = process.env.APP_API_CONFIG_ID_CLIENTE?.trim();
    const validClientKey = process.env.APP_API_CONFIG_KEY?.trim();

    // Medida de seguridad en caso de olvidar configurar el .env
    if (!validClientId || !validClientKey) {
        throw new AppError('Acceso Denegado. Error de configuración del servidor', 500, "service:postTokenService");
    }

    // Comparación segura contra ataques de temporización (Timing Attack)
    const idValido = comparacionSegura(data.id_cliente.trim(), validClientId);
    const keyValida = comparacionSegura(data.key.trim(), validClientKey);

    if (!idValido || !keyValida) {
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