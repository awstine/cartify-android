import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Button } from "../components/ui/Button";
import { Field, Input, Select } from "../components/ui/Field";

export const LoginPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, signup, signupMerchant, isAuthenticated, isStaff } = useAuth();
  const [mode, setMode] = useState("login");
  const [signupType, setSignupType] = useState("customer");
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const from = location.state?.from;
    if (from) {
      navigate(from, { replace: true });
      return;
    }
    navigate(isStaff ? "/admin" : "/", { replace: true });
  }, [isAuthenticated, isStaff, location.state, navigate]);

  if (isAuthenticated) return <Navigate to={isStaff ? "/admin" : "/"} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (signupType === "merchant") {
          await signupMerchant({ name, email, phoneNumber, password, storeName });
        } else {
          await signup({ name, email, phoneNumber, password });
        }
      } else {
        await login(email, password);
      }
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#e2e8f0_0%,transparent_35%),radial-gradient(circle_at_bottom_right,#dbeafe_0%,transparent_40%)] opacity-70" />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-8 backdrop-blur"
      >
        <h1 className="font-heading text-3xl font-bold text-slate-900">{mode === "signup" ? "Create Account" : "Login"}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {mode === "signup"
            ? "Create a customer account or register as a merchant with your own store."
            : "Sign in to continue shopping or access admin if your role allows."}
        </p>
        <div className="mt-6 space-y-4">
          {mode === "signup" ? (
            <>
              <Field label="Account Type" htmlFor="signup-type">
                <Select id="signup-type" value={signupType} onChange={(e) => setSignupType(e.target.value)}>
                  <option value="customer">Customer Account</option>
                  <option value="merchant">Merchant Account</option>
                </Select>
              </Field>
              <Field label="Full Name" htmlFor="signup-name">
                <Input id="signup-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              {signupType === "merchant" ? (
                <Field label="Store Name" htmlFor="signup-store-name">
                  <Input id="signup-store-name" type="text" required value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                </Field>
              ) : null}
              <Field label="Phone Number" htmlFor="signup-phone">
                <Input
                  id="signup-phone"
                  type="tel"
                  required
                  minLength={7}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </Field>
            </>
          ) : null}
          <Field label="Email" htmlFor="login-email">
            <Input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" htmlFor="login-password">
            <div className="flex items-center gap-2">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="button" variant="secondary" className="whitespace-nowrap px-3" onClick={() => setShowPassword((prev) => !prev)}>
                {showPassword ? "Hide" : "Show"}
              </Button>
            </div>
          </Field>
          {mode === "signup" ? (
            <Field label="Confirm Password" htmlFor="signup-confirm-password">
              <div className="flex items-center gap-2">
                <Input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="whitespace-nowrap px-3"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </Button>
              </div>
            </Field>
          ) : null}
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={loading} loading={loading} className="mt-6 w-full">
          {loading ? (mode === "signup" ? "Creating account..." : "Signing in...") : mode === "signup" ? "Create account" : "Sign in"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setMode((prev) => (prev === "login" ? "signup" : "login"));
            setError("");
          }}
          className="mt-3 w-full text-sm text-slate-600 hover:text-slate-900"
        >
          {mode === "signup" ? "Already have an account? Sign in" : "No account? Create one"}
        </button>
        <Link to="/" className="mt-2 block w-full text-center text-sm text-slate-600 hover:text-slate-900">
          Back to Shop
        </Link>
      </form>
    </div>
  );
};
