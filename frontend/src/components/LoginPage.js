import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { ShieldCheck, LogIn, ArrowRight } from "lucide-react";
import { userLogin } from "../api";

export default function LoginPage({
  theme,
  onLogin,
  onSwitchToSignup,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isDark = theme === "dark";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const session = await userLogin(email, password);

      // The parent persists the token before it updates the authenticated UI.
      onLogin(session.user, session.token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return _jsx("div", {
    className: `min-h-screen flex items-center justify-center p-4 ${isDark ? "bg-zinc-950" : "bg-slate-100"}`,
    children: _jsxs("div", {
      className: `w-full max-w-md rounded-2xl border p-8 space-y-6 shadow-2xl ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"}`,
      children: [
        _jsxs("div", {
          className: "text-center space-y-2",
          children: [
            _jsx("div", {
              className:
                "mx-auto w-14 h-14 rounded-2xl flex items-center justify-center text-white bg-indigo-600",
              children: _jsx(ShieldCheck, { size: 28 }),
            }),
            _jsx("h1", {
              className: `text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`,
              children: "Welcome Back",
            }),
          ],
        }),
        _jsxs("form", {
          onSubmit: handleSubmit,
          className: "space-y-4 ",
          children: [
            _jsxs("label", {
              className: "block text-base font-mono  text-gray-200",
              children: [
                "Email",
                _jsx("input", {
                  type: "email",
                  value: email,
                  onChange: (event) => setEmail(event.target.value),
                  className:
                    "mt-1 w-full font-mono rounded-xl border p-3 text-gray-200 font-medium",
                }),
              ],
            }),
            _jsxs("label", {
              className: "block text-sm font-mono text-gray-200",
              children: [
                "Password",
                _jsx("input", {
                  type: "password",
                  value: password,
                  onChange: (event) => setPassword(event.target.value),
                  className:
                    "mt-1 w-full rounded-xl border p-3 text-slate-200 font-medium",
                }),
              ],
            }),
            error &&
              _jsx("p", {
                className: "text-xs text-rose-500",
                children: error,
              }),
            _jsx("button", {
              disabled: loading,
              className:
                "w-full rounded-xl bg-indigo-600 py-3 text-white disabled:opacity-50",
              children: loading
                ? "Signing in…"
                : _jsxs("span", {
                    className: "inline-flex gap-2",
                    children: [
                      _jsx(LogIn, { className: "mt-1", size: 16 }),
                      "Sign In",
                    ],
                  }),
            }),
          ],
        }),
        _jsxs("button", {
          onClick: onSwitchToSignup,
          className: "text-sm text-indigo-500",
          children: [
            "Don't have an account? Sign up",
            " ",
            _jsx(ArrowRight, { className: "inline", size: 14 }),
          ],
        }),
      ],
    }),
  });
}
