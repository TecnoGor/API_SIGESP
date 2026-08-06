import type { Types } from "mongoose";
import type { Request } from "express";

export interface IAuthenticatedRequest extends Request {
    _id: Types.ObjectId;
    email: string;
    nombre: string;
    status: string;
    rol: string;
}
