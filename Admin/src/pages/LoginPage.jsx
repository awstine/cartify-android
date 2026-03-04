import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Field";

export const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 dark:bg-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#e2e8f0_0%,transparent_35%),radial-gradient(circle_at_bottom_right,#dbeafe_0%,transparent_40%)] opacity-70 dark:opacity-20" />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-8 backdrop-blur dark:border-slate-800 dark:bg-slate-950"
      >
        <h1 className="font-heading text-3xl font-bold text-slate-900 dark:text-slate-100">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Use an admin account from your Cartify backend.</p>
        <div className="mt-6 space-y-4">
          <Field label="Email" htmlFor="login-email">
            <Input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" htmlFor="login-password">
            <Input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={loading} loading={loading} className="mt-6 w-full">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
};
