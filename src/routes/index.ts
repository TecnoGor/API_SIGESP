import { Router } from "express";
import routerRaiz from "./raiz.routes.js";
import routerAuth from "./auth.routes.js";
import routerConfig from "./config.routes.js";
import routerFactura from "./factura.routes.js";
import routerNotaCredto from "./notaCredito.routes.js";
import routerRetencion from "./retencion.routes.js";
import routerContingencia from "./contingencia.routes.js";
import routerIntegracion from "./integracion.routes.js";

const routes = Router();

// USUARIOS
routes.use("/", routerRaiz);
routes.use("/auth", routerAuth);
routes.use("/factura", routerFactura);
routes.use("/nota-credito", routerNotaCredto);
routes.use("/retencion", routerRetencion);

// ADMINISTRADOR
routes.use("/configuracion", routerConfig);
routes.use("/contingencia", routerContingencia);

// INTEGRACION
routes.use("/integracion", routerIntegracion);

export default routes;
