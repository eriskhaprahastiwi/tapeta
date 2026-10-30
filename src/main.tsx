import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/nunito-sans";
import "@fontsource-variable/nunito-sans/wght-italic.css";
import "./index.css";
import "./tapeta/tapeta.css";
import "./tapeta/workflow.css";
import "./tapeta/admin.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
