import { Router } from "express";
import * as ctrl from "../controllers/contingencia.controllers.js";
// import * as vali from "../middlewares/params.middleware.js";
// import { verificaToken } from "../middlewares/token.middleware.js";

const router = Router();

router.post("/carga-documentos-enviados/", ctrl.postCargarDocumentosEnviadosController);     // ? VERIFICADA - 27-07-2026

export default router;
