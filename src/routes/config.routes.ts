import { Router } from "express";
import * as ctrl from "../controllers/config.controllers.js";
import * as midd from "../middlewares/config.middleware.js";

const router = Router();

router.get("/", ctrl.getConfiguracionController);                                           // ? VERIFICADA - 27-07-2026
router.post("/", ctrl.postConfiguracionController);                                         // ? VERIFICADA - 27-07-2026
router.patch("/", midd.valPatchBodyConfig, ctrl.patchConfiguracionController);              // ? VERIFICADA - 27-07-2026
router.delete("/", ctrl.deleteConfiguracionController);                                     // ? VERIFICADA - 27-07-2026

router.get("/cgi", ctrl.getConfiguracionCgiController);                                     // ? VERIFICADA - 27-07-2026
router.post("/cgi", ctrl.postConfiguracionCgiController);                                   // ? VERIFICADA - 27-07-2026
router.patch("/cgi", midd.valPatchBodyConfigCgi, ctrl.patchConfiguracionCgiController);     // ? VERIFICADA - 27-07-2026
router.delete("/cgi", ctrl.deleteConfiguracionCgiController);                               // ? VERIFICADA - 27-07-2026

export default router;
