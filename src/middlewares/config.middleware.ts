import { body, checkExact } from "express-validator";
import { ValidaDatos } from "../utils/funcionesGlobales.js";
import type { NextFunction, Request, Response } from "express";

// // ? VERIFICADA - 27-07-2026
// export const valPostBodyConfig = [
//     body("id_cliente")
//         .trim()
//         .notEmpty()
//         .withMessage("El campo [id_cliente] es requerido.")
//         .bail()
//         .isString()
//         .withMessage("El campo [id_cliente] debe ser de tipo String.")
//         .bail()        
//         .isLength({ max: 250 })
//         .withMessage("El campo [id_cliente] debe tener maximo 250 caracteres."),

//     body("key")
//         .trim()
//         .notEmpty()
//         .withMessage("El campo [key] es requerido.")
//         .bail()
//         .isString()
//         .withMessage("El campo [key] debe ser de tipo String."),        

//     checkExact([], {
//         message:
//             "Solo estan permitidos los campos requeridos [id_cliente, key].",
//     }),

//     (req: Request, res: Response, next: NextFunction) => {
//         ValidaDatos(req, res, next, "middleware:valPostBodyConfig");

//         next();
//     },
// ];

// ? VERIFICADA - 27-07-2026
export const valPatchBodyConfig = [
    body("id_cliente")
        .optional()    
        .trim()
        .notEmpty()
        .withMessage("El campo [id_cliente] no puede estar vacio.")
        .bail()
        .isString()
        .withMessage("El campo [id_cliente] debe ser de tipo String.")
        .bail()        
        .isLength({ max: 250 })
        .withMessage("El campo [id_cliente] debe tener maximo 250 caracteres."),

    body("key")
        .optional()   
        .trim()
        .notEmpty()
        .withMessage("El campo [key] no puede estar vacio.")
        .bail()
        .isString()
        .withMessage("El campo [key] debe ser de tipo String."),        

    checkExact([], {
        message:
            "Solo estan permitidos los campos opcionales [id_cliente, key].",
    }),

    (req: Request, res: Response, next: NextFunction) => {
        ValidaDatos(req, res, next, "middleware:valPatchBodyConfig");

        next();
    },
];

// ? VERIFICADA - 27-07-2026
export const valPatchBodyConfigCgi = [
    body("id_cliente")
        .optional()    
        .trim()
        .notEmpty()
        .withMessage("El campo [id_cliente] no puede estar vacio.")
        .bail()
        .isString()
        .withMessage("El campo [id_cliente] debe ser de tipo String.")
        .bail()        
        .isLength({ max: 250 })
        .withMessage("El campo [id_cliente] debe tener maximo 250 caracteres."),

    body("key")
        .optional()   
        .trim()
        .notEmpty()
        .withMessage("El campo [key] no puede estar vacio.")
        .bail()
        .isString()
        .withMessage("El campo [key] debe ser de tipo String."),        

    body("aplicacion")
        .optional()    
        .trim()
        .notEmpty()
        .withMessage("El campo [aplicacion] no puede estar vacio.")
        .bail()
        .isString()
        .withMessage("El campo [aplicacion] debe ser de tipo String.")
        .bail()        
        .isLength({ max: 100 })
        .withMessage("El campo [aplicacion] debe tener maximo 100 caracteres."),

    body("activo")
        .optional() 
        .exists({ checkNull: true })
        .withMessage("El campo [activo] no puede estar vacio.")
        .bail()
        .isBoolean({ strict: true })
        .withMessage(
            "El campo [activo] solo permite valores booleanos (true o false).",
        ),

    checkExact([], {
        message:
            "Solo estan permitidos los campos opcionales [id_cliente, key, aplicacion, activo].",
    }),

    (req: Request, res: Response, next: NextFunction) => {
        ValidaDatos(req, res, next, "middleware:valPatchBodyConfigCgi");

        next();
    },
];

