"use client";

import App from "../App";
import { AppProvider } from "../context/AppContext";

export default function HomePage() {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}
