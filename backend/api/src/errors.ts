import { type NextFunction, type Request, type Response } from "express";

export class HttpError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
    }
}

export const notFound = (_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
};

/** Express 5 forwards errors thrown in async handlers here. */
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
};
