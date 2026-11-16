import { LogIn, LogOut, Wallet } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { useAccount } from "@/store/useAccount";
import { useAuth } from "@/store/useAuth";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { DepositDialog } from "@/components/DepositDialog";

const Stat = ({ label, value, className }: { label: string, value: string, className?: string }) => (
    <div className="flex flex-col">
        <span className={cn("text-sm font-medium", className)}>{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
    </div>
);

export const Navbar = () => {
    const { market, ticker, connected } = useStore();
    const balances = useAccount((state) => state.balances);
    const { token, email, logout, setAuthDialogOpen } = useAuth();

    const quote = market.split("_")[1]!;
    const change = ticker?.firstPrice ? ((Number(ticker.last) - Number(ticker.firstPrice)) / Number(ticker.firstPrice)) * 100 : null;
    const changeColor = change === null || change === 0 ? "" : change > 0 ? "text-bid" : "text-ask";

    return (
        <nav className="h-14 shrink-0 border-b bg-card flex items-center justify-between px-4">
            <div className="flex items-center gap-8">
                <div className="text-xl font-bold text-primary tracking-tight">EXCHANGE</div>
                <div className="text-lg font-semibold">{market.replace("_", " / ")}</div>
                <div className="hidden md:flex items-center gap-6">
                    <Stat label="Last price" value={formatNumber(ticker?.last)} className={cn("text-base", changeColor)} />
                    <Stat label="24h change" value={change === null ? "---" : `${change > 0 ? "+" : ""}${change.toFixed(2)}%`} className={changeColor} />
                    <Stat label="24h high" value={formatNumber(ticker?.high)} />
                    <Stat label="24h low" value={formatNumber(ticker?.low)} />
                    <Stat label="24h volume" value={formatNumber(ticker?.volume)} />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground" title={connected ? "Live" : "Reconnecting..."}>
                    <span className={cn("h-2 w-2 rounded-full", connected ? "bg-bid" : "bg-ask animate-pulse")} />
                    {connected ? "Live" : "Offline"}
                </span>

                {token ? (
                    <>
                        <div className="hidden sm:block rounded-md bg-background px-3 py-1.5 text-xs">
                            <span className="text-muted-foreground mr-2">Balance</span>
                            <span className="font-semibold">{formatNumber(balances[quote]?.available)} {quote}</span>
                        </div>
                        <DepositDialog>
                            <Button size="sm" variant="secondary"><Wallet className="h-4 w-4" />Deposit</Button>
                        </DepositDialog>
                        <span className="hidden lg:block text-xs text-muted-foreground max-w-40 truncate">{email}</span>
                        <Button size="icon" variant="ghost" onClick={logout} title="Log out"><LogOut className="h-4 w-4" /></Button>
                    </>
                ) : (
                    <Button size="sm" onClick={() => setAuthDialogOpen(true)}><LogIn className="h-4 w-4" />Log in</Button>
                )}
            </div>
        </nav>
    );
};
