import { useState } from "react";
import { Header, Spreadsheet, InfoPanel } from "./components";
import { GlassStyle, SpreadsheetData } from "./types";
import { motion } from "framer-motion";
import Toast from "./components/Toast";

console.log("=== DIRECT CONSOLE TEST ===");

const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;

if (!API_URL || !WS_URL) {
  throw new Error(
    "Environment variables VITE_API_URL and VITE_WS_URL must be set"
  );
}

// Log environment variables immediately
console.log({
  mode: import.meta.env.MODE,
  api_url: API_URL,
  ws_url: WS_URL,
});

// Add this near your other console.logs
console.log("Environment:", {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_WS_URL: import.meta.env.VITE_WS_URL,
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
});

// Add a window load event
window.addEventListener("load", () => {
  console.log("=== Window Loaded ===");
  console.log("API URL (on load):", import.meta.env.VITE_API_URL);
});

// Add this near the top of the file, after the imports
const writingAnimation = `
@keyframes writing {
  0% {
    stroke-dashoffset: 1000;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

.animate-writing {
  animation: writing 1.5s linear infinite;
}
`;

// Add this right after the imports
const style = document.createElement("style");
style.textContent = writingAnimation;
document.head.appendChild(style);

// Add DM Sans font import
const dmSansStyle = document.createElement("style");
dmSansStyle.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
  
  /* Apply DM Sans globally */
  body {
    font-family: 'DM Sans', sans-serif;
  }
`;
document.head.appendChild(dmSansStyle);

export type ToastDetail = {
  message?: string;
  type?: "success" | "error" | "info";
  isShowing?: boolean;
};

function App() {
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState<boolean>(true);
  const [toastDetail, setToastDetail] = useState<ToastDetail>({});
  const [data, setData] = useState<SpreadsheetData>({
    headers: Array(5).fill(""),
    rows: Array(5)
      .fill(0)
      .map(() => Array(5).fill({ value: "" })),
  });

  // Add these styles at the top of the component, before the return statement
  const glassStyle: GlassStyle = {
    base: "backdrop-filter backdrop-blur-lg bg-white/80 border border-gray-200 shadow-xl",
    card: "backdrop-filter backdrop-blur-lg bg-white/80 border border-gray-200 shadow-xl rounded-2xl p-6",
    input:
      "backdrop-filter backdrop-blur-lg bg-white/80 border border-gray-200 shadow-xl pl-10 w-full rounded-lg py-3 px-4 text-gray-900 focus:border-[#468BFF]/50 focus:outline-none focus:ring-1 focus:ring-[#468BFF]/50 placeholder-gray-400 bg-white/80 shadow-none",
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-white p-8 relative overflow-hidden">
      <div className="absolute top-8 left-5 flex items-center space-x-2 bg-white/80 px-4 py-2 rounded-lg shadow-md backdrop-blur-lg z-50">
        <img src="../watsonx.svg" alt="WatsonX Logo" className="h-6" />
        <span className="text-gray-700 text-sm font-medium">
          Powered by watsonx
        </span>
      </div>

      {/* Enhanced background with multiple layers */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(70,139,255,0.35)_1px,transparent_0)] bg-[length:24px_24px] bg-center"></div>

      {toastDetail.isShowing && (
        <Toast
          message={toastDetail.message}
          type={toastDetail.type}
          onClose={() => setToastDetail({})}
        />
      )}

      {/* Add floating gradient orbs for visual interest */}
      <motion.div
        className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-blue-300/20 to-purple-300/10 blur-3xl pointer-events-none"
        animate={{
          y: [0, -15, 0],
          x: [0, 10, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      <motion.div
        className="absolute bottom-1/3 left-1/4 w-48 h-48 rounded-full bg-gradient-to-tr from-green-300/10 to-blue-300/20 blur-3xl pointer-events-none"
        animate={{
          y: [0, 20, 0],
          x: [0, -15, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />

      {/* Add a subtle animated glow around the main content */}
      <motion.div
        className="absolute inset-0 mx-auto max-w-7xl h-full bg-gradient-to-b from-blue-50/10 to-purple-50/10 blur-3xl rounded-[40px] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      />

      <div className="max-w-7xl mx-auto space-y-8 relative">
        {/* Header Component */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Header glassStyle={glassStyle.card} data={data} />
        </motion.div>

        {/* Spreadsheet Component */}
        <motion.div
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {isInfoPanelOpen && (
            <InfoPanel
              glassStyle={glassStyle.card}
              onDismiss={() => setIsInfoPanelOpen(false)}
            />
          )}

          <Spreadsheet
            data={data}
            setData={setData}
            setToast={setToastDetail}
          />
        </motion.div>
      </div>
    </div>
  );
}

export default App;
