import { Router } from "express";
import * as ctrl from "../controllers/retencion.controllers.js";
import * as vali from "../middlewares/params.middleware.js";
import * as midd from "../middlewares/body.middleware.js";
import { verificaToken } from "../middlewares/token.middleware.js";

const router = Router();

router.post("/isrl/:numcom", verificaToken, vali.valPathParamNumCom, midd.valBodyCodigoUsuario, ctrl.postAgregarRetencionIsrlController);   // ? LISTA: 17-09-2026
router.post("/iva/:numcom", verificaToken, vali.valPathParamNumCom, midd.valBodyCodigoUsuario, ctrl.postAgregarRetencionIvaController);     // ? LISTA: 17-09-2026

// router.get("/islr", verificaToken, ctrl.getRetencionesIslrController);      // ! NO APLICA: 17-09-2026
// router.get("/iva", verificaToken, ctrl.getRetencionesIvaController);        // ! NO APLICA: 17-09-2026        

export default router;