import type { NextFunction, Request, Response } from "express";
import * as serv from "../services/config.services.js";

// ? TODO: OJO OJO OJO - MIGRADA
export async function getConfiguracionController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    
    const results = await serv.getConfiguracionService();

    res.status(200).json({
        error: false,
        status: 200,
        message: "Ok",
        data: results,
        pagination: null,
    });
}

// ? TODO: OJO OJO OJO - MIGRADA
export async function getConfiguracionCgiController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    
    const results = await serv.getConfiguracionCgiService();

    res.status(200).json({
        error: false,
        status: 200,
        message: "Ok",
        data: results,
        pagination: null,
    });
}

// ? VERIFICADA - 27-07-2026
export async function postConfiguracionController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    // const isProd = process.env.NODE_ENV === "production";    
    
    //const respuesta = await serv.postConfiguracionService(req.body);    
    const respuesta = await serv.postConfiguracionService();

    res.status(201).json({
        error: false,
        status: 201,
        message: "Configuracion creada con exito",            
        data: null,
        pagination: null,
    });
}

// ? VERIFICADA - 27-07-2026
export async function postConfiguracionCgiController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    // const isProd = process.env.NODE_ENV === "production";    
    
    //const respuesta = await serv.postConfiguracionService(req.body);    
    const respuesta = await serv.postConfiguracionCgiService();

    res.status(201).json({
        error: false,
        status: 201,
        message: "Configuracion creada con exito",            
        data: null,
        pagination: null,
    });
}

// ? VERIFICADA - 27-07-2026
export async function patchConfiguracionController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    // const isProd = process.env.NODE_ENV === "production";
    const respuesta = await serv.patchConfiguracionService(req.body);

    res.status(201).json({
        error: false,
        status: 201,
        message: "Configuracion modificada con exito",            
        data: null,
        pagination: null,
    });
}

// ? VERIFICADA - 27-07-2026
export async function patchConfiguracionCgiController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    // const isProd = process.env.NODE_ENV === "production";
    const respuesta = await serv.patchConfiguracionCgiService(req.body);

    res.status(201).json({
        error: false,
        status: 201,
        message: "Configuracion modificada con exito",            
        data: null,
        pagination: null,
    });
}

// ? VERIFICADA - 27-07-2026
export async function deleteConfiguracionController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    // const isProd = process.env.NODE_ENV === "production";
    const respuesta = await serv.deleteConfiguracionService();

    res.status(201).json({
        error: false,
        status: 201,
        message: "Configuracion eliminada con exito",            
        data: null,
        pagination: null,
    });
}

// ? VERIFICADA - 27-07-2026
export async function deleteConfiguracionCgiController(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    // const isProd = process.env.NODE_ENV === "production";
    const respuesta = await serv.deleteConfiguracionCgiService();

    res.status(201).json({
        error: false,
        status: 201,
        message: "Configuracion eliminada con exito",            
        data: null,
        pagination: null,
    });
}