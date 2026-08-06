export class AppError extends Error {
    public statusCode: number;
    public location?: string;

    constructor(message: string, statusCode = 500, location?: string) {
        super(message);
        this.statusCode = statusCode;
        this.location = location;
        Error.captureStackTrace(this, this.constructor);
    }
}
