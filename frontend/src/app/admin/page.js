"use client";

import App from "../../App";
import { AppProvider } from "../../context/AppContext";

export default function AdminPage() {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}
