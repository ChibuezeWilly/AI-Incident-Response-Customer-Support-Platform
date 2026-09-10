import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { userLogin, userSignup } from "../api";

export default function SignupPage({
  theme,
  onSignup,
  onSwitchToLogin,
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountTier, setAccountTier] = useState("Standard");
  const [sla, setSla] = useState("24");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isDark = theme === "dark";

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    
    if (!name.trim() || !email.trim() || !password.trim() || !sla)
      return setError("Please fill in all fields.");
    if (password !== confirmPassword)
      return setError("Passwords do not match.");
      
    setLoading(true);
    try {
      await userSignup(name, email, password, accountTier, Number(sla));

      const session = await userLogin(email, password);

      // Login returns the session token required before rendering protected data.
      onSignup(session.user, session.token);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to create your account.",
      );
    } finally {
      setLoading(false);
    }
  };

  return _jsx("div", {
    className: `min-h-screen flex items-center justify-center p-4 ${isDark ? "bg-zinc-950" : " bg-slate-100"}`,
    children: _jsxs("div", {
      className: `w-full max-w-md rounded-2xl border p-8 space-y-6 ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"}`,
      children: [
        _jsxs("div", {
          className: "text-center",
          children: [
            _jsx(ShieldCheck, {
              className: "mx-auto text-indigo-500",
              size: 30,
            }),
            _jsx("h1", {
              className: `text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`,
              children: "Create Account",
            }),
          ],
        }),
        _jsxs("form", {
          onSubmit: submit,
          className: `space-y-4 text-base font-mono ${isDark ? "text-white" : "text-slate-900"} text-base`,
          children: [
            [
              ["Business name", name, setName, "text"],
              ["Email", email, setEmail, "email"],
              ["Account tier", accountTier, setAccountTier, "select"],
              ["SLA (hours)", sla, setSla, "number"],
              ["Password", password, setPassword, "password"],
              [
                "Confirm password",
                confirmPassword,
                setConfirmPassword,
                "password",
              ],
            ].map(([label, value, setter, type]) =>
              _jsxs(
                "label",
                {
                  className: "block font-mono text-base",
                  children: [
                    label,
                    type === "select"
                      ? _jsxs("select", {
                          value: value,
                          onChange: (event) => setter(event.target.value),
                          className: `mt-1 w-full rounded-xl text-base border p-3 ${isDark ? "bg-zinc-900 text-white" : "bg-white text-slate-900"}`,
                          children: [
                            _jsx("option", { value: "Standard", children: "Standard" }),
                            _jsx("option", { value: "Premium", children: "Premium" }),
                            _jsx("option", { value: "Enterprise", children: "Enterprise" }),
                          ],
                        })
                      : _jsx("input", {
                          type: type,
                          min: type === "number" ? 1 : undefined,
                          value: value,
                          onChange: (event) => setter(event.target.value),
                          className: `mt-1 w-full rounded-xl text-base border p-3 ${isDark ? "text-white" : "text-slate-900"}`,
                        }),
                  ],
                },
                label,
              ),
            ),
            error &&
              _jsx("p", {
                className: "text-base text-rose-500",
                children: error,
              }),
            _jsx("button", {
              disabled: loading,
              className:
                "w-full rounded-xl bg-indigo-600 py-3 text-white disabled:opacity-50",
              children: loading ? "Creating account…" : "Sign Up",
            }),
          ],
        }),
        _jsxs("button", {
          onClick: onSwitchToLogin,
          className: "text-sm text-indigo-500",
          children: [
            "Already have an account? Sign in",
            " ",
            _jsx(ArrowRight, { className: "inline", size: 14 }),
          ],
        }),
      ],
    }),
  });
}
