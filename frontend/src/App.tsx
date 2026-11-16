import { AuthDialog } from "@/components/AuthDialog";
import { BottomPanel } from "@/components/BottomPanel";
import { Chart } from "@/components/Chart";
import { Navbar } from "@/components/Navbar";
import { OrderEntry } from "@/components/OrderEntry";
import { Orderbook } from "@/components/Orderbook";
import { Toaster } from "@/components/ui/sonner";
import { useWebSocket } from "@/hooks/useWebSocket";

function App() {
    useWebSocket();

    return (
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
            <Navbar />

            <div className="flex min-h-0 flex-1">
                <Orderbook />

                <div className="flex min-w-0 flex-1 flex-col">
                    <Chart />
                    <BottomPanel />
                </div>

                <OrderEntry />
            </div>

            <AuthDialog />
            <Toaster />
        </div>
    );
}

export default App;
