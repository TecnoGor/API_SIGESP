import { Router } from "express";
import routerRaiz from "./raiz.routes.js";
import routerAuth from "./auth.routes.js";
import routerConfig from "./config.routes.js";
import routerFactura from "./factura.routes.js";
import routerNotaCredto from "./notaCredito.routes.js";
<<<<<<< HEAD
import routerRetencion from "./retencion.routes.js";
=======
>>>>>>> 933874c243f1b7de424fa96e5452bd8e2587b0b0
import routerContingencia from "./contingencia.routes.js";

const routes = Router();

routes.use("/", routerRaiz);
routes.use("/auth", routerAuth);
routes.use("/configuracion", routerConfig);
routes.use("/factura", routerFactura);
routes.use("/nota-credito", routerNotaCredto);
<<<<<<< HEAD
routes.use("/retencion", routerRetencion);
routes.use("/contingencia", routerContingencia);

export default routes;
