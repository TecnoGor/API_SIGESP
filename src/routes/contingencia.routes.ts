import { Router } from "express";
import * as ctrl from "../controllers/contingencia.controllers.js";
import * as midd from "../middlewares/body.middleware.js";
import { verificaToken } from "../middlewares/token.middleware.js";

const router = Router();

router.post("/tasa-dolar", verificaToken, ctrl.postTasaDolaroficialController);                                     // ? VERIFICADA - 27-07-2026
router.post("/carga-documentos-enviados", midd.valBodyCodigoUsuario, ctrl.postCargarDocumentosEnviadosController);  // ? VERIFICADA - 27-07-2026

export default router;
