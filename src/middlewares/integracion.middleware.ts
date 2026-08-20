import { body, checkExact } from "express-validator";
import * as func from "../utils/funcionesGlobales.js";
import type { NextFunction, Request, Response } from "express";


// TODO: REVISAR LOS NOMBRE DE LOS CAMPOS POPRQUE SE MODIFICARON
// ? VERIFICADA - 27-07-2026
export const valPostBodyIntegracionFactura = [
    body('cliente')
        .isObject()
        .withMessage('El objeto cliente es obligatorio'),

    body("cliente.rif")
        .trim()
        .notEmpty()
        .withMessage("El campo [rif] es requerido.")
        .bail()
        .isString()
        .withMessage("El campo [rif] debe ser de tipo String.")
        .bail()        
        .isLength({ max: 15 })
        .withMessage("El campo [rif] debe tener maximo 15 caracteres.")
        .bail()
        .matches(/^[JGVEP]\d{8,9}$/i)
        .withMessage('Formato de RIF inválido (ej. V1234567890)'),

    body("cliente.nombre")
        .trim()
        .notEmpty()
        .withMessage("El campo [nombre] es requerido.")
        .bail()
        .isString()
        .withMessage("El campo [nombre] debe ser de tipo String.")
        .bail()        
        .isLength({ max: 250 })
        .withMessage("El campo [nombre] debe tener maximo 250 caracteres."),

    body("cliente.direccion")
        .trim()
        .notEmpty()
        .withMessage("El campo [direccion] es requerido.")
        .bail()
        .isString()
        .withMessage("El campo [direccion] debe ser de tipo String.")
        .bail()        
        .isLength({ max: 250 })
        .withMessage("El campo [direccion] debe tener maximo 250 caracteres."),

    body("cliente.telefono")
        .trim()
        .notEmpty()
        .withMessage("El campo [telefono] es requerido.")
        .bail()
        .isString()
        .withMessage("El campo [telefono] debe ser de tipo String.")
        .bail()        
        .isLength({ max: 60 })
        .withMessage("El campo [telefono] debe tener maximo 60 caracteres."),

    body("cliente.email")
        .trim()
        .notEmpty()
        .withMessage("El campo [email] es requerido.")
        .bail()
        .isString()
        .withMessage("El campo [email] debe ser de tipo String.")
        .bail()        
        .isLength({ max: 60 })
        .withMessage("El campo [email] debe tener maximo 60 caracteres.")
        .bail()
        .isEmail()
        .withMessage('El campo [email] debe ser válido'),

    body('factura')
        .isObject()
        .withMessage('El objeto factura es obligatorio'),
    
    body("factura.id_factura")
        .notEmpty()
        .withMessage("El parametro [id_factura] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El parametro [id_factura] debe ser numérico.")
        .bail()
        .isInt({ min: 1 })
        .withMessage("El parametro [id_factura] debe ser un numero entero mayor a 0."),

    body("factura.sub_total")
        .notEmpty()
        .withMessage("El parametro [sub_total] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El parametro [sub_total] debe ser numérico.")
        .bail()
        .isFloat({ min: 0 })
        .withMessage("El parametro [sub_total] debe ser un numero mayor a 0."),

    body("factura.base_imp")
        .notEmpty()
        .withMessage("El parametro [base_imp] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El parametro [base_imp] debe ser numérico.")
        .bail()
        .isFloat({ min: 0 })
        .withMessage("El parametro [base_imp] debe ser un numero mayor a 0."),

    body("factura.iva")
        .notEmpty()
        .withMessage("El parametro [iva] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El parametro [iva] debe ser numérico.")
        .bail()
        .isFloat({ min: 0 })
        .withMessage("El parametro [iva] debe ser un numero mayor a 0."),

    body("factura.total")
        .notEmpty()
        .withMessage("El parametro [total] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El parametro [total] debe ser numérico.")
        .bail()
        .isFloat({ min: 0 })
        .withMessage("El parametro [total] debe ser un numero mayor a 0."),    
    
    body("factura.descripcion")
        .optional({ checkFalsy: true })
        .trim()
        .isString()
        .withMessage('El campo [descripcion] debe ser de tipo String.')
        .bail()
        .isLength({ max: 250 })
        .withMessage('El campo [descripcion] debe tener máximo 250 caracteres.'),

    body("factura.fecha_fact")
        .trim()
        .notEmpty()
        .withMessage("El campo [fecha_fact] es requerido.")
        .bail()
        .isString()
        .withMessage("El campo [fecha_fact] debe ser de tipo String.")
        .bail()        
        .isLength({ max: 250 })
        .withMessage("El campo [fecha_fact] debe tener maximo 250 caracteres."),

    body('detalle')
        .isArray({ min: 1 })
        .withMessage('Detalle debe ser un arreglo con al menos un ítem'),

    body("detalle.*.id_detalle")
        .notEmpty()
        .withMessage("El parametro [id_detalle] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El parametro [id_detalle] debe ser numérico.")
        .bail()
        .isInt({ min: 1 })
        .withMessage("El parametro [id_detalle] debe ser un numero entero mayor a 0."),

    body("detalle.*.renglon")
        .notEmpty()
        .withMessage("El parametro [renglon] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El parametro [renglon] debe ser numérico.")
        .bail()
        .isInt({ min: 1 })
        .withMessage("El parametro [renglon] debe ser un numero entero mayor a 0."),  

    body("detalle.*.id_servicio") // TODO: VALIDAR QUE EL ID SERVICIO EXISTA EN LA TABLA DE INTEGRACION ENTRE SIGESP Y SISPVEN
        .notEmpty()
        .withMessage("El parametro [id_servicio] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El parametro [id_servicio] debe ser numérico.")
        .bail()
        .isInt({ min: 1 })
        .withMessage("El parametro [id_servicio] debe ser un numero entero mayor a 0."),  

    body("detalle.*.precio")
        .notEmpty()
        .withMessage("El parametro [precio] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El parametro [precio] debe ser numérico.")
        .bail()
        .isFloat({ min: 0 })
        .withMessage("El parametro [precio] debe ser un numero mayor a 0."),    

    body("detalle.*.cantidad")
        .notEmpty()
        .withMessage("El parametro [cantidad] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El parametro [cantidad] debe ser numérico.")
        .bail()
        .isInt({ min: 1 })
        .withMessage("El parametro [cantidad] debe ser un numero entero mayor a 0."),  

    body("detalle.*.porc_iva")
        .notEmpty()
        .withMessage("El parametro [porc_iva] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El parametro [porc_iva] debe ser numérico.")
        .bail()
        .isFloat({ min: 0 })
        .withMessage("El parametro [porc_iva] debe ser un numero mayor a 0."),

    body("detalle.*.iva_detalle")
        .notEmpty()
        .withMessage("El parametro [iva_detalle] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El parametro [iva_detalle] debe ser numérico.")
        .bail()
        .isFloat({ min: 0 })
        .withMessage("El parametro [iva_detalle] debe ser un numero mayor a 0."),   
        
    body("detalle.*.total_detalle")
        .notEmpty()
        .withMessage("El parametro [total_detalle] es requerido.")
        .bail()
        .isNumeric()
        .withMessage("El parametro [total_detalle] debe ser numérico.")
        .bail()
        .isFloat({ min: 0 })
        .withMessage("El parametro [total_detalle] debe ser un numero mayor a 0."),   

    body("detalle.*.comentario")
        .optional({ checkFalsy: true })
        .trim()
        .isString()
        .withMessage('El campo [comentario] debe ser de tipo String.')
        .bail()
        .isLength({ max: 250 })
        .withMessage('El campo [comentario] debe tener máximo 250 caracteres.'),

    checkExact([], {
        message: "Solo estan permitidos los campos requeridos [rif, nombre, direccion, telefono, email, id_factura, sub_total, base_imp, iva, total, fecha_fact, id_detalle, renglon, id_servicio, precio, cantidad, porc_iva, iva_detalle, total_detalle] y los campos opcionales [descripcion, comentario]."    }),

    (req: Request, res: Response, next: NextFunction) => {
        func.ValidaDatos(req, res, next, "middleware:valPostBodyIntegracionFactura");

        next();
    },
];

