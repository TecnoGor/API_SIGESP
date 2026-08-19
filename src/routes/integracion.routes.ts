import { Router } from "express";
import * as ctrl from "../controllers/integracion.controllers.js";
import * as midd from "../middlewares/integracion.middleware.js";

const router = Router();

router.get("/yyyy", ctrl.yyyyController);                                                               // ! QUITAR SOLO POR PRUEBAS

router.post("/factura", midd.valPostBodyIntegracionFactura, ctrl.postIntegracionFacturaController);     // ? VERIFICADA - 27-07-2026

export default router;
