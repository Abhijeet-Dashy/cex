import { HttpError } from "./errors.ts";

const MARKET_PATTERN = /^[A-Z0-9]+_[A-Z0-9]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;

export function requireMarket(value: unknown): string {
    if (typeof value !== "string" || !MARKET_PATTERN.test(value)) {
        throw new HttpError(400, "Invalid market, expected something like TATA_INR");
    }
    return value;
}

/** Accepts a number or numeric string and returns it as a string the engine can parse. */
export function requirePositiveNumber(value: unknown, name: string): string {
    const number = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
    if (!Number.isFinite(number) || number <= 0) {
        throw new HttpError(400, `${name} must be a positive number`);
    }
    return number.toString();
}

export function requireSide(value: unknown): "buy" | "sell" {
    if (value !== "buy" && value !== "sell") {
        throw new HttpError(400, "side must be 'buy' or 'sell'");
    }
    return value;
}

export function requireString(value: unknown, name: string): string {
    if (typeof value !== "string" || value.trim() === "") {
        throw new HttpError(400, `${name} is required`);
    }
    return value;
}

export function requireCredentials(body: any): { email: string, password: string } {
    const email = requireString(body?.email, "email").trim().toLowerCase();
    const password = requireString(body?.password, "password");
    if (!EMAIL_PATTERN.test(email)) {
        throw new HttpError(400, "Invalid email address");
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
        throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    return { email, password };
}
