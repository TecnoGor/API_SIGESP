import app from "./app.js";
import { conexionSigespPostgresSql /*, conexionSispvenPostgresSql*/ } from "./database/db.js";


const PORT = app.get("port");

async function main() {
    try {
        await conexionSigespPostgresSql();
        // await conexionSispvenPostgresSql();

        app.listen(PORT, () => {
            console.log(`🚀 Servidor escuchando en el puerto ${PORT}...`);
        });
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

main();