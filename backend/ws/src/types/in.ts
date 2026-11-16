export const SUBSCRIBE = "SUBSCRIBE";
export const UNSUBSCRIBE = "UNSUBSCRIBE";

export type SubscribeMessage = {
    method: typeof SUBSCRIBE,
    params: string[]
}

export type UnsubscribeMessage = {
    method: typeof UNSUBSCRIBE,
    params: string[]
}

export type IncomingMessage = SubscribeMessage | UnsubscribeMessage;

const STREAM_PATTERN = /^(depth|trade|ticker)@[A-Z0-9_]+$/;

/** Parses and validates a raw client message. Returns null if it is not a valid request. */
export function parseIncomingMessage(raw: string): IncomingMessage | null {
    let parsed: any;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }
    const validMethod = parsed?.method === SUBSCRIBE || parsed?.method === UNSUBSCRIBE;
    const validParams = Array.isArray(parsed?.params)
        && parsed.params.every((p: unknown) => typeof p === "string" && STREAM_PATTERN.test(p));
    return validMethod && validParams ? parsed : null;
}
