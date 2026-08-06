import { body, checkExact } from "express-validator";
import * as func from "../utils/funcionesGlobales.js";
import type { NextFunction, Request, Response } from "express";

// ? VERIFICADA - 27-07-2026
export const valPostBodyRetencion = [
    body("codigo_usuario")
        .trim()
        .notEmpty()
        .withMessage("El campo [codigo_usuario] es requerido.")
        .bail()
        .isString()
        .withMessage("El campo [codigo_usuario] debe ser de tipo String.")
        .bail()        
        .isLength({ max: 60 })
        .withMessage("El campo [codigo_usuario] debe tener maximo 60 caracteres."),

    checkExact([], {
        message:
            "Solo esta permitido el campo requerido [codigo_usuario].",
    }),

    (req: Request, res: Response, next: NextFunction) => {
        func.ValidaDatos(req, res, next, "middleware:valPostBodyRetencion");

        next();
    },
];

