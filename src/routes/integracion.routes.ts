import { Router } from "express";
import * as ctrl from "../controllers/integracion.controllers.js";
// import * as midd from "../middlewares/contingencia.middleware.js";

const router = Router();

router.post("/xxx", /*midd.valPostBodyContingencia,*/ ctrl.postXxxController);     // ? VERIFICADA - 27-07-2026

export default router;
