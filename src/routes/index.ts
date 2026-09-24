import { Router } from "express";
import routerRaiz from "./raiz.routes.js";
import routerAuth from "./auth.routes.js";
import routerFactura from "./factura.routes.js";
import routerNotaCredto from "./notaCredito.routes.js";
import routerRetencion from "./retencion.routes.js";
import routerContingencia from "./contingencia.routes.js";

const routes = Router();

// USUARIOS
routes.use("/", routerRaiz);
routes.use("/auth", routerAuth);                    // ? LISTA: 17-09-2026
routes.use("/factura", routerFactura);              // ? LISTA: 17-09-2026
routes.use("/nota-credito", routerNotaCredto);      // ? LISTA: 17-09-2026
routes.use("/retencion", routerRetencion);          // ? LISTA: 17-09-2026

// ADMINISTRADOR
routes.use("/contingencia", routerContingencia);    // ? LISTA: 17-09-2026

export default routes;
