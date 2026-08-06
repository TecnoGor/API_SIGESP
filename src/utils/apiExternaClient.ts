import axios from 'axios';
import { pool } from "../database/db.js";
import { AppError } from './appError.js';
import type { IConfiguracionCgi } from '../types/IConfiguracionCgi.js';

// 1. Instancia exclusiva
const apiExternaClient = axios.create({
    baseURL: process.env.APP_API_CGI_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' }
});

// 2. Función aislada que pide y guarda el token (Puro async/await)
async function obtenerYGuardarNuevoToken() {
    // console.log('🔄 Solicitando nuevo token a la API externa...');
    
    const payLoad = {
        userName: process.env.APP_API_CGI_USER,
        userPassword: process.env.APP_API_CGI_PASSWORD
    };
    
    // Usamos axios global para no entrar en bucle
    const response = await axios.post(
        `${process.env.APP_API_CGI_URL}/api/Invoice/create_token_authenticator`, 
        payLoad
    );

    if (response.data.success && response.data.token) {
        const newToken = response.data.token;

        // Actualiza los datos de la configuracion Local
        const query = 'SELECT * FROM fn_api_patch_configuracion_cgi($1, $2, $3, $4, $5)';
        await pool.query(query, [null, null, null, null, newToken]);

        // console.log('✅ Nuevo token guardado en BD');
        
        return newToken;
    } 

    throw new AppError(`❌ No se pudo obtener el token. ${response.data.message.trim()} `, 401, "interceptor:obtenerYGuardarNuevoToken");
}

// --------------------------------------------------------
// INTERCEPTOR DE SALIDA (Petición)
// --------------------------------------------------------
apiExternaClient.interceptors.request.use(async (config) => {
    // Busco los datos de la configuracion CGI
    const query = 'SELECT * FROM fn_api_get_configuracion_cgi()';
    const result = await pool.query<IConfiguracionCgi>(query);    

    // verifico si la aplicacion esta registrada
    if (result.rows.length <= 0 ) {
        throw new AppError('Aplicacion No Registrada', 401, "interceptor:request");
    }

    // Obtengo el token
    let token = result.rows[0]?.token;

    // Si el token esta vacio solicitamos uno directo
    if (!token) {
        // console.log('⚠️ ***** SIN TOKEN *****');
        
        token = await obtenerYGuardarNuevoToken();
    }

    // Inyectamos el token
    config.headers['Authorization'] = `Bearer ${token}`;
    
    return config;
});

// --------------------------------------------------------
// INTERCEPTOR DE ENTRADA (Manejo del 401)
// --------------------------------------------------------
apiExternaClient.interceptors.response.use(
    (response) => {
        return response; // Todo bien (200 OK)
    },
    async (error) => {
        const originalRequest = error.config;

        // Si dio 401 y no hemos reintentado esta petición antes
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // console.log('⚠️ Token expirado detectado (401). Renovando...');

            try {
                // Pedimos el token nuevo directamente
                const newToken = await obtenerYGuardarNuevoToken();

                // Actualizamos la cabecera con el nuevo token
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                
                // Reintentamos la petición original
                return await apiExternaClient(originalRequest);
                
            } catch (refreshError) {
                // Si falla la renovación, arrojamos el error
                throw refreshError;
            }
        }

        // Si es otro error (500, 400), lo dejamos pasar al servicio
        throw error;
    }
);

export default apiExternaClient;