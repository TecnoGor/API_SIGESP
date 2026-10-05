import { type NextFunction, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import { redis } from "../database/redis.js"; // Importamos Redis
import type { IPayLoadToken } from "../types/IPayLoadToken.js";
import type { IKeyRedis } from "../types/IKeyRedis.js";
import { AppError } from "../utils/appError.js";

// ? LISTA: 17-09-2026
export function ValidaDatos(
    req: Request,
    res: Response,
    next: NextFunction,
    location: string,
) {
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];

        throw new AppError(firstError.msg.trim(), 400, location);
    }
}

// ? LISTA: 17-09-2026
export async function GeneraToken(
    payLoadToken: IPayLoadToken,
    location: string,
) {
    try {
        // Genera el TOKEN
        const token = await jwt.sign(
            payLoadToken,
            process.env.APP_ACCESS_TOKEN_SECRET!,
            { expiresIn: "1h" },
        );

        return token;
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        throw new AppError(
            error instanceof Error ? error.message.trim() : "Error desconocido",
            500,
            location,
        );
    }
}

// ? LISTA: 17-09-2026
export async function Encriptar(cadena: string, location: string) {
    try {
        const salt = await bcryptjs.genSalt(10);

        return await bcryptjs.hash(cadena.toString(), salt);
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        throw new AppError(
            error instanceof Error ? error.message.trim() : "Error desconocido",
            500,
            location,
        );
    }
}

// ? LISTA: 17-09-2026
export async function adquirirLockRedis(
    lockKey: string,
    location: string,
): Promise<string | null> {
    try {
        // Definimos el tiempo de expiración (30 segundos = 30000 ms) internamente
        const TTL_MS = 30000;

        // Generamos un token único (UUID) para ESTA petición exacta.
        const lockToken = randomUUID();

        // "PX" = expiración en milisegundos.
        // "NX" = Solo setear si No eXiste.
        // Es 100% atómico. Si 5 peticiones llegan al mismo nanosegundo,
        // Redis garantiza que solo una recibirá "OK".
        // Guardamos el UUID como valor de la llave
        const result = await redis.set(lockKey, lockToken, "PX", TTL_MS, "NX");

        // Retornamos el token si tuvimos éxito, o null si ya estaba bloqueado
        return result === "OK" ? lockToken : null;
    } catch (error) {
        // Si Redis se cae, lanzamos AppError.
        // Llegará al catch del servicio y se mostrará al frontend como 500.
        throw new AppError(
            `Fallo interno al intentar establecer el bloqueo de seguridad en Redis para la clave ${lockKey}`,
            500,
            location,
        );
    }
}

// ? LISTA: 17-09-2026
export async function liberarLockRedis(
    lockKey: string,
    lockToken: string,
): Promise<void> {
    try {
        // 1. Le decimos a Redis que vigile esta clave
        await redis.watch(lockKey);

        // 2. Leemos quién es el dueño actual
        const dueñoActual = await redis.get(lockKey);

        // 3. Verificamos si MI token sigue siendo el dueño
        if (dueñoActual === lockToken) {
            // Inicia una transacción (MULTI) para borrar
            const multi = redis.multi();

            multi.del(lockKey);

            // Ejecuta el borrado. Si la clave expiró un milisegundo antes de esto,
            // el WATCH hace que el exec() simplemente no haga nada (falla de forma segura).
            await multi.exec();
        } else {
            // Si yo ya no soy el dueño (expiró y entró otro), dejo de vigilar
            await redis.unwatch();
        }
    } catch (error) {
        // En caso de error de conexión, quitamos la vigilancia por si acaso
        await redis.unwatch().catch(() => {});
        console.error(`Fallo no crítico al liberar el lock ${lockKey}:`, error);
    }
}

// ? LISTA: 17-09-2026
export async function verificaKeyRedis(
    key: string,
    location: string,
): Promise<void> {
    try {
        // Aquí SÍ aplica tu lógica de obtener, verificar nulidad y fusionar,
        // porque en este punto la clave YA DEBE EXISTIR.
        const currentDataString = await redis.get(key);

        if (currentDataString) {
            const currentData = JSON.parse(currentDataString);

            // verifico el estatus del envio
            // 1 significa ENVIADO exitosamente a la imprenta
            if (currentData.estatusEnvioRedis === 1) {
                throw new AppError(
                    `El documento ${key} ya fue enviado exitosamente a la imprenta digital.`,
                    409,
                    location,
                );
            }
        }
    } catch (error) {
        if (error instanceof AppError) {
            throw error; // ✅ ya tiene statusCode y location
        }

        throw new AppError(
            error instanceof Error
                ? error.message.trim()
                : `Fallo de conexión al verificar la clave del Documento ${key} en Redis`,
            500,
            location,
        );
    }
}

// ? LISTA: 17-09-2026
export async function actualizarKeyRedis(
    key: string,
    payload: IKeyRedis,
): Promise<void> {
    try {
        // 8 horas = 8 * 60 * 60 = 28800 segundos
        const TOKEN_TTL_SECONDS = 28800;

        // SET con NX: Guarda la clave SOLO SI NO EXISTE.
        // Es una operación atómica. Combina tu verificación y tu registro inicial.
        // -1 error
        // 0 Rechazo
        // 1 Enviado
        await redis.set(
            key,
            JSON.stringify(payload),
            "EX",
            TOKEN_TTL_SECONDS,
            "NX",
        );

        // Aquí SÍ aplica tu lógica de obtener, verificar nulidad y fusionar,
        // porque en este punto la clave YA DEBE EXISTIR.
        const currentDataString = await redis.get(key);

        if (!currentDataString) {
            console.log(
                `No se puede actualizar Redis. La clave ${key} no existe o expiró.`,
            );
            return;
        }

        const currentData = JSON.parse(currentDataString);

        if (currentData.estatusEnvioRedis != 1) {
            // Fusionamos la estructura inicial con la nueva
            const updatedObject = { ...currentData, ...payload };

            // Guardamos la nueva estructura (sin NX, porque queremos sobreescribir)
            await redis.set(
                key,
                JSON.stringify(updatedObject),
                "EX",
                TOKEN_TTL_SECONDS,
            );
        }
    } catch (error) {
        console.log(`Fallo al intentar actualizar la clave ${key} en Redis.`);
    }
}
