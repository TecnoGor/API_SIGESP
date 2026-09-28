import app from "./app.js";
import { conexionSigespPostgresSql, poolSigesp } from "./database/db.js";
import { redis, verificarConexionRedis } from "./database/redis.js";

const PORT = app.get("port");
const STARTUP_TIMEOUT_MS = 10000;

// Limita el tiempo de espera de las comprobaciones de dependencias al arrancar.
function conTimeout<T>(operacion: Promise<T>, dependencia: string): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    return Promise.race([
        operacion,
        new Promise<T>((_, reject) => {
            timeout = setTimeout(
                () => reject(new Error(`${dependencia} no respondió en ${STARTUP_TIMEOUT_MS} ms`)),
                STARTUP_TIMEOUT_MS,
            );
        }),
    ]).finally(() => {
        if (timeout) {
            clearTimeout(timeout);
        }
    });
}

async function main() {
    try {
        // No aceptar tráfico hasta confirmar que PostgreSQL y Redis están disponibles.
        await Promise.all([
            conTimeout(conexionSigespPostgresSql(), "PostgreSQL"),
            verificarConexionRedis(STARTUP_TIMEOUT_MS),
        ]);

        app.listen(PORT, () => {
            console.log(`🚀 Servidor escuchando en el puerto ${PORT}...`);
        });
    } catch (error) {
        console.error("❌ No se pudo iniciar la API porque una dependencia no está disponible:", error);
        redis.disconnect();
        await poolSigesp.end().catch((closeError) => {
            console.error("❌ Error al cerrar el pool de PostgreSQL:", closeError);
        });
        process.exitCode = 1;
    }
}

main();