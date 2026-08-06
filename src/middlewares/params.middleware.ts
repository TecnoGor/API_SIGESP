import { checkExact, param, query } from "express-validator";
import { ValidaDatos } from "../utils/funcionesGlobales.js";
import type { NextFunction, Request, Response } from "express";

// ? VERIFICADA - 27-07-2026
export const valPathParamIdFact = [
    param("id_fact")
<<<<<<< HEAD
        .notEmpty()
        .withMessage("El parametro [id_fact] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El parametro [id_fact] debe ser numérico.")
        .bail()
        .isInt({ min: 1 })
        .withMessage("El parametro [id_fact] debe ser un numero entero mayor a 0."),
=======
            .notEmpty()
            .withMessage("El parametro [id_fact] es requerido.")
            .bail()
            .isNumeric()
            .withMessage("El parametro [id_fact] debe ser numérico.")
            .bail()
            .isInt({ min: 1 })
            .withMessage("El parametro [id_fact] debe ser un numero entero mayor a 0."),
>>>>>>> 933874c243f1b7de424fa96e5452bd8e2587b0b0

    (req: Request, res: Response, next: NextFunction) => {
        ValidaDatos(req, res, next, "middleware:valPathParamIdFact");

        next();
    },
];

// ? VERIFICADA - 27-07-2026
export const valPathParamIdDoc = [
    param("id_doc")
<<<<<<< HEAD
        .notEmpty()
        .withMessage("El parametro [id_doc] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El parametro [id_doc] debe ser numérico.")
        .bail()
        .isInt({ min: 1 })
        .withMessage("El parametro [id_doc] debe ser un numero entero mayor a 0."),
=======
            .notEmpty()
            .withMessage("El parametro [id_doc] es requerido.")
            .bail()
            .isNumeric()
            .withMessage("El parametro [id_doc] debe ser numérico.")
            .bail()
            .isInt({ min: 1 })
            .withMessage("El parametro [id_doc] debe ser un numero entero mayor a 0."),
>>>>>>> 933874c243f1b7de424fa96e5452bd8e2587b0b0

    (req: Request, res: Response, next: NextFunction) => {
        ValidaDatos(req, res, next, "middleware:valPathParamIdDoc");

        next();
    },
<<<<<<< HEAD
];

// ? VERIFICADA - 27-07-2026
export const valPathParamNumCom = [
    param("numcom")
        .notEmpty()
        .withMessage("El parametro [numcom] es requerido.")
        .bail()
        .isString()
        .withMessage("El parametro [numcom] debe ser de tipo String.")
        .bail()
        .isLength({ max: 15 })
        .withMessage("El parametro [numcom] debe tener maximo 15 caracteres."),

    (req: Request, res: Response, next: NextFunction) => {
        ValidaDatos(req, res, next, "middleware:valPathParamNumCom");

        next();
    },
=======
>>>>>>> 933874c243f1b7de424fa96e5452bd8e2587b0b0
];