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

// Verifica que Redis esté listo y responda antes de iniciar el servidor HTTP.
export async function verificarConexionRedis(timeoutMs = 10000): Promise<void> {
    if (redis.status !== 'ready') {
        await new Promise<void>((resolve, reject) => {
            const cleanup = () => {
                clearTimeout(timeout);
                redis.off('ready', onReady);
                redis.off('end', onEnd);
            };

            const onReady = () => {
                cleanup();
                resolve();
            };

            const onEnd = () => {
                cleanup();
                reject(new Error('Redis cerró la conexión antes de estar listo'));
            };

            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error(`Redis no estuvo disponible en ${timeoutMs} ms`));
            }, timeoutMs);

            redis.once('ready', onReady);
            redis.once('end', onEnd);
        });
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
        const respuesta = await Promise.race([
            redis.ping(),
            new Promise<never>((_, reject) => {
                timeout = setTimeout(
                    () => reject(new Error(`Redis no respondió a PING en ${timeoutMs} ms`)),
                    timeoutMs,
                );
            }),
        ]);

        if (respuesta !== 'PONG') {
            throw new Error('Redis respondió con un resultado inesperado al comando PING');
        }
    } finally {
        if (timeout) {
            clearTimeout(timeout);
        }
    }
}