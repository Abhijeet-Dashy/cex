import { toast } from "sonner";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
import { useAccount } from "@/store/useAccount";
import { useAuth } from "@/store/useAuth";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formatTime = (timestamp: number) => new Date(timestamp).toLocaleString("en-IN", { hour12: false });

const Side = ({ side }: { side: "buy" | "sell" }) => (
    <span className={cn("font-medium capitalize", side === "buy" ? "text-bid" : "text-ask")}>{side}</span>
);

const Empty = ({ children }: { children: string }) => (
    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">{children}</div>
);

const OpenOrders = () => {
    const market = useStore((state) => state.market);
    const { openOrders, refresh } = useAccount();

    const cancel = async (orderId: string) => {
        try {
            await api.cancelOrder(market, orderId);
            toast.success("Order cancelled");
            await refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not cancel order");
        }
    };

    if (openOrders.length === 0) return <Empty>No open orders</Empty>;
    return (
        <Table>
            <TableHeader>
                <TableRow><TableHead>Side</TableHead><TableHead>Price</TableHead><TableHead>Quantity</TableHead><TableHead>Filled</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
                {openOrders.map((order) => (
                    <TableRow key={order.orderId}>
                        <TableCell><Side side={order.side} /></TableCell>
                        <TableCell>{formatNumber(order.price)}</TableCell>
                        <TableCell>{formatNumber(order.quantity, 3)}</TableCell>
                        <TableCell>{formatNumber(order.filled, 3)}</TableCell>
                        <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => cancel(order.orderId)}><X className="h-3 w-3" />Cancel</Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

const OrderHistory = () => {
    const history = useAccount((state) => state.history);

    if (history.length === 0) return <Empty>No orders yet</Empty>;
    return (
        <Table>
            <TableHeader>
                <TableRow><TableHead>Time</TableHead><TableHead>Side</TableHead><TableHead>Price</TableHead><TableHead>Quantity</TableHead><TableHead>Filled</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
                {history.map((order) => (
                    <TableRow key={order.orderId}>
                        <TableCell className="text-muted-foreground">{formatTime(order.createdAt)}</TableCell>
                        <TableCell><Side side={order.side} /></TableCell>
                        <TableCell>{formatNumber(order.price)}</TableCell>
                        <TableCell>{formatNumber(order.quantity, 3)}</TableCell>
                        <TableCell>{formatNumber(order.executedQty, 3)}</TableCell>
                        <TableCell className="capitalize">{order.status.toLowerCase().replace("_", " ")}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

const MarketTrades = () => {
    const trades = useStore((state) => state.trades);

    if (trades.length === 0) return <Empty>No trades yet</Empty>;
    return (
        <Table>
            <TableHeader>
                <TableRow><TableHead>Time</TableHead><TableHead>Price</TableHead><TableHead>Quantity</TableHead></TableRow>
            </TableHeader>
            <TableBody>
                {trades.map((trade) => (
                    <TableRow key={trade.id}>
                        <TableCell className="text-muted-foreground">{formatTime(trade.timestamp)}</TableCell>
                        <TableCell className={trade.isBuyerMaker ? "text-ask" : "text-bid"}>{formatNumber(trade.price)}</TableCell>
                        <TableCell>{formatNumber(trade.quantity, 3)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export const BottomPanel = () => {
    const token = useAuth((state) => state.token);

    return (
        <Tabs defaultValue="trades" className="flex h-64 shrink-0 flex-col border-t bg-card">
            <TabsList className="border-b px-2">
                <TabsTrigger value="trades">Market trades</TabsTrigger>
                <TabsTrigger value="open">Open orders</TabsTrigger>
                <TabsTrigger value="history">Order history</TabsTrigger>
            </TabsList>
            <div className="min-h-0 flex-1 overflow-y-auto">
                <TabsContent value="trades"><MarketTrades /></TabsContent>
                <TabsContent value="open">{token ? <OpenOrders /> : <Empty>Log in to see your open orders</Empty>}</TabsContent>
                <TabsContent value="history">{token ? <OrderHistory /> : <Empty>Log in to see your order history</Empty>}</TabsContent>
            </div>
        </Tabs>
    );
};
