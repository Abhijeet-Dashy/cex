export interface AssetBalance {
    available: number;
    locked: number;
}

export type UserBalance = Record<string, AssetBalance>;

/**
 * Tracks every user's available and locked balance per asset.
 * Every registered user always has an entry for every supported asset.
 */
export class Balances {
    private users: Map<string, UserBalance>;

    constructor(private readonly assets: string[], entries: [string, UserBalance][] = []) {
        this.users = new Map(entries);
        this.users.forEach((_, userId) => this.ensureUser(userId));
    }

    /** Creates the user with zero balances if needed (also adds any newly supported asset). */
    ensureUser(userId: string): UserBalance {
        let balance = this.users.get(userId);
        if (!balance) {
            balance = {};
            this.users.set(userId, balance);
        }
        for (const asset of this.assets) {
            balance[asset] ??= { available: 0, locked: 0 };
        }
        return balance;
    }

    get(userId: string): UserBalance {
        const balance = this.users.get(userId);
        if (!balance) {
            throw new Error("Unknown user");
        }
        return balance;
    }

    deposit(userId: string, asset: string, amount: number) {
        this.entry(userId, asset).available += amount;
    }

    /** available -> locked. Throws if there is not enough available. */
    lock(userId: string, asset: string, amount: number) {
        const entry = this.entry(userId, asset);
        if (entry.available < amount) {
            throw new Error("Insufficient funds");
        }
        entry.available -= amount;
        entry.locked += amount;
    }

    /** locked -> available. */
    unlock(userId: string, asset: string, amount: number) {
        const entry = this.entry(userId, asset);
        entry.locked -= amount;
        entry.available += amount;
    }

    /** Removes funds from locked (they were paid out in a trade). */
    spendLocked(userId: string, asset: string, amount: number) {
        this.entry(userId, asset).locked -= amount;
    }

    credit(userId: string, asset: string, amount: number) {
        this.entry(userId, asset).available += amount;
    }

    snapshot(): [string, UserBalance][] {
        return Array.from(this.users.entries());
    }

    private entry(userId: string, asset: string): AssetBalance {
        const entry = this.get(userId)[asset];
        if (!entry) {
            throw new Error(`Unsupported asset ${asset}`);
        }
        return entry;
    }
}
