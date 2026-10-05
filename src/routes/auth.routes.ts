import { Router } from "express";
import * as ctrl from "../controllers/auth.controllers.js";
import * as midd from "../middlewares/auth.middleware.js";
import { rateLimitAuth } from "../middlewares/rateLimit.middleware.js";

const router = Router();

router.post("/token", rateLimitAuth, midd.valPostBodyAuth, ctrl.postTokenController);   // ? LISTA: 17-09-2026

export default router;
