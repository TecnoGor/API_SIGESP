import { Router } from "express";
import * as ctrl from "../controllers/factura.controllers.js";
import * as vali from "../middlewares/params.middleware.js";
import * as midd from "../middlewares/body.middleware.js";
import { verificaToken } from "../middlewares/token.middleware.js";

const router = Router();

router.post("/:id_fact", verificaToken, vali.valPathParamIdFact, midd.valBodyCodigoUsuario, ctrl.postAgregarController);    // ? VERIFICADA - 27-07-2026
router.post("/anulacion/:id_fact", verificaToken, vali.valPathParamIdFact, ctrl.postAnularController);                      // ? VERIFICADA - 27-07-2026

export default router;