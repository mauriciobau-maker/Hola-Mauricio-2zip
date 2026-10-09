import { createRoot } from "react-dom/client";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

const API_BASE = "https://parryn-api.onrender.com";
const isVercel =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("vercel.app") ||
   Boolean(import.meta.env.VITE_API_BASE_URL));

if (isVercel) {
  setBaseUrl(API_BASE);
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    if (url.startsWith("/api/")) {
      url = `${API_BASE}${url}`;
      return originalFetch(url, { ...init, credentials: init?.credentials || "include" });
    }
    return originalFetch(input, init);
  };
}

setAuthTokenGetter(() => {
  try {
    return localStorage.getItem("padel_auth_token");
  } catch {
    return null;
  }
});

createRoot(document.getElementById("root")!).render(<App />);


