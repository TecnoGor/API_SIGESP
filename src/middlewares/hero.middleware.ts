import { body, checkExact } from "express-validator";
import { ValidaDatos } from "../utils/funcionesGlobales.js";
import type { NextFunction, Request, Response } from "express";

const validateRequireInt = (field: string) => {
    return body(field)
        .notEmpty()
        .withMessage(`El campo [${field}] es requerido.`)
        .bail()
        .isNumeric()
        .withMessage(`El campo [${field}] debe ser numérico.`)
        .bail()
        .isInt({ min: 0, max: 100 })
        .withMessage(`El campo [${field}] debe ser un número entre 0 y 100.`);
};

const validateRequireString = (field: string, max?: number) => {
    let chain = body(field)
        .trim()
        .notEmpty()
        .withMessage(`El campo [${field}] es requerido.`)
        .bail()
        .isString()
        .withMessage(`El campo [${field}] debe ser de tipo String.`);

    if (max) {
        chain = chain
            .bail()
            .isLength({ max })
            .withMessage(
                `El campo [${field}] debe tener máximo ${max} caracteres.`
            );
    }
    return chain;
};

const validateOptionalInt = (field: string) => {
    return body(field)
        .optional()
        .notEmpty()
        .withMessage(`El campo [${field}] es requerido.`)
        .bail()
        .isNumeric()
        .withMessage(`El campo [${field}] debe ser numérico.`)
        .bail()
        .isInt({ min: 0, max: 100 })
        .withMessage(`El campo [${field}] debe ser un número entre 0 y 100.`);
};

const validateOptionalString = (field: string, max?: number) => {
    let chain = body(field)
        .optional()
        .trim()
        .notEmpty()
        .withMessage(`El campo [${field}] es requerido.`)
        .bail()
        .isString()
        .withMessage(`El campo [${field}] debe ser de tipo String.`);

    if (max) {
        chain = chain
            .bail()
            .isLength({ max })
            .withMessage(
                `El campo [${field}] debe tener máximo ${max} caracteres.`
            );
    }
    return chain;
};

export const validaCreateHero = [
    body("idHero")
        .notEmpty()
        .withMessage("El campo [idHero] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El campo [idHero] debe ser numérico.")
        .bail()
        .isInt({ min: 1 })
        .withMessage("El campo [idHero] debe ser un número mayor a cero."),

    validateRequireString("name", 100),
    validateRequireString("slug", 50),
    validateRequireString("image"),

    body("powerstats")
        .notEmpty()
        .withMessage("El campo [powerstats] es requerido.")
        .bail()
        .isObject()
        .withMessage(
            "El campo [powerstats] debe ser un objeto con la siguiente estructura: { intelligence, strength, speed, durability, power, combat }"
        ),

    validateRequireInt("powerstats.intelligence"),
    validateRequireInt("powerstats.strength"),
    validateRequireInt("powerstats.speed"),
    validateRequireInt("powerstats.durability"),
    validateRequireInt("powerstats.power"),
    validateRequireInt("powerstats.combat"),

    body("biography")
        .notEmpty()
        .withMessage("El campo [biography] es requerido.")
        .bail()
        .isObject()
        .withMessage(
            "El campo [Biography] debe ser un objeto con la siguiente estructura: { fullName, alterEgos, aliases, placeOfBirth, firstAppearance, publisher, alignment }"
        ),

    validateRequireString("biography.fullName"),
    validateRequireString("biography.alterEgos"),
    validateRequireString("biography.placeOfBirth"),
    validateRequireString("biography.firstAppearance"),
    validateRequireString("biography.publisher"),
    validateRequireString("biography.alignment"),

    body("biography.aliases")
        .notEmpty()
        .withMessage("El campo [biography.aliases] es requerido.")
        .bail()
        .isArray()
        .withMessage(
            "El campo [biography.aliases] debe ser un arreglo de strings."
        ),

    body("biography.aliases.*")
        .notEmpty()
        .withMessage("El campo [biography.aliases] es requerido.")
        .bail()
        .isString()
        .withMessage("Cada alias debe ser de tipo string."),

    checkExact([], {
        message:
            "Solo están permitidos los campos requeridos [idHero, name, slug, image, powerstats, { intelligence, strength, speed, durability, power, combat }, biography, { fullName, alterEgos, aliases, placeOfBirth, firstAppearance, publisher, alignment }]",
    }),

    (req: Request, res: Response, next: NextFunction) => {
        ValidaDatos(req, res, next, "validaCreateHero");

        next();
    },
];

