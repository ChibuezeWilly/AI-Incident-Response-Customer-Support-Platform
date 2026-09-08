"use client";

import App from "../../../App";
import { AppProvider } from "../../../context/AppContext";

export default function AdminLoginRoute() {
  return <AppProvider><App /></AppProvider>;
}
