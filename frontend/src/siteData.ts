export type RiskMode = "fraud_protection" | "balanced" | "customer_friendly";

export const riskModes: { value: RiskMode; label: string; threshold: string; description: string }[] = [
  { value: "fraud_protection", label: "Fraud Protection", threshold: "0.30", description: "Prioritizes detecting potentially fraudulent transactions by using a lower decision threshold." },
  { value: "balanced", label: "Balanced", threshold: "0.70", description: "Balances fraud detection with minimizing unnecessary transaction blocks." },
  { value: "customer_friendly", label: "Customer Friendly", threshold: "0.90", description: "Uses a higher threshold to reduce unnecessary blocks for legitimate customers." },
];

export const navigation = [
  ["/", "Home"], ["/risk-analysis", "Risk Analysis"], ["/how-it-works", "How It Works"],
  ["/performance", "Performance"], ["/risk-strategies", "Risk Strategies"], ["/about", "About"],
] as const;

export const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
