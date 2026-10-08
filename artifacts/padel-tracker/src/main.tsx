import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

setAuthTokenGetter(() => {
  try {
    return localStorage.getItem("padel_auth_token");
  } catch {
    return null;
  }
});

createRoot(document.getElementById("root")!).render(<App />);

