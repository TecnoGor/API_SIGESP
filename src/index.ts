import app from "./app.js";
import { conexionSigespPostgresSql, poolSigesp } from "./database/db.js";
import { redis, verificarConexionRedis } from "./database/redis.js";

const PORT = app.get("port");
const STARTUP_TIMEOUT_MS = 10000;

let server: ReturnType<typeof app.listen> | null = null;
let isShuttingDown = false;

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

async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n🛑 Recibida señal ${signal}. Iniciando apagado limpio (Graceful Shutdown)...`);

    // Tiempo de seguridad por si una conexión queda colgada indefinidamente
    const forceTimeout = setTimeout(() => {
        console.error("⚠️ Forzando cierre del proceso tras exceder tiempo límite de apagado.");
        process.exit(1);
    }, 10000);
    forceTimeout.unref();

    try {
        if (server) {
            await new Promise<void>((resolve) => {
                server!.close((err) => {
                    if (err) {
                        console.error("❌ Error al cerrar el servidor HTTP:", err);
                    } else {
                        console.log("✅ Servidor HTTP cerrado. No se aceptan nuevas peticiones.");
                    }
                    resolve();
                });
            });
        }

        await poolSigesp.end().catch((err) => {
            console.error("❌ Error al cerrar el pool de PostgreSQL:", err);
        });
        console.log("✅ Pool de PostgreSQL cerrado limpiamente.");

        await redis.quit().catch((err) => {
            console.error("❌ Error al desconectar Redis:", err);
        });
        console.log("✅ Conexión con Redis cerrada limpiamente.");

        console.log("🚀 Apagado limpio completado con éxito.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error imprevisto durante el apagado:", err);
        process.exit(1);
    }
}

async function main() {
    try {
        // No aceptar tráfico hasta confirmar que PostgreSQL y Redis están disponibles.
        await Promise.all([
            conTimeout(conexionSigespPostgresSql(), "PostgreSQL"),
            verificarConexionRedis(STARTUP_TIMEOUT_MS),
        ]);

        server = app.listen(PORT, () => {
            console.log(`🚀 Servidor escuchando en el puerto ${PORT}...`);
        });

        // Señales de terminación (PM2 envía SIGINT al reiniciar o recargar en Linux)
        process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
        process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));

        // Manejadores globales de emergencias
        process.on("uncaughtException", (err) => {
            console.error("💥 Excepción no capturada (uncaughtException):", err);
            void gracefulShutdown("uncaughtException");
        });

        process.on("unhandledRejection", (reason) => {
            console.error("💥 Promesa rechazada no capturada (unhandledRejection):", reason);
        });
    } catch (error) {
        console.error("❌ No se pudo iniciar la API porque una dependencia no está disponible:", error);
        redis.disconnect();
        await poolSigesp.end().catch((closeError) => {
            console.error("❌ Error al cerrar el pool de PostgreSQL:", closeError);
        });
        process.exit(1);
    }
}

main();