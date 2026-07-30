import { body, checkExact } from "express-validator";
import * as func from "../utils/funcionesGlobales.js";
import type { NextFunction, Request, Response } from "express";

// ? VERIFICADA - 27-07-2026
export const valPostBodyAuth = [
    body("id_cliente")
        .trim()
        .notEmpty()
        .withMessage("El campo [id_cliente] es requerido.")
        .bail()
        .isString()
        .withMessage("El campo [id_cliente] debe ser de tipo String.")
        .bail()        
        .isLength({ max: 250 })
        .withMessage("El campo [id_cliente] debe tener maximo 250 caracteres."),

    body("key")
        .trim()
        .notEmpty()
        .withMessage("El campo [key] es requerido.")
        .bail()
        .isString()
        .withMessage("El campo [key] debe ser de tipo String."),        

    checkExact([], {
        message:
            "Solo estan permitidos los campos requeridos [id_cliente y key].",
    }),

    (req: Request, res: Response, next: NextFunction) => {
        func.ValidaDatos(req, res, next, "middleware:valPostBodyAuth");

        next();
    },
];

