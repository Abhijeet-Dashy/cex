import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Mode = "login" | "register";

export const AuthDialog = () => {
    const { authDialogOpen, setAuthDialogOpen, setSession } = useAuth();
    const [mode, setMode] = useState<Mode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { token } = await (mode === "login" ? api.login : api.register)(email, password);
            setSession(token, email.trim().toLowerCase());
            setPassword("");
            toast.success(mode === "login" ? "Welcome back" : "Account created");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{mode === "login" ? "Log in" : "Create account"}</DialogTitle>
                    <DialogDescription>Log in to trade, deposit funds and see your orders.</DialogDescription>
                </DialogHeader>

                <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
                    <TabsList className="w-full border-b">
                        <TabsTrigger value="login" className="flex-1">Log in</TabsTrigger>
                        <TabsTrigger value="register" className="flex-1">Sign up</TabsTrigger>
                    </TabsList>
                </Tabs>

                <form onSubmit={submit} className="grid gap-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" required autoComplete="email" value={email}
                            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" required minLength={8}
                            autoComplete={mode === "login" ? "current-password" : "new-password"}
                            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};
