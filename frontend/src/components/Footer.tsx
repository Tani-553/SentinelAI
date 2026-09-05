import type { MouseEvent } from "react";
import { navigation } from "../siteData";
import { Logo } from "./Logo";

export function Footer({ navigate }: { navigate: (path: string) => void }) {
  const go = (event: MouseEvent<HTMLAnchorElement>, target: string) => { event.preventDefault(); navigate(target); };
  return <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><Logo /><div><strong>SentinelAI</strong><p>Transaction Risk Intelligence powered by machine learning.</p></div></div><nav>{navigation.filter(([, label]) => label !== "Risk Strategies").map(([target, label]) => <a href={target} key={target} onClick={(event) => go(event, target)}>{label}</a>)}</nav></div><div className="footer-bottom"><p>Built as an AI-powered fraud risk analysis prototype using real held-out model evaluation data.</p><small>© 2026 SentinelAI</small></div></footer>;
}
