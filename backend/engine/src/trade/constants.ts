export const BASE_CURRENCY = "INR";

/** Base assets that can be traded against BASE_CURRENCY. One orderbook is created per asset. */
export const BASE_ASSETS = ["TATA"];

/** All assets a user can hold. */
export const ALL_ASSETS = [BASE_CURRENCY, ...BASE_ASSETS];
