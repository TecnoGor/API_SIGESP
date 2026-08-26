import { Router } from "express";
import * as ctrl from "../controllers/retencion.controllers.js";
import * as vali from "../middlewares/params.middleware.js";
import * as midd from "../middlewares/body.middleware.js";
import { verificaToken } from "../middlewares/token.middleware.js";

const router = Router();

router.get("/islr",verificaToken, ctrl.getRetencionesIslrController);
router.get("/iva",verificaToken, ctrl.getRetencionesIvaController);
router.post("/isrl/:numcom", verificaToken, vali.valPathParamNumCom, midd.valBodyCodigoUsuario, ctrl.postAgregarRetencionIsrlController);   // ? VERIFICADA - 27-07-2026
router.post("/iva/:numcom", verificaToken, vali.valPathParamNumCom, midd.valBodyCodigoUsuario, ctrl.postAgregarRetencionIvaController);     // ? VERIFICADA - 27-07-2026

// router.post(
//     "/anular/:numcom",
//     // verificaToken,
//     // verificaAutorizacionAdmin,
//     ctrl.postAnularRetencionIvaIslrController,
// );

export default router;