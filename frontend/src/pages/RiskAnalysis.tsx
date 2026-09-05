import { useState } from "react";
import { API_BASE_URL } from "../api";
import { demoTransactions, type DemoTransaction } from "../demoTransactions";
import { percent, riskModes, type RiskMode } from "../siteData";

type Prediction = {
  fraud_probability: number;
  risk_score: number;
  risk_mode: RiskMode;
  threshold_used: number;
  decision: "APPROVE" | "BLOCK";
  explanation: string;
  risk_factors: { feature: string; observed_value: number; baseline_value: number; impact: number; direction: string }[];
};
type RecentAnalysis = { id: string; timestamp: string; sample: string; probability: number; strategy: string; decision: Prediction["decision"] };
const processingSteps = ["Transaction selected", "Processing features", "Running risk assessment", "Applying risk strategy", "Decision generated"];

export function RiskAnalysis() {
  const [selectedTransaction, setSelectedTransaction] = useState<DemoTransaction>(demoTransactions[0]);
  const [riskMode, setRiskMode] = useState<RiskMode>("balanced");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>(() => { try { return JSON.parse(localStorage.getItem("sentinelai-recent-analyses") ?? "[]") as RecentAnalysis[]; } catch { return []; } });
  const selectedMode = riskModes.find((mode) => mode.value === riskMode);

  const resetResult = () => setPrediction(null);

  async function analyzeTransaction() {
    setIsAnalyzing(true);
    setProcessingStep(0);
    setError(null);
    let sequence: number | undefined;
    try {
      sequence = window.setInterval(() => setProcessingStep((step) => Math.min(step + 1, processingSteps.length - 1)), 300);
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction: selectedTransaction.transaction, risk_mode: riskMode }),
      });
      if (!response.ok) throw new Error("Prediction request failed.");
      const result = (await response.json()) as Prediction;
      setProcessingStep(processingSteps.length - 1);
      setPrediction(result);
      const record: RecentAnalysis = { id: `${Date.now()}`, timestamp: new Date().toISOString(), sample: selectedTransaction.label, probability: result.fraud_probability, strategy: selectedMode?.label ?? riskMode, decision: result.decision };
      setRecentAnalyses((current) => { const next = [record, ...current].slice(0, 5); localStorage.setItem("sentinelai-recent-analyses", JSON.stringify(next)); return next; });
    } catch {
      setError("Unable to analyze the transaction. Check that the backend is running on port 8000.");
    } finally {
      if (sequence !== undefined) window.clearInterval(sequence);
      setIsAnalyzing(false);
    }
  }

  return <section className="page-section analysis-page">
    <PageTitle kicker="LIVE TRANSACTION ANALYSIS" title="Transaction Risk Analysis" description="Evaluate anonymized transaction samples and receive a clear fraud risk decision from SentinelAI." />
    <div className="analysis-grid">
      <div className="panel control-panel">
        <div className="panel-heading"><span>01</span><div><h3>Select a transaction sample</h3><p>Samples use real rows from the available credit-card dataset.</p></div></div>
        <div className="transaction-list">
          {demoTransactions.map((sample) => <button className={`sample ${sample.id} ${selectedTransaction.id === sample.id ? "selected" : ""}`} aria-pressed={selectedTransaction.id === sample.id} key={sample.id} onClick={() => { setSelectedTransaction(sample); resetResult(); }}><b>{sample.label}</b><span>{sample.description}</span></button>)}
        </div>
        <div className="panel-heading"><span>02</span><div><h3>Choose a risk strategy</h3><p>Each strategy applies its saved decision threshold.</p></div></div>
        <div className="mode-list">
          {riskModes.map((mode) => <button className={riskMode === mode.value ? "mode selected" : "mode"} aria-pressed={riskMode === mode.value} key={mode.value} onClick={() => { setRiskMode(mode.value); resetResult(); }}><b>{mode.label}</b><span>{mode.threshold} threshold</span></button>)}
        </div>
        <div className="selection-summary"><span>Current strategy</span><strong>{selectedMode?.label} · {selectedMode?.threshold} threshold</strong></div>
        <button className="button primary analyze" onClick={analyzeTransaction} disabled={isAnalyzing}>{isAnalyzing ? "Analyzing transaction..." : <>Analyze Transaction <span>&rarr;</span></>}</button>
      </div>
      <DecisionCard prediction={prediction} isAnalyzing={isAnalyzing} processingStep={processingStep} />
    </div>
    {isAnalyzing && <ProcessingSequence activeStep={processingStep} />}
    {error && <p className="error-message" role="alert">{error}</p>}
    <RecentAnalyses analyses={recentAnalyses} onClear={() => { localStorage.removeItem("sentinelai-recent-analyses"); setRecentAnalyses([]); }} />
  </section>;
}

