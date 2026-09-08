import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { ShieldPlus } from "lucide-react";
import { adminLogin, adminSignup } from "../api";

export default function AdminSignupPage({ theme, onSignup, onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isDark = theme === "dark";

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !password.trim())
      return setError("Please complete every field.");
    if (password !== confirmPassword)
      return setError("Passwords do not match.");
    setLoading(true);
    try {
      await adminSignup(name, email, password);
      const session = await adminLogin(email, password);
      onSignup(session.user, session.token);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to create the administrator account.",
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
          className: "mb-7 text-center",
          children: [
            _jsx("div", {
              className:
                "mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-500 text-slate-950",
              children: _jsx(ShieldPlus, { size: 28 }),
            }),
            _jsx("p", {
              className:
                "text-xs font-bold uppercase tracking-[0.2em] text-amber-500",
              children: "Restricted access",
            }),
            _jsx("h1", {
              className: "mt-2 text-2xl font-black",
              children: "Create admin account",
            }),
          ],
        }),
        _jsxs("form", {
          onSubmit: submit,
          className: "space-y-4",
          children: [
            [
              ["Name", name, setName, "text"],
              ["Administrator email", email, setEmail, "email"],
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
                  className: "block text-sm font-semibold",
                  children: [
                    label,
                    _jsx("input", {
                      type,
                      value,
                      onChange: (event) => setter(event.target.value),
                      className:
                        "mt-1 w-full rounded-xl border border-slate-700 bg-transparent p-3 outline-none focus:border-amber-500",
                    }),
                  ],
                },
                label,
              ),
            ),
            error &&
              _jsx("p", {
                className: "text-sm text-rose-500",
                children: error,
              }),
            _jsx("button", {
              disabled: loading,
              className:
                "w-full rounded-xl bg-amber-500 py-3 font-bold text-slate-950 disabled:opacity-50",
              children: loading
                ? "Creating account..."
                : "Create admin account",
            }),
          ],
        }),
        _jsx("button", {
          onClick: onSwitchToLogin,
          className: "mt-6 w-full text-sm font-semibold text-amber-500",
          children: "Already have an administrator account? Sign in",
        }),
      ],
    }),
  });
}