export const validaUpdateHero = [
    // body("idHero")
    //     .optional()
    //     .notEmpty()
    //     .withMessage("El campo [idHero] es requerido.")
    //     .bail()
    //     .isNumeric()
    //     .withMessage("El campo [idHero] debe ser numérico.")
    //     .bail()
    //     .isInt({ min: 1 })
    //     .withMessage("El campo [idHero] debe ser un número mayor a cero."),

    // validateOptionalString("name", 100),
    // validateOptionalString("slug", 50),
    // validateOptionalString("image"),

    body("powerstats")
        .optional()
        .notEmpty()
        .withMessage("El campo [powerstats] es requerido.")
        .bail()
        .isObject()
        .withMessage(
            "El campo [powerstats] debe ser un objeto con la siguiente estructura: { intelligence, strength, speed, durability, power, combat }"
        ),

    validateOptionalInt("powerstats.intelligence"),
    validateOptionalInt("powerstats.strength"),
    validateOptionalInt("powerstats.speed"),
    validateOptionalInt("powerstats.durability"),
    validateOptionalInt("powerstats.power"),
    validateOptionalInt("powerstats.combat"),

    // body("biography")
    //     .optional()
    //     .notEmpty()
    //     .withMessage("El campo [biography] es requerido.")
    //     .bail()
    //     .isObject()
    //     .withMessage(
    //         "El campo [Biography] debe ser un objeto con la siguiente estructura: { fullName, alterEgos, aliases, placeOfBirth, firstAppearance, publisher, alignment }"
    //     ),

    // validateOptionalString("biography.fullName"),
    // validateOptionalString("biography.alterEgos"),
    // validateOptionalString("biography.placeOfBirth"),
    // validateOptionalString("biography.firstAppearance"),
    // validateOptionalString("biography.publisher"),
    // validateOptionalString("biography.alignment"),

    // body("biography.aliases")
    //     .optional()
    //     .notEmpty()
    //     .withMessage("El campo [biography.aliases] es requerido.")
    //     .bail()
    //     .isArray()
    //     .withMessage(
    //         "El campo [biography.aliases] debe ser un arreglo de strings."
    //     ),

    // body("biography.aliases.*")
    //     .optional()
    //     .notEmpty()
    //     .withMessage("El campo [biography.aliases] es requerido.")
    //     .bail()
    //     .isString()
    //     .withMessage("Cada alias debe ser de tipo string."),

    checkExact([], {
        message:
            "Solo están permitidos los campos opcionales [powerstats, { intelligence, strength, speed, durability, power, combat }]",
    }),

    (req: Request, res: Response, next: NextFunction) => {
        ValidaDatos(req, res, next, "validaCreateHero");

        next();
    },
];

/*
body("biography.aliases")
        .notEmpty()
        .withMessage("El campo [biography.aliases] es requerido.")
        .bail()
        .isArray()
        .withMessage(
            "El campo [biography.aliases] debe ser un arreglo de strings."
        ),

    body("biography.aliases.*")
        .notEmpty()
        .withMessage("El campo [biography.aliases] es requerido.")
        .bail()
        .isString()
        .withMessage("Cada alias debe ser de tipo string."),
*/

