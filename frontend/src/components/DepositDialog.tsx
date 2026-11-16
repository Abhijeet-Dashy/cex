import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { useAccount } from "@/store/useAccount";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Simulated deposit: the backend credits the funds without a real payment. */
export const DepositDialog = ({ children }: { children: ReactNode }) => {
    const market = useStore((state) => state.market);
    const { balances, refresh } = useAccount();
    const assets = market.split("_").reverse(); // quote asset (INR) first, then base asset
    const [open, setOpen] = useState(false);
    const [asset, setAsset] = useState(assets[0]!);
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.deposit(asset, amount);
            await refresh();
            toast.success(`Deposited ${formatNumber(amount)} ${asset}`);
            setAmount("");
            setOpen(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Deposit failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Deposit</DialogTitle>
                    <DialogDescription>Demo exchange: funds are credited instantly, no real payment is made.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="grid gap-4">
                    <div className="grid gap-1.5">
                        <Label>Asset</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {assets.map((a) => (
                                <Button key={a} type="button" variant={asset === a ? "default" : "outline"} onClick={() => setAsset(a)}>
                                    {a}
                                    <span className="text-xs opacity-70">{formatNumber(balances[a]?.available)}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="deposit-amount">Amount</Label>
                        <Input id="deposit-amount" type="number" min="0" step="any" required value={amount}
                            onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                    </div>
                    <Button type="submit" disabled={loading || !(Number(amount) > 0)}>
                        {loading ? "Depositing..." : `Deposit ${asset}`}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};
