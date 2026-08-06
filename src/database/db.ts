import { Pool } from "pg";
import { AppError } from "../utils/appError";

// 1. Creamos y EXPORTAMOS el pool afuera de la función
// De esta forma, podrás importarlo en tus controladores para hacer consultas.
export const pool = new Pool({
    user: process.env.APP_DB_USER,
    host: process.env.APP_DB_HOST,
    database: process.env.APP_DB_DATABASE,
    password: process.env.APP_DB_PASSWORD,
    port: parseInt((process.env.APP_DB_PORT as string) || "5432")
});

// TIP 2: Manejo de errores en conexiones inactivas (Idle)
// Si la base de datos se cae MIENTRAS la app está corriendo, esto evita que Node haga crash.
pool.on('error', (err, client) => {
    console.error('❌ Error inesperado en un cliente inactivo de PostgreSQL', err);
    process.exit(-1);
});

export async function conexionPostgresSql() {
    try {     
        console.log('Intentando conectar a PostgreSQL...');

        // 2. Forzamos la conexión pidiendo un cliente al pool
        const client = await pool.connect();
        
        console.log(`✅ Conectado con éxito a la Base de Datos: ${process.env.APP_DB_DATABASE}`);
        
        // 3. Liberamos el cliente de vuelta al pool para que no se quede colgado
        client.release();
        
    } catch (error) {
        const message =
            error instanceof Error
                ? `❌ Error al conectar con PostgresSQL: ${error.message.trim()}`
                : `❌ Error desconocido al conectar con PostgresSQL`;

        throw new AppError(message, 500, "db:conexionPostgresSql");
    }
}
