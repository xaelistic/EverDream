import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, Moon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--gradient-calm)" }}
      >
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--gradient-calm)" }}
    >
      <div
        className="max-w-md w-full text-center bg-card border rounded-3xl p-10"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <div className="size-14 mx-auto rounded-full bg-muted flex items-center justify-center">
          <Moon className="size-6 text-primary" strokeWidth={1.5} />
        </div>
        <h1
          className="mt-5 text-3xl tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          You're signed in
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome, {user.email}. The home, video capture, calendar, and dream interpretation screens are coming next.
        </p>
        <div className="mt-6 flex gap-2 justify-center">
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to="/settings">Profile & Settings</Link>
          </Button>
          <Button
            variant="ghost"
            className="rounded-xl"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/login" });
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </main>
  );
}
