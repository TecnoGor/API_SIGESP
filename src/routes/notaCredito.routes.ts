import { Router } from "express";
import * as ctrl from "../controllers/notaCredito.controllers.js";
import * as vali from "../middlewares/params.middleware.js";
import * as midd from "../middlewares/body.middleware.js";
import { verificaToken } from "../middlewares/token.middleware.js";

const router = Router();

router.post("/:id_doc", verificaToken, vali.valPathParamIdDoc, midd.valBodyCodigoUsuario, ctrl.postCrearNCController);                  // ? LISTA: 17-09-2026
router.post("/parcial/:id_doc", verificaToken, vali.valPathParamIdDoc, midd.valBodyCodigoUsuario, ctrl.postCrearNCParcialController);   // ? LISTA: 17-09-2026

export default router;
