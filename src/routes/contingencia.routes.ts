import { Router } from "express";
import * as ctrl from "../controllers/contingencia.controllers.js";
import * as midd from "../middlewares/body.middleware.js";
import { verificaToken } from "../middlewares/token.middleware.js";

const router = Router();

router.post("/carga-documentos-enviados", midd.valBodyCodigoUsuario, ctrl.postCargarDocumentosEnviadosController);          // ? LISTA: 17-09-2026
router.post("/carga-codigos-retencion-islr", midd.valBodyCodigoUsuario, ctrl.postCargarCodigosRetencionIslrController);     // ? LISTA: 17-09-2026
// router.post("/tasa-dolar", verificaToken, ctrl.postTasaDolaroficialController);                                          // ! NO APLICA: 17-09-2026

export default router;
