import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
import { useAccount } from "@/store/useAccount";
import { useAuth } from "@/store/useAuth";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PERCENTAGES = [25, 50, 75, 100];

const InputWithSuffix = ({ id, label, value, onChange, suffix }: {
    id: string, label: string, value: string, onChange: (value: string) => void, suffix: string
}) => (
    <div className="grid gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        <div className="relative">
            <Input id={id} type="number" min="0" step="any" value={value} placeholder="0.00"
                onChange={(e) => onChange(e.target.value)} className="pr-14" />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
        </div>
    </div>
);

export const OrderEntry = () => {
    const { market, selectedPrice, ticker } = useStore();
    const { balances, refresh } = useAccount();
    const { token, setAuthDialogOpen } = useAuth();

    const [base, quote] = market.split("_") as [string, string];
    const [side, setSide] = useState<"buy" | "sell">("buy");
    const [price, setPrice] = useState("");
    const [quantity, setQuantity] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // clicking a price in the order book fills the price field
    useEffect(() => {
        if (selectedPrice) setPrice(selectedPrice);
    }, [selectedPrice]);

    // start from the last traded price
    useEffect(() => {
        if (!price && ticker?.last) setPrice(ticker.last);
    }, [ticker?.last, price]);

    const spendAsset = side === "buy" ? quote : base;
    const available = balances[spendAsset]?.available ?? 0;
    const locked = balances[spendAsset]?.locked ?? 0;
    const total = (Number(price) || 0) * (Number(quantity) || 0);

    const setPercentage = (percentage: number) => {
        const funds = (available * percentage) / 100;
        if (side === "sell") {
            setQuantity(String(funds));
        } else if (Number(price) > 0) {
            setQuantity(String(Math.floor((funds / Number(price)) * 1e6) / 1e6));
        }
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            setAuthDialogOpen(true);
            return;
        }
        setSubmitting(true);
        try {
            const result = await api.placeOrder(market, side, price, quantity);
            const filled = result.executedQty;
            toast.success(
                filled >= Number(quantity)
                    ? `${side === "buy" ? "Bought" : "Sold"} ${filled} ${base}`
                    : filled > 0
                        ? `Partially filled: ${filled} of ${quantity} ${base}, rest is on the book`
                        : `Order placed: ${side} ${quantity} ${base} @ ${price}`
            );
            setQuantity("");
            await refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Order failed");
        } finally {
            setSubmitting(false);
        }
    };

    const insufficient = !!token && total > 0 && (side === "buy" ? total : Number(quantity)) > available;

    return (
        <form onSubmit={submit} className="flex h-full w-80 shrink-0 flex-col gap-4 border-l bg-card p-4">
            <div className="grid grid-cols-2 gap-1 rounded-md bg-background p-1">
                <Button type="button" variant={side === "buy" ? "buy" : "ghost"} onClick={() => setSide("buy")}>Buy</Button>
                <Button type="button" variant={side === "sell" ? "sell" : "ghost"} onClick={() => setSide("sell")}>Sell</Button>
            </div>

            <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Available</span>
                    <span>{token ? formatNumber(available) : "---"} {spendAsset}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">In open orders</span>
                    <span>{token ? formatNumber(locked) : "---"} {spendAsset}</span>
                </div>
            </div>

            <InputWithSuffix id="price" label="Price" value={price} onChange={setPrice} suffix={quote} />
            <InputWithSuffix id="quantity" label="Quantity" value={quantity} onChange={setQuantity} suffix={base} />

            <div className="grid grid-cols-4 gap-1">
                {PERCENTAGES.map((p) => (
                    <Button key={p} type="button" size="sm" variant="outline" disabled={!token} onClick={() => setPercentage(p)}>{p}%</Button>
                ))}
            </div>

            <div className="mt-auto space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className={cn("font-semibold", insufficient && "text-ask")}>{formatNumber(total)} {quote}</span>
                </div>
                {insufficient && <p className="text-xs text-ask">Insufficient {spendAsset} balance</p>}
                <Button
                    type="submit"
                    variant={side}
                    size="lg"
                    className="w-full"
                    disabled={submitting || (!!token && (!(Number(price) > 0) || !(Number(quantity) > 0) || insufficient))}
                >
                    {!token ? "Log in to trade" : submitting ? "Placing..." : `${side === "buy" ? "Buy" : "Sell"} ${base}`}
                </Button>
            </div>
        </form>
    );
};