function DecisionCard({ prediction, isAnalyzing, processingStep }: { prediction: Prediction | null; isAnalyzing: boolean; processingStep: number }) {
  return <div className={`panel decision-panel ${prediction ? prediction.decision.toLowerCase() : ""}`} aria-live="polite" aria-busy={isAnalyzing}>
    <div className="decision-heading"><div><p className="kicker">RISK DECISION</p><h3>Model assessment</h3></div>{prediction && <span className="decision-label">{prediction.decision}</span>}</div>
    {isAnalyzing ? <div className="empty-decision loading-decision"><div aria-hidden="true" /><h4>{processingSteps[processingStep]}...</h4><p>SentinelAI is scoring the selected transaction against the saved model.</p></div> : prediction ? <><div className="decision-banner"><span>RECOMMENDATION</span><strong>{prediction.decision}</strong></div><RiskMeter prediction={prediction} /><div className="score-grid"><Data label="Fraud Probability" value={percent(prediction.fraud_probability)} /><Data label="Risk Score" value={`${prediction.risk_score.toFixed(1)}/100`} /></div><div className="decision-meta"><Data label="Risk Mode" value={riskModes.find((mode) => mode.value === prediction.risk_mode)?.label ?? prediction.risk_mode} /><Data label="Threshold Used" value={percent(prediction.threshold_used)} /></div><div className="explanation"><span>Why this decision?</span><p>{prediction.explanation}</p><ul>{prediction.risk_factors.map((factor) => <li key={factor.feature}><strong>{factor.feature === "Amount" ? "Transaction amount" : factor.feature === "Time" ? "Transaction time" : `Anonymized signal ${factor.feature.slice(1)}`}</strong><span>{factor.direction} · {factor.impact >= 0 ? "+" : ""}{percent(factor.impact)} vs train median</span></li>)}</ul><small>Signals show local model sensitivity when one input is compared with its train-set median. They are not causal explanations.</small></div><DecisionTimeline decision={prediction.decision} /></> : <div className="empty-decision"><div aria-hidden="true">&#10003;</div><h4>Awaiting analysis</h4><p>Select a sample and risk strategy, then run an analysis to receive the model decision.</p></div>}
  </div>;
}

function ProcessingSequence({ activeStep }: { activeStep: number }) { return <ol className="processing-sequence" aria-label="Analysis progress">{processingSteps.map((step, index) => <li className={index < activeStep ? "complete" : index === activeStep ? "active" : ""} key={step}><span>{index < activeStep ? "✓" : String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></li>)}</ol>; }

function RecentAnalyses({ analyses, onClear }: { analyses: RecentAnalysis[]; onClear: () => void }) { return <section className="recent-analyses" aria-labelledby="recent-title"><div className="recent-heading"><div><p className="kicker">LOCAL ACTIVITY</p><h2 id="recent-title">Recent analyses</h2><p>Recent analyses from this browser</p></div>{analyses.length > 0 && <button className="text-button" onClick={onClear}>Clear history</button>}</div>{analyses.length === 0 ? <p className="recent-empty">Completed analyses will appear here for quick reference.</p> : <div className="recent-list">{analyses.map((analysis) => <article key={analysis.id}><div><strong>{analysis.sample}</strong><small>{new Date(analysis.timestamp).toLocaleString()}</small></div><span>{percent(analysis.probability)}</span><small>{analysis.strategy}</small><b className={analysis.decision.toLowerCase()}>{analysis.decision}</b></article>)}</div>}</section>; }

function RiskMeter({ prediction }: { prediction: Prediction }) {
  const riskLabel = prediction.risk_score >= 70 ? "High risk" : prediction.risk_score >= 30 ? "Moderate risk" : "Low risk";
  return <div className="risk-meter"><div className="risk-meter-head"><span>Risk probability</span><strong>{riskLabel}</strong></div><div className="risk-meter-track"><span style={{ width: `${Math.min(prediction.risk_score, 100)}%` }} /><i style={{ left: `${Math.min(prediction.threshold_used * 100, 100)}%` }} /></div><div className="risk-meter-scale"><span>Safe</span><span>Moderate</span><span>High risk</span></div><p>Decision threshold <strong>{percent(prediction.threshold_used)}</strong></p></div>;
}

function DecisionTimeline({ decision }: { decision: Prediction["decision"] }) {
  return <ol className="decision-timeline"><li className="complete"><span>01</span><div><strong>Transaction received</strong><small>30 model inputs validated</small></div></li><li className="complete"><span>02</span><div><strong>Risk probability calculated</strong><small>Saved model scored the transaction</small></div></li><li className="complete"><span>03</span><div><strong>Strategy threshold applied</strong><small>Business posture converted score to action</small></div></li><li className="final"><span>04</span><div><strong>{decision} recommendation issued</strong><small>Ready for analyst review</small></div></li></ol>;
}

function Data({ label, value }: { label: string; value: string }) { return <div className="data-point"><span>{label}</span><strong>{value}</strong></div>; }

export function PageTitle({ kicker, title, description }: { kicker: string; title: string; description: string }) {
  return <div className="page-title"><p className="kicker">{kicker}</p><h1>{title}</h1><p>{description}</p></div>;
}
