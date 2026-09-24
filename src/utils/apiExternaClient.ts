import axios from 'axios';
import { redis } from "../database/redis.js"; // Importamos Redis
import { AppError } from './appError.js';

const REDIS_TOKEN_KEY = 'cgi_api_token';

// Tiempo de vida de seguridad en Redis (ej: 4 horas = 4 * 60 * 60 = 14400 segundos)
const TOKEN_TTL_SECONDS = 14400;

// 1. Instancia exclusiva
const apiExternaClient = axios.create({
    baseURL: process.env.APP_API_CGI_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' }
});

// Variables para controlar peticiones simultáneas en error 401
let isRefreshing = false;

let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (reason?: any) => void;
}> = [];

// Procesa todas las peticiones que quedaron pausadas en la cola
const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else if (token) {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

// 2. Función aislada que pide y guarda el token
async function obtenerYGuardarNuevoToken(): Promise<string> {
    const payLoad = {
        userName: process.env.APP_API_CGI_USER,
        userPassword: process.env.APP_API_CGI_PASSWORD
    };
    
    // Usamos axios global para no entrar en bucle infinito
    const response = await axios.post(
        `${process.env.APP_API_CGI_URL}/api/Invoice/create_token_authenticator`, 
        payLoad
    );

    if (response.data.success && response.data.token) {
        const newToken: string = response.data.token;

        // Guardar en Redis con un tiempo de expiración preventivo (ex)
        try {
            await redis.set(REDIS_TOKEN_KEY, newToken, 'EX', TOKEN_TTL_SECONDS);
        } catch (err) {
            console.warn('⚠️ Fallo menor: No se pudo guardar el token en Redis:', err);
        }

        return newToken;
    } 

    throw new AppError(`❌ No se pudo obtener el token. ${response.data.message?.trim() || ''}`, 401, "interceptor:obtenerYGuardarNuevoToken");
}

// --------------------------------------------------------
// INTERCEPTOR DE SALIDA (Petición)
// --------------------------------------------------------
apiExternaClient.interceptors.request.use(async (config) => {
    let token: string | null = null;

    // PASO 1. Buscar token en Redis (Memoria RAM < 1ms)
    try {
        token = await redis.get(REDIS_TOKEN_KEY);
    } catch (err) {
        console.warn('⚠️ Fallo al leer de Redis, solicitando token directo...');
    }

    // PASO 2. Si el token no estaba en Redis, pedimos uno nuevo a la API externa
    if (!token) {
        // Al llamar a esta función, ella misma se encarga de guardarlo en Redis
        token = await obtenerYGuardarNuevoToken();
    }

    // PASO 3. Inyectamos el token en las cabeceras HTTP
    config.headers['Authorization'] = `Bearer ${token}`;
    
    return config;
});

// --------------------------------------------------------
// INTERCEPTOR DE ENTRADA (Manejo del 401 y Reintentos)
// --------------------------------------------------------
apiExternaClient.interceptors.response.use(
    (response) => response, // 200 OK
    async (error) => {
        const originalRequest = error.config;

        // Si dio 401 y la petición aún no ha sido reintentada
        if (error.response?.status === 401 && !originalRequest._retry) {
            
            // Si ya hay un proceso de renovación de token activo, ponemos esta petición en cola
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                .then((newToken) => {
                    originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                    return apiExternaClient(originalRequest);
                })
                .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // 1. Eliminamos el token caducado de Redis
                try {
                    await redis.del(REDIS_TOKEN_KEY);
                } catch (rErr) {
                    // Silencioso
                }

                // 2. Pedimos y guardamos un token nuevo
                const newToken = await obtenerYGuardarNuevoToken();

                // 3. Despachamos las peticiones que quedaron en la cola esperando
                processQueue(null, newToken);

                // 4. Reintentamos la petición original que dio error 401
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                return await apiExternaClient(originalRequest);

            } catch (refreshError) {
                // Si falla la renovación, rechazamos todas las peticiones en cola
                processQueue(refreshError, null);
                throw refreshError;
            } finally {
                isRefreshing = false;
            }
        }

        // Si es otro tipo de error (500, 404, etc.), lo arrojamos directamente
        throw error;
    }
);

export default apiExternaClient;