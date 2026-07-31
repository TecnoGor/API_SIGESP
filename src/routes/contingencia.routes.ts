import { Router } from "express";
import * as ctrl from "../controllers/contingencia.controllers.js";
import * as midd from "../middlewares/contingencia.middleware.js";

const router = Router();

router.post("/carga-documentos-enviados/", midd.valPostBodyContingencia, ctrl.postCargarDocumentosEnviadosController);     // ? VERIFICADA - 27-07-2026

export default router;