/*
export const validaCreateHero = [
    body("idHero")
        .notEmpty()
        .withMessage("El campo [idHero] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El campo [idHero] debe ser numérico.")
        .bail()
        .custom((value) => {
            if (value <= 0) {
                throw new Error("El campo [idHero] debe ser mayor a cero.");
            }
            return true;
        }),

    body("name")
        .trim()
        .notEmpty()
        .withMessage("El campo [name] es requerido.")
        .bail()
        .isString()
        .withMessage("El campo [name] debe ser de tipo String.")
        .bail()
        .isLength({ max: 100 })
        .withMessage("El campo [name] debe tener maximo 100 caracteres."),

    body("slug")
        .trim()
        .notEmpty()
        .withMessage("El campo [slug] es requerido.")
        .bail()
        .isString()
        .withMessage("El campo [slug] debe ser de tipo String.")
        .bail()
        .isLength({ max: 50 })
        .withMessage("El campo [slug] debe tener maximo 50 caracteres."),

    body("image")
        .trim()
        .notEmpty()
        .withMessage("El campo [image] es requerido.")
        .bail()
        .isString()
        .withMessage("El campo [image] debe ser de tipo String."),

    body("powerstats")
        .notEmpty()
        .withMessage("El campo [powerstats] es requerido.")
        .bail()
        .isObject()
        .withMessage(
            "El campo [powerstats] debe ser un objeto con la siguiente estructura: { intelligence, strength, speed, durability, power, combat }"
        ),

    body("powerstats.intelligence")
        .notEmpty()
        .withMessage("El campo [powerstats.intelligence] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El campo [powerstats.intelligence] debe ser numérico.")
        .bail()
        .isInt({ min: 0, max: 100 })
        .withMessage(
            "El campo [powerstats.intelligence] debe ser un numero entre 0 y 100."
        ),

    body("powerstats.strength")
        .notEmpty()
        .withMessage("El campo [powerstats.strength] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El campo [powerstats.strength] debe ser numérico.")
        .bail()
        .isInt({ min: 0, max: 100 })
        .withMessage(
            "El campo [powerstats.strength] debe ser un numero entre 0 y 100."
        ),

    body("powerstats.speed")
        .notEmpty()
        .withMessage("El campo [powerstats.speed] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El campo [powerstats.speed] debe ser numérico.")
        .bail()
        .isInt({ min: 0, max: 100 })
        .withMessage(
            "El campo [powerstats.speed] debe ser un numero entre 0 y 100."
        ),

    body("powerstats.durability")
        .notEmpty()
        .withMessage("El campo [powerstats.durability] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El campo [powerstats.durability] debe ser numérico.")
        .bail()
        .isInt({ min: 0, max: 100 })
        .withMessage(
            "El campo [powerstats.durability] debe ser un numero entre 0 y 100."
        ),

    body("powerstats.power")
        .notEmpty()
        .withMessage("El campo [powerstats.power] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El campo [powerstats.power] debe ser numérico.")
        .bail()
        .isInt({ min: 0, max: 100 })
        .withMessage(
            "El campo [powerstats.power] debe ser un numero entre 0 y 100."
        ),

    body("powerstats.combat")
        .notEmpty()
        .withMessage("El campo [powerstats.combat] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El campo [powerstats.combat] debe ser numérico.")
        .bail()
        .isInt({ min: 0, max: 100 })
        .withMessage(
            "El campo [powerstats.combat] debe ser un numero entre 0 y 100."
        ),

    body("biography")
        .notEmpty()
        .withMessage("El campo [biography] es requerido.")
        .bail()
        .isObject()
        .withMessage(
            "El campo [Biography] debe ser un objeto con la siguiente estructura: { fullName, alterEgos, aliases, placeOfBirth, firstAppearance, publisher, alignment }"
        ),

    body("biography.fullName")
        .notEmpty()
        .withMessage("El campo [biography.fullName] es requerido.")
        .bail()
        .isString()
        .withMessage("El campo [biography.fullName] debe ser de tipo String."),

    body("biography.alterEgos")
        .notEmpty()
        .withMessage("El campo [biography.alterEgos] es requerido.")
        .bail()
        .isString()
        .withMessage("El campo [biography.alterEgos] debe ser de tipo String."),

    body("biography.aliases")
        .notEmpty()
        .withMessage("El campo [biography.aliases] es requerido.")
        .bail()
        .isArray()
        .withMessage(
            "El campo [biography.aliases] debe ser un arreglo de strings."
        )
        .bail()
        .custom((aliases) => {
            if (!Array.isArray(aliases)) {
                throw new Error(
                    "El campo [biography.aliases] debe ser un arreglo."
                );
            }
            const allStrings = aliases.every(
                (alias) => typeof alias === "string"
            );
            if (!allStrings) {
                throw new Error(
                    "Todos los elementos de [biography.aliases] deben ser de tipo string."
                );
            }
            return true;
        }),

    body("biography.placeOfBirth")
        .notEmpty()
        .withMessage("El campo [biography.placeOfBirth] es requerido.")
        .bail()
        .isString()
        .withMessage(
            "El campo [biography.placeOfBirth] debe ser de tipo String."
        ),

    body("biography.firstAppearance")
        .notEmpty()
        .withMessage("El campo [biography.firstAppearance] es requerido.")
        .bail()
        .isString()
        .withMessage(
            "El campo [biography.firstAppearance] debe ser de tipo String."
        ),

    body("biography.publisher")
        .notEmpty()
        .withMessage("El campo [biography.publisher] es requerido.")
        .bail()
        .isString()
        .withMessage("El campo [biography.publisher] debe ser de tipo String."),

    body("biography.alignment")
        .notEmpty()
        .withMessage("El campo [biography.alignment] es requerido.")
        .bail()
        .isString()
        .withMessage("El campo [biography.alignment] debe ser de tipo String."),

    checkExact([], {
        message:
            "Solo están permitidos los campos requeridos [idHero, name, slug, image, powerstats, { intelligence, strength, speed, durability, power, combat }, biography, { fullName, alterEgos, aliases, placeOfBirth, firstAppearance, publisher, alignment }]",
    }),

    (req: Request, res: Response, next: NextFunction) => {
        ValidaDatos(req, res, next, "validaCreateHero");

        next();
    },
];


*/
