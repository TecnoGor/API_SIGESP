import { poolSigesp } from "../database/db.js";
import type { IRequestConfiguracion } from "../types/IRequestConfiguracion.js";
import type { IConfiguracion } from "../types/IConfiguracion.js";
import type { IConfiguracionCgi } from "../types/IConfiguracionCgi.js";
import type { IRequestConfiguracionCgi } from "../types/IRequestConfiguracionCgi.js";

// ? VERIFICADA - 27-07-2026
export async function getConfiguracionService(): Promise<IConfiguracion[]> {
    // Busco los datos de la configuracion Local
    const query = 'SELECT * FROM fn_api_get_configuracion()';
    const result = await poolSigesp.query<IConfiguracion>(query);    
    
    // retornamos las filas
    return result.rows;
}

// ? VERIFICADA - 27-07-2026
export async function getConfiguracionCgiService(): Promise<IConfiguracionCgi[]> {
    // Busco los datos de la configuracion CGI
    const query = 'SELECT * FROM fn_api_get_configuracion_cgi()';
    const result = await poolSigesp.query<IConfiguracionCgi>(query);    
    
    // retornamos las filas
    return result.rows;
}

// ? VERIFICADA - 27-07-2026
export async function postConfiguracionService(): Promise<void> {
    const data: IRequestConfiguracion = {
        id_cliente: process.env.APP_API_CONFIG_ID_CLIENTE!,
        key: process.env.APP_API_CONFIG_KEY!        
    }

    // Elimina los datos de la configuracion Local
    const query1 = 'SELECT * FROM fn_api_delete_configuracion()';
    const result1 = await poolSigesp.query(query1);    
    
    // Inserta los datos de la configuracion Local
    const query2 = 'SELECT * FROM fn_api_post_configuracion($1, $2)';
    const result2 = await poolSigesp.query(query2, [data.id_cliente, data.key]);    

    return;
}

// ? VERIFICADA - 27-07-2026
export async function postConfiguracionCgiService(): Promise<void> {
    const data: IRequestConfiguracionCgi = {
        id_cliente: process.env.APP_API_CONFIG_ID_CLIENTE!,
        key: process.env.APP_API_CONFIG_KEY!,
        aplicacion: process.env.APP_API_CONFIG_APLICACION!,
        activo: false
    }

    // Elimina los datos de la configuracion Local
    const query1 = 'SELECT * FROM fn_api_delete_configuracion_cgi()';
    const result1 = await poolSigesp.query(query1);    
    
    // Inserta los datos de la configuracion Local
    const query2 = 'SELECT * FROM fn_api_post_configuracion_cgi($1, $2, $3, $4)';
    const result2 = await poolSigesp.query(query2, [data.id_cliente, data.key, data.aplicacion, data.activo]); 

    return;
}

// ? VERIFICADA - 27-07-2026
export async function patchConfiguracionService(data: IRequestConfiguracion): Promise<void> {
    // Actualiza los datos de la configuracion Local
    const query = 'SELECT * FROM fn_api_patch_configuracion($1, $2)';
    const result = await poolSigesp.query(query, [data.id_cliente, data.key]);    

    return;
}

// ? VERIFICADA - 27-07-2026
export async function patchConfiguracionCgiService(data: IRequestConfiguracionCgi): Promise<void> {
    // Actualiza los datos de la configuracion Local
    const query = 'SELECT * FROM fn_api_patch_configuracion_cgi($1, $2, $3, $4)';
    const result = await poolSigesp.query(query, [data.id_cliente, data.key, data.aplicacion, data.activo]);    

    return;
}

// ? VERIFICADA - 27-07-2026
export async function deleteConfiguracionService(): Promise<void> {
    // Elimina los datos de la configuracion Local
    const query = 'SELECT * FROM fn_api_delete_configuracion()';
    await poolSigesp.query(query);    

    return;
}

// ? VERIFICADA - 27-07-2026
export async function deleteConfiguracionCgiService(): Promise<void> {
    // Elimina los datos de la configuracion Local
    const query = 'SELECT * FROM fn_api_delete_configuracion_cgi()';
    await poolSigesp.query(query);    

    return;
}