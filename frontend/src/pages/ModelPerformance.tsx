import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "../api";
import { percent } from "../siteData";
import { PageTitle } from "./RiskAnalysis";

type Metrics = { precision: number; recall: number; f1_score: number; pr_auc: number; roc_auc: number };
const thresholdData = [{ label: "Fraud Protection", value: 30, detail: "Highest detection sensitivity" }, { label: "Balanced", value: 70, detail: "Balanced operating point" }, { label: "Customer Friendly", value: 90, detail: "Fewer unnecessary blocks" }];
const definitions = [["Precision", "How often flagged transactions were actually fraudulent."], ["Recall", "How effectively the model detected fraudulent transactions."], ["F1 Score", "The balance between precision and recall."], ["PR-AUC", "Performance across precision and recall trade-offs."], ["ROC-AUC", "The model's ability to distinguish fraud from legitimate transactions."]];

export function ModelPerformance() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch(`${API_BASE_URL}/metrics`);
      if (!response.ok) throw new Error("Metrics are unavailable.");
      setMetrics((await response.json()) as Metrics);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void loadMetrics(); }, [loadMetrics]);

  return <section className="page-section performance-page">
    <PageTitle kicker="MODEL INTELLIGENCE" title="Model Performance" description="Evaluation results from the trained fraud detection model on held-out test data." />
    <div className="evaluation-head"><span className="evaluation-badge">Real Held-Out Evaluation Data</span><p>Metrics are loaded directly from the model evaluation endpoint.</p></div>
    {loading ? <p className="loading" aria-live="polite">Loading model metrics...</p> : error || !metrics ? <div className="metrics-error" role="alert"><p>Metrics could not be loaded from the backend.</p><button className="text-button" onClick={() => void loadMetrics()}>Try again</button></div> : <><div className="metric-grid"><Metric label="Precision" value={percent(metrics.precision)} /><Metric label="Recall" value={percent(metrics.recall)} /><Metric label="F1 Score" value={metrics.f1_score.toFixed(3)} /><Metric label="PR-AUC" value={metrics.pr_auc.toFixed(3)} /><Metric label="ROC-AUC" value={metrics.roc_auc.toFixed(3)} /></div><section className="threshold-visual" aria-labelledby="threshold-title"><div><p className="kicker">OPERATING POINTS</p><h2 id="threshold-title">Risk strategy thresholds</h2><p>Real decision thresholds applied by the prediction API. Lower thresholds flag more transactions for review.</p></div><div className="threshold-bars">{thresholdData.map((item) => <div className="threshold-bar" key={item.label}><div><strong>{item.label}</strong><span>{item.value}%</span></div><div className="threshold-track"><i style={{ width: `${item.value}%` }} /></div><small>{item.detail}</small></div>)}</div></section></>}
    <div className="understanding"><div><p className="kicker">UNDERSTANDING THE RESULTS</p><h2>Measured for meaningful decisions.</h2></div><div className="definition-grid">{definitions.map(([term, detail]) => <article key={term}><h3>{term}</h3><p>{detail}</p></article>)}</div></div>
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <article className="metric-card"><span>{label}</span><strong>{value}</strong><i /></article>; }
