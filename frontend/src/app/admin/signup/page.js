"use client";

import App from "../../../App";
import { AppProvider } from "../../../context/AppContext";

export default function AdminSignupRoute() {
  return <AppProvider><App /></AppProvider>;
}
