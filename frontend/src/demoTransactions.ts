export type TransactionFeatures = {
  Time: number;
  V1: number;
  V2: number;
  V3: number;
  V4: number;
  V5: number;
  V6: number;
  V7: number;
  V8: number;
  V9: number;
  V10: number;
  V11: number;
  V12: number;
  V13: number;
  V14: number;
  V15: number;
  V16: number;
  V17: number;
  V18: number;
  V19: number;
  V20: number;
  V21: number;
  V22: number;
  V23: number;
  V24: number;
  V25: number;
  V26: number;
  V27: number;
  V28: number;
  Amount: number;
};

export type DemoTransaction = {
  id: "low" | "suspicious" | "high";
  label: string;
  description: string;
  transaction: TransactionFeatures;
};

// Exact feature values from creditcard.csv rows 107102, 12763, and 541.
// The API model expects anonymized Time, V1-V28, and Amount columns only.
export const demoTransactions: DemoTransaction[] = [
  {
    id: "low",
    label: "Low Risk",
    description: "Real dataset transaction selected for a low model score.",
    transaction: { Time: 70281, V1: -0.0499974737, V2: 2.3538885324, V3: -2.8342752785, V4: 1.5894979847, V5: 0.5127687058, V6: -1.7215694164, V7: 0.2041802038, V8: 0.6243971903, V9: -0.4327469485, V10: -1.3211802717, V11: -0.0292813264, V12: -0.5741826728, V13: -0.1547527815, V14: -2.959731791, V15: 1.0745367978, V16: 1.2129659535, V17: 2.9823417602, V18: 1.7575614597, V19: -0.2629057009, V20: 0.0077845739, V21: -0.1278389002, V22: -0.3156699944, V23: 0.1422016098, V24: -0.4719942189, V25: -0.3005852615, V26: -0.3600497469, V27: 0.1101939874, V28: -0.0546565143, Amount: 1.29 },
  },
  {
    id: "suspicious",
    label: "Suspicious",
    description: "Real dataset transaction selected near a 0.70 model score.",
    transaction: { Time: 22385, V1: 1.2848208432, V2: 1.2958885366, V3: -1.6828793568, V4: 1.748093744, V5: 1.0242556053, V6: -1.5339036611, V7: 0.5746920078, V8: -0.3530848351, V9: 1.0918211169, V10: -1.8775306199, V11: 1.0759934662, V12: -3.9232351354, V13: 0.1389401632, V14: -1.6851384661, V15: 0.5290084764, V16: 1.2197126655, V17: 3.341487433, V18: 1.9469997685, V19: -0.8434352384, V20: -0.1565806544, V21: -0.4103835619, V22: -0.9019919172, V23: -0.2408711507, V24: -0.5403294945, V25: 0.8519123204, V26: -0.297040483, V27: 0.0031006787, V28: 0.0823823232, Amount: 1 },
  },
  {
    id: "high",
    label: "High Risk",
    description: "Real dataset fraud transaction selected for a high model score.",
    transaction: { Time: 406, V1: -2.3122265423, V2: 1.9519920106, V3: -1.6098507323, V4: 3.9979055875, V5: -0.5221878647, V6: -1.4265453192, V7: -2.5373873062, V8: 1.3916572483, V9: -2.7700892772, V10: -2.7722721447, V11: 3.2020332071, V12: -2.8999073885, V13: -0.5952218813, V14: -4.2892537824, V15: 0.3897241203, V16: -1.1407471798, V17: -2.8300556745, V18: -0.0168224682, V19: 0.416955705, V20: 0.1269105591, V21: 0.5172323709, V22: -0.0350493686, V23: -0.4652110762, V24: 0.3201981985, V25: 0.0445191675, V26: 0.1778397983, V27: 0.2611450026, V28: -0.1432758747, Amount: 0 },
  },
];
