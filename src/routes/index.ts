import { Router } from "express";
import routerRaiz from "./raiz.routes.js";
import routerAuth from "./auth.routes.js";
import routerConfig from "./config.routes.js";
import routerFactura from "./factura.routes.js";
import routerNotaCredto from "./notaCredito.routes.js";
import routerRetencion from "./retencion.routes.js";
import routerContingencia from "./contingencia.routes.js";

const routes = Router();

routes.use("/", routerRaiz);
routes.use("/auth", routerAuth);
routes.use("/configuracion", routerConfig);
routes.use("/factura", routerFactura);
routes.use("/nota-credito", routerNotaCredto);
routes.use("/retencion", routerRetencion);
routes.use("/contingencia", routerContingencia);

export default routes;
