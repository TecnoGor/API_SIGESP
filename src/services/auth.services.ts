import { AppError } from "../utils/appError.js";
import { poolSigesp } from "../database/db.js";
import * as func from "../utils/funcionesGlobales.js";
import type { IPayLoadToken } from "../types/IPayLoadToken.js";
import type { IRequestToken } from "../types/IRequestToken.js";
import type { IConfiguracionCgi } from "../types/IConfiguracionCgi.js";

// ? VERIFICADA - 27-07-2026
export async function postTokenService(data: IRequestToken): Promise<string> {
    // Busco los datos de la configuracion CGI
    const query = 'SELECT * FROM fn_api_get_configuracion_cgi()';
    const result = await poolSigesp.query<IConfiguracionCgi>(query);    

    // verifico si la aplicacion esta registrada
    if (result.rows.length <= 0 ) {
        throw new AppError('Acceso Denegado. Aplicacion No Registrada', 401, "service:postTokenService");
    }
    
     // verifico el estatus de la aplicacion cliente
    if (!result.rows[0].activo) {
        throw new AppError('Acceso Denegado. Aplicacion Inactiva', 401, "service:postTokenService");
    }

    // Verifica si es el mismo id_cliente
    if (result.rows[0].id_cliente != data.id_cliente) {
        throw new AppError('Acceso Denegado. Credenciales Incorrectas', 401, "service:postTokenService");        
    }

    // Verifica si es la misma key
    if (result.rows[0].key != data.key) {
        throw new AppError('Acceso Denegado. Credenciales Incorrectas', 401, "service:postTokenService");        
    }

    // Construye el cuerpo del payLoad
    const payLoadToken: IPayLoadToken = {
        id_cliente: await func.Encriptar(result.rows[0].id_cliente,"service:posRegisterService"),
        aplicacion: result.rows[0].aplicacion,
        //activo: await func.Encriptar(result.rows[0].activo.toString(),"service:posRegisterService")
    };

    // Genero el AccessToken
    const accessToken = await func.GeneraToken(payLoadToken, "service:postTokenService");

    return accessToken;
}