"use client";

import App from "../../App";
import { AppProvider } from "../../context/AppContext";

export default function LoginRoute() {
  return <AppProvider><App /></AppProvider>;
}
