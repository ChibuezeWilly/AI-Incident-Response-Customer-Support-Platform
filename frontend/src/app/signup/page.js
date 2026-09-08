"use client";

import App from "../../App";
import { AppProvider } from "../../context/AppContext";

export default function SignupRoute() {
  return <AppProvider><App /></AppProvider>;
}
