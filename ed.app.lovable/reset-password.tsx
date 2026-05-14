import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password" },
      { name: "description", content: "Set a new password for your account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Supabase puts type=recovery in the URL hash on a reset link
    const hash = window.location.hash;
    setReady(hash.includes("type=recovery") || hash.includes("access_token"));
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. Signing you in…");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--gradient-calm)" }}
    >
      <div
        className="w-full max-w-md bg-card border rounded-3xl p-8"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <h1
          className="text-2xl tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Set a new password
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ready
            ? "Enter your new password below."
            : "Open this page from the password reset email."}
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <Button type="submit" disabled={busy || !ready} className="w-full h-11 rounded-xl">
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </main>
  );
}
