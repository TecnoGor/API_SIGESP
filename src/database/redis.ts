import Redis from 'ioredis';

export const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,

    // Estrategia de reconexión: Intenta reconectar progresivamente (hasta 2 segundos)
    retryStrategy(times) {
        return Math.min(times * 50, 2000);
    },

    // CORRECCIÓN CRÍTICA:
    // Si la app intenta leer/escribir y Redis está caído, fallará al primer intento,
    // permitiendo que tu bloque try/catch maneje el error al instante.
    maxRetriesPerRequest: 1,
});

redis.on('connect', () => {
    console.log('✅ Conectado a Redis con éxito');
});

redis.on('error', (err) => {
    console.error('⚠️ Error en conexión Redis:', err.message);
});