import { useEffect, useState, type MouseEvent } from "react";
import { navigation } from "../siteData";
import { Logo } from "./Logo";

type Props = { path: string; navigate: (path: string) => void; modelStatus: "checking" | "online" | "offline" };
export function Navbar({ path, navigate, modelStatus }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  const go = (event: MouseEvent<HTMLAnchorElement>, target: string) => { event.preventDefault(); navigate(target); setOpen(false); };
  const statusLabel = modelStatus === "online" ? "Model Online" : modelStatus === "offline" ? "Model Unavailable" : "Checking Model";
  return <header className="site-header"><div className="nav-wrap"><a className="brand" href="/" onClick={(event) => go(event, "/")}><Logo /><span><strong>SentinelAI</strong><small>Transaction Risk Intelligence</small></span></a><button className="menu-button" aria-label={open ? "Close navigation" : "Open navigation"} aria-controls="main-navigation" aria-expanded={open} onClick={() => setOpen(!open)}><i /><i /><i /></button><nav className={open ? "main-nav open" : "main-nav"} id="main-navigation">{navigation.map(([target, label]) => <a className={path === target ? "active" : ""} aria-current={path === target ? "page" : undefined} href={target} key={target} onClick={(event) => go(event, target)}>{label}</a>)}</nav><div className={`model-status ${modelStatus}`} aria-live="polite"><span aria-hidden="true" /> {statusLabel}</div></div></header>;
}
