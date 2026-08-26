import { Pool } from "pg";
import { AppError } from "../utils/appError";

// 1. Creamos y EXPORTAMOS el pool afuera de la función
// De esta forma, podrás importarlo en tus controladores para hacer consultas.
export const poolSigesp = new Pool({
    user: process.env.APP_DB_SIGESP_USER,
    host: process.env.APP_DB_SIGESP_HOST,
    database: process.env.APP_DB_SIGESP_DATABASE,
    password: process.env.APP_DB_SIGESP_PASSWORD,
    port: parseInt((process.env.APP_DB_SIGESP_PORT as string) || "5432")
});

// 1. Creamos y EXPORTAMOS el pool afuera de la función
// De esta forma, podrás importarlo en tus controladores para hacer consultas.
// export const poolSispven = new Pool({
//     user: process.env.APP_DB_SISPVEN_USER,
//     host: process.env.APP_DB_SISPVEN_HOST,
//     database: process.env.APP_DB_SISPVEN_DATABASE,
//     password: process.env.APP_DB_SISPVEN_PASSWORD,
//     port: parseInt((process.env.APP_DB_SISPVEN_PORT as string) || "5432")
// });

// TIP 2: Manejo de errores en conexiones inactivas (Idle)
// Si la base de datos se cae MIENTRAS la app está corriendo, esto evita que Node haga crash.
poolSigesp.on('error', (err, client) => {
    console.error('❌ Error inesperado en un cliente inactivo de SISGESP PostgreSQL', err);
    process.exit(-1);
});

// TIP 2: Manejo de errores en conexiones inactivas (Idle)
// Si la base de datos se cae MIENTRAS la app está corriendo, esto evita que Node haga crash.
// poolSispven.on('error', (err, client) => {
//     console.error('❌ Error inesperado en un cliente inactivo de SISPVEN PostgreSQL', err);
//     process.exit(-1);
// });

export async function conexionSigespPostgresSql() {
    try {     
        console.log('Intentando conectar a SISGESP PostgreSQL...');

        // 2. Forzamos la conexión pidiendo un cliente al pool
        const client = await poolSigesp.connect();
        
        console.log(`✅ Conectado con éxito a la Base de Datos SISGESP: ${process.env.APP_DB_SIGESP_DATABASE}`);
        
        // 3. Liberamos el cliente de vuelta al pool para que no se quede colgado
        client.release();
        
    } catch (error) {
        const message =
            error instanceof Error
                ? `❌ Error al conectar con SISGESP PostgresSQL: ${error.message.trim()}`
                : `❌ Error desconocido al conectar con SISGESP PostgresSQL`;

        throw new AppError(message, 500, "db:conexionSigespPostgresSql");
    }
}

// export async function conexionSispvenPostgresSql() {
//     try {     
//         console.log('Intentando conectar a SISPVEN PostgreSQL...');

//         // 2. Forzamos la conexión pidiendo un cliente al pool
//         const client = await poolSispven.connect();
        
//         console.log(`✅ Conectado con éxito a la Base de Datos SISPVEN: ${process.env.APP_DB_SISPVEN_DATABASE}`);
        
//         // 3. Liberamos el cliente de vuelta al pool para que no se quede colgado
//         client.release();
        
//     } catch (error) {
//         const message =
//             error instanceof Error
//                 ? `❌ Error al conectar con SISPVEN PostgresSQL: ${error.message.trim()}`
//                 : `❌ Error desconocido al conectar con SISPVEN PostgresSQL`;

//         throw new AppError(message, 500, "db:conexionSispvenPostgresSql");
//     }
// }
