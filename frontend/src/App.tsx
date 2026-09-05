import { useEffect, useState } from "react";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";
import { About } from "./pages/About";
import { Home } from "./pages/Home";
import { HowItWorks } from "./pages/HowItWorks";
import { ModelPerformance } from "./pages/ModelPerformance";
import { RiskAnalysis } from "./pages/RiskAnalysis";
import { RiskStrategies } from "./pages/RiskStrategies";
import { getSystemStatus, type SystemStatus } from "./api";

const validPaths = new Set(["/", "/risk-analysis", "/how-it-works", "/performance", "/risk-strategies", "/about"]);
const getPath = () => validPaths.has(window.location.pathname) ? window.location.pathname : "/";

function App() {
  const [path, setPath] = useState(getPath);
  const [modelStatus, setModelStatus] = useState<"checking" | "online" | "offline">("checking");
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  useEffect(() => { const onPopState = () => setPath(getPath()); window.addEventListener("popstate", onPopState); return () => window.removeEventListener("popstate", onPopState); }, []);
  useEffect(() => {
    const titles: Record<string, string> = { "/": "SentinelAI | Transaction Risk Intelligence", "/risk-analysis": "Risk Analysis | SentinelAI", "/how-it-works": "How It Works | SentinelAI", "/performance": "Model Performance | SentinelAI", "/risk-strategies": "Risk Strategies | SentinelAI", "/about": "About | SentinelAI" };
    document.title = titles[path];
  }, [path]);
  useEffect(() => { getSystemStatus().then((status) => { setSystemStatus(status); setModelStatus(status.model ? "online" : "offline"); }).catch(() => { setSystemStatus({ api: false, model: false, evaluation: false }); setModelStatus("offline"); }); }, []);
  const navigate = (target: string) => { if (target === path) return; window.history.pushState({}, "", target); setPath(target); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const page = path === "/risk-analysis" ? <RiskAnalysis /> : path === "/how-it-works" ? <HowItWorks /> : path === "/performance" ? <ModelPerformance /> : path === "/risk-strategies" ? <RiskStrategies /> : path === "/about" ? <About /> : <Home navigate={navigate} systemStatus={systemStatus} />;
  return <div className="site-shell"><Navbar path={path} navigate={navigate} modelStatus={modelStatus} /><main>{page}</main><Footer navigate={navigate} /></div>;
}
export default App;
