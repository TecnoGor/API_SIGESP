import { Router } from "express";
import * as ctrl from "../controllers/auth.controllers.js";
import * as midd from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/token", midd.valPostBodyAuth, ctrl.postTokenController);   // ? VERIFICADA - 27-07-2026

export default router;
