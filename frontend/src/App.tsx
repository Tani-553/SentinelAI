import { useEffect, useState } from "react";
import { demoTransactions, type DemoTransaction } from "./demoTransactions";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type RiskMode = "fraud_protection" | "balanced" | "customer_friendly";

type Prediction = {
  fraud_probability: number;
  risk_score: number;
  risk_mode: RiskMode;
  threshold_used: number;
  decision: "APPROVE" | "BLOCK";
  explanation: string;
};

type Metrics = {
  precision: number;
  recall: number;
  f1_score: number;
  pr_auc: number;
  roc_auc: number;
};

const riskModes: { value: RiskMode; label: string; note: string }[] = [
  { value: "fraud_protection", label: "Fraud Protection", note: "0.30 threshold" },
  { value: "balanced", label: "Balanced", note: "0.70 threshold" },
  { value: "customer_friendly", label: "Customer Friendly", note: "0.90 threshold" },
];

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

function App() {
  const [selectedTransaction, setSelectedTransaction] = useState<DemoTransaction>(demoTransactions[0]);
  const [riskMode, setRiskMode] = useState<RiskMode>("balanced");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/metrics`)
      .then((response) => {
        if (!response.ok) throw new Error("Metrics are unavailable.");
        return response.json() as Promise<Metrics>;
      })
      .then(setMetrics)
      .catch(() => setError("Unable to load live model metrics. Check that the backend is running."))
      .finally(() => setLoadingMetrics(false));
  }, []);

  async function analyzeTransaction() {
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction: selectedTransaction.transaction, risk_mode: riskMode }),
      });
      if (!response.ok) throw new Error("Prediction request failed.");
      setPrediction((await response.json()) as Prediction);
    } catch {
      setError("Unable to analyze the transaction. Check that the backend is running on port 8000.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">S</div>
        <div>
          <p className="eyebrow">RISK INTELLIGENCE</p>
          <h1>SentinelAI</h1>
          <p className="subtitle">Explainable AI-Powered Transaction Risk Manager</p>
        </div>
        <div className="api-status"><span /> Live model connection</div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">TRANSACTION REVIEW CONSOLE</p>
          <h2>Turn probability into a clear decision.</h2>
          <p>Choose a real, anonymized dataset sample and set the operating mode for this review.</p>
        </div>
        <div className="privacy-note">30 anonymized model features<br />No customer data displayed</div>
      </section>

      <section className="workspace" aria-label="Transaction analysis workspace">
        <div className="control-card card">
          <div className="card-heading">
            <span className="step">01</span>
            <div><h3>Select a demo transaction</h3><p>Samples use real rows from the available credit-card dataset.</p></div>
          </div>
          <div className="transaction-options">
            {demoTransactions.map((sample) => (
              <button
                className={`transaction-option ${selectedTransaction.id === sample.id ? "selected" : ""}`}
                key={sample.id}
                onClick={() => { setSelectedTransaction(sample); setPrediction(null); }}
              >
                <strong>{sample.label}</strong>
                <span>{sample.description}</span>
              </button>
            ))}
          </div>

          <div className="card-heading mode-heading">
            <span className="step">02</span>
            <div><h3>Choose risk mode</h3><p>Each mode applies its saved decision threshold.</p></div>
          </div>
          <div className="mode-options">
            {riskModes.map((mode) => (
              <button
                className={`mode-option ${riskMode === mode.value ? "selected" : ""}`}
                key={mode.value}
                onClick={() => { setRiskMode(mode.value); setPrediction(null); }}
              >
                <strong>{mode.label}</strong><span>{mode.note}</span>
              </button>
            ))}
          </div>
          <button className="analyze-button" onClick={analyzeTransaction} disabled={isAnalyzing}>
            {isAnalyzing ? "Analyzing transaction…" : "Analyze Transaction"}
          </button>
        </div>

        <div className="result-card card">
          <div className="result-heading"><div><p className="eyebrow">AI ASSESSMENT</p><h3>Risk decision</h3></div>{prediction && <span className={`decision-badge ${prediction.decision.toLowerCase()}`}>{prediction.decision}</span>}</div>
          {prediction ? (
            <>
              <div className="score-row">
                <div><span>Fraud probability</span><strong>{percent(prediction.fraud_probability)}</strong></div>
                <div className="risk-score"><span>Risk score</span><strong>{prediction.risk_score.toFixed(1)}<small>/100</small></strong></div>
              </div>
              <div className="details-grid">
                <div><span>Risk mode</span><strong>{riskModes.find((mode) => mode.value === prediction.risk_mode)?.label}</strong></div>
                <div><span>Threshold used</span><strong>{percent(prediction.threshold_used)}</strong></div>
              </div>
              <div className="explanation"><span>Explanation</span><p>{prediction.explanation}</p></div>
            </>
          ) : (
            <div className="empty-result"><div className="empty-icon">◈</div><p>Select a sample, set a mode, and run the analysis to view the model decision.</p></div>
          )}
        </div>
      </section>

      <section className="performance-card card">
        <div className="performance-heading"><div><p className="eyebrow">MODEL PERFORMANCE</p><h3>Held-out test metrics</h3></div><span className="held-out">Real evaluation data</span></div>
        {loadingMetrics ? <p className="loading-copy">Loading model metrics…</p> : metrics ? (
          <div className="metrics-grid">
            <Metric label="Precision" value={percent(metrics.precision)} />
            <Metric label="Recall" value={percent(metrics.recall)} />
            <Metric label="F1-score" value={metrics.f1_score.toFixed(3)} />
            <Metric label="PR-AUC" value={metrics.pr_auc.toFixed(3)} />
            <Metric label="ROC-AUC" value={metrics.roc_auc.toFixed(3)} />
          </div>
        ) : <p className="loading-copy">Metrics could not be loaded from the backend.</p>}
      </section>
      {error && <p className="error-message" role="alert">{error}</p>}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

export default App;
