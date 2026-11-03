import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

window.__bridgeInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();

  window.__bridgeInstallPrompt = event;

  window.dispatchEvent(new CustomEvent("bridge-install-ready"));
});

window.addEventListener("appinstalled", () => {
  window.__bridgeInstallPrompt = null;

  window.dispatchEvent(new CustomEvent("bridge-app-installed"));
});

createRoot(document.getElementById("root")).render(<App />);
