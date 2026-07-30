import { type NextFunction, type Request, type Response } from "express";

export function errorBodyHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (err instanceof SyntaxError && "body" in err) {
        return res.status(400).json({
            error: true,
            status: 400,
            message: "El formato del JSON enviado es inválido",
            path: req.originalUrl,
            method: req.method,
            location: "middleware:jsonParser",
        });
    }

    next(err);
}
