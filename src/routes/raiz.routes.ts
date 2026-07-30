import { Router } from "express";
import type { Request, Response } from "express";
import pkgjson from "../../package.json" with { type: "json" }; // 👈 agrega esto

const router = Router();

router.get("/", (req: Request, res: Response) => {
    res.json({
        App: pkgjson.name,
        Version: pkgjson.version,
        Autor: pkgjson.author,
        Descripcion: pkgjson.description,
    });
});

export default router;
