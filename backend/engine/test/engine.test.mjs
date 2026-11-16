import { test } from "node:test";
import assert from "node:assert/strict";
import { RedisManager } from "../dist/RedisManager.js";

// the engine talks to redis through this singleton, replace it with a recorder
const sent = [];
RedisManager.getInstance = () => ({
    pushMessage: (m) => sent.push({ queue: "db", m }),
    publishMessage: (channel, m) => sent.push({ channel, m }),
    sendToApi: (clientId, m) => sent.push({ clientId, m }),
});

const { Engine } = await import("../dist/trade/Engine.js");

function setup() {
    sent.length = 0;
    const engine = new Engine();
    ["alice", "bob"].forEach(userId => {
        engine.process({ clientId: "c", message: { type: "REGISTER_USER", data: { userId } } });
        engine.process({ clientId: "c", message: { type: "ON_RAMP", data: { userId, asset: "INR", amount: "10000" } } });
        engine.process({ clientId: "c", message: { type: "ON_RAMP", data: { userId, asset: "TATA", amount: "100" } } });
    });
    return engine;
}

const balances = (engine, userId) => {
    sent.length = 0;
    engine.process({ clientId: "c", message: { type: "GET_BALANCES", data: { userId } } });
    return sent[0].m.payload;
};

test("a buy matches a resting sell at the maker's price and refunds the price improvement", () => {
    const engine = setup();
    engine.createOrder("TATA_INR", "100", "10", "sell", "bob");
    const { executedQty, fills } = engine.createOrder("TATA_INR", "110", "4", "buy", "alice");

    assert.equal(executedQty, 4);
    assert.equal(fills[0].price, "100");
    assert.deepEqual(balances(engine, "alice").INR, { available: 10000 - 400, locked: 0 });
    assert.deepEqual(balances(engine, "alice").TATA, { available: 104, locked: 0 });
    assert.deepEqual(balances(engine, "bob").INR, { available: 10400, locked: 0 });
    assert.deepEqual(balances(engine, "bob").TATA, { available: 90, locked: 6 });
});

test("partial fills use the maker's remaining quantity", () => {
    const engine = setup();
    engine.createOrder("TATA_INR", "100", "10", "sell", "bob");
    engine.createOrder("TATA_INR", "100", "6", "buy", "alice");
    const { executedQty } = engine.createOrder("TATA_INR", "100", "6", "buy", "alice");

    assert.equal(executedQty, 4);
    assert.deepEqual(engine.orderbooks[0].getDepth().asks, []);
    assert.deepEqual(engine.orderbooks[0].getDepth().bids, [["100", "2"]]);
});

test("orders cannot trade with the same user", () => {
    const engine = setup();
    engine.createOrder("TATA_INR", "100", "5", "sell", "alice");
    const { executedQty } = engine.createOrder("TATA_INR", "100", "5", "buy", "alice");
    assert.equal(executedQty, 0);
});

test("insufficient funds are rejected", () => {
    const engine = setup();
    assert.throws(() => engine.createOrder("TATA_INR", "100", "1000", "buy", "alice"), /Insufficient funds/);
});

test("only the owner can cancel, and cancelling releases locked funds", () => {
    const engine = setup();
    const { orderId } = engine.createOrder("TATA_INR", "100", "5", "buy", "alice");
    assert.deepEqual(balances(engine, "alice").INR, { available: 9500, locked: 500 });

    sent.length = 0;
    engine.process({ clientId: "c", message: { type: "CANCEL_ORDER", data: { orderId, market: "TATA_INR", userId: "bob" } } });
    assert.equal(sent[0].m.type, "ERROR");

    engine.process({ clientId: "c", message: { type: "CANCEL_ORDER", data: { orderId, market: "TATA_INR", userId: "alice" } } });
    assert.equal(sent.at(-1).m.type, "ORDER_CANCELLED");
    assert.deepEqual(balances(engine, "alice").INR, { available: 10000, locked: 0 });
});
