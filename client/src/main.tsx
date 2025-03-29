import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import './force-reload';

// Force hard reload to clear cached styles
if (window.sessionStorage.getItem('reloaded') !== 'true') {
  window.sessionStorage.setItem('reloaded', 'true');
  window.location.reload();
} else {
  window.sessionStorage.removeItem('reloaded');
  createRoot(document.getElementById("root")!).render(<App />);
}
