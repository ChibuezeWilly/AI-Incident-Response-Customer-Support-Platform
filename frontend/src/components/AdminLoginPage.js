import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { LockKeyhole, ShieldAlert } from "lucide-react";
import { adminLogin } from "../api";

export default function AdminLoginPage({ theme, onLogin, onSwitchToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isDark = theme === "dark";

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password.trim())
      return setError("Enter your administrator email and password.");
    setLoading(true);
    try {
      const session = await adminLogin(email, password);
      onLogin(session.user, session.token);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to sign in as an administrator.",
      );
    } finally {
      setLoading(false);
    }
  };

  return _jsx("main", {
    className: `min-h-screen grid place-items-center p-4 ${isDark ? "bg-slate-950 text-white" : "bg-amber-50 text-slate-900"}`,
    children: _jsxs("section", {
      className: `w-full max-w-md rounded-3xl border p-8 shadow-2xl ${isDark ? "border-amber-400/20 bg-slate-900" : "border-amber-200 bg-white"}`,
      children: [
        _jsxs("div", {
          className: "mb-8 text-center",
          children: [
            _jsx("div", {
              className:
                "mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-500 text-slate-950",
              children: _jsx(ShieldAlert, { size: 28 }),
            }),
            _jsx("p", {
              className:
                "text-xs font-bold uppercase tracking-[0.2em] text-amber-500",
              children: "Restricted access",
            }),
            _jsx("h1", {
              className: "mt-2 text-2xl font-black",
              children: "Admin sign in",
            }),
            _jsx("p", {
              className: "mt-2 text-sm text-slate-400",
              children: "Access the incident operations control room.",
            }),
          ],
        }),
        _jsxs("form", {
          onSubmit: submit,
          className: "space-y-4",
          children: [
            _jsxs("label", {
              className: "block text-sm font-semibold", 
              children: [
                "Administrator email",
                _jsx("input", {
                  type: "email",
                  value: email,
                  onChange: (event) => setEmail(event.target.value),
                  className:
                    "mt-1 w-full rounded-xl border border-slate-700 bg-transparent p-3 outline-none focus:border-amber-500",
                  autoComplete: "email",
                }),
              ],
            }),
            _jsxs("label", {
              className: "block text-sm font-semibold",
              children: [
                "Password",
                _jsx("input", {
                  type: "password",
                  value: password,
                  onChange: (event) => setPassword(event.target.value),
                  className:
                    "mt-1 w-full rounded-xl border border-slate-700 bg-transparent p-3 outline-none focus:border-amber-500",
                  autoComplete: "current-password",
                }),
              ],
            }),
            error &&
              _jsx("p", {
                className: "text-sm text-rose-500",
                children: error,
              }),
            _jsxs("button", {
              disabled: loading,
              className:
                "flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 font-bold text-slate-950 disabled:opacity-50",
              children: [
                _jsx(LockKeyhole, { size: 17 }),
                loading ? "Signing in..." : "Enter admin portal",
              ],
            }),
          ],
        }),
        _jsx("button", {
          onClick: onSwitchToSignup,
          className: "mt-6 w-full text-sm font-semibold text-amber-500",
          children: "Create an administrator account",
        }),
      ],
    }),
  });
}
