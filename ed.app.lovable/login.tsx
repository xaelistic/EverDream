import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Moon, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { LoadingScreen } from "@/components/loading-screen";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Lucid" },
      { name: "description", content: "Sign in to track, reflect on, and share your dreams." },
      { property: "og:title", content: "Sign in — Lucid" },
      { property: "og:description", content: "Sign in to track, reflect on, and share your dreams." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

type Mode = "signin" | "signup";

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "google" | "meta" | "email">(null);
  const [showLoading, setShowLoading] = useState(false);

  const handleEmail = async (e: FormEvent) => {
    e.preventDefault();
    setBusy("email");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your inbox to confirm your email.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setShowLoading(true);
        return;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const handleGoogle = async () => {
    setBusy("google");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Could not sign in with Google");
        setBusy(null);
        return;
      }
      if (result.redirected) return; // browser navigates away
      setShowLoading(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setBusy(null);
    }
  };

  const handleMeta = async () => {
    setBusy("meta");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `${err.message}. Add Meta credentials in backend Auth settings.`
          : "Meta sign-in failed",
      );
      setBusy(null);
    }
  };

  const handleForgot = async () => {
    if (!email) {
      toast.error("Enter your email above first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent.");
  };

  return (
    <>
      {showLoading && (
        <LoadingScreen
          message="Welcoming you back…"
          onComplete={() => navigate({ to: "/" })}
        />
      )}
      <main
        className="min-h-screen flex items-center justify-center px-4 py-10"
        style={{ background: "var(--gradient-calm)" }}
      >
        <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="size-14 rounded-full bg-card flex items-center justify-center shadow-sm border">
            <Moon className="size-6 text-primary" strokeWidth={1.5} />
          </div>
          <h1
            className="mt-5 text-3xl tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            Track, reflect on, and share your dreams.
          </p>
        </div>

        <div
          className="bg-card rounded-3xl border p-6 sm:p-8"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="space-y-3">
            <SocialButton
              onClick={handleGoogle}
              loading={busy === "google"}
              disabled={!!busy}
              icon={<GoogleIcon />}
              label="Continue with Google"
            />
            <SocialButton
              onClick={handleMeta}
              loading={busy === "meta"}
              disabled={!!busy}
              icon={<MetaIcon />}
              label="Continue with Meta"
            />
            <SocialButton
              disabled
              icon={<TikTokIcon />}
              label="Continue with TikTok"
              badge="Coming soon"
            />
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={handleForgot}
                    className="text-xs text-muted-foreground hover:text-foreground transition"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <Button
              type="submit"
              disabled={!!busy}
              className="w-full h-11 rounded-xl"
            >
              {busy === "email" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === "signin" ? (
                <><Sparkles className="size-4" /> Sign in</>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-foreground underline-offset-4 hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link to="/" className="underline underline-offset-2">Terms</Link>{" "}
          and{" "}
          <Link to="/" className="underline underline-offset-2">Privacy Policy</Link>.
        </p>
      </div>
    </main>
    </>
  );
}

function SocialButton({
  onClick,
  loading,
  disabled,
  icon,
  label,
  badge,
}: {
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full h-11 rounded-xl border bg-card hover:bg-muted transition flex items-center justify-center gap-3 text-sm font-medium text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      <span>{label}</span>
      {badge && (
        <span className="ml-1 text-[10px] uppercase tracking-wider text-muted-foreground border rounded-full px-2 py-0.5">
          {badge}
        </span>
      )}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.227c1.89-1.74 2.986-4.302 2.986-7.351Z"/>
      <path fill="#34A853" d="M12 22c2.7 0 4.964-.895 6.618-2.422l-3.227-2.51c-.895.6-2.04.955-3.391.955-2.604 0-4.81-1.76-5.595-4.123H3.064v2.59A9.996 9.996 0 0 0 12 22Z"/>
      <path fill="#FBBC05" d="M6.405 13.9A6 6 0 0 1 6.09 12c0-.66.114-1.3.314-1.9V7.51H3.064A9.996 9.996 0 0 0 2 12c0 1.614.386 3.14 1.064 4.49l3.341-2.59Z"/>
      <path fill="#EA4335" d="M12 5.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C16.96 2.99 14.696 2 12 2 8.087 2 4.71 4.245 3.064 7.51l3.341 2.59C7.19 7.737 9.396 5.977 12 5.977Z"/>
    </svg>
  );
}

function MetaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#1877F2"
        d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89H7.898V12h2.54V9.797c0-2.506 1.493-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33V21.88C18.343 21.128 22 16.991 22 12Z"
      />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="currentColor"
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .58.05.84.13V9.4a6.34 6.34 0 0 0-.84-.05A6.33 6.33 0 0 0 5.84 20.1a6.34 6.34 0 0 0 10.86-4.43V8.56a8.16 8.16 0 0 0 4.77 1.52V6.69h-1.88Z"
      />
    </svg>
  );
}
