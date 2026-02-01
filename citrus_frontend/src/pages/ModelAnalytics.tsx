import React, { useEffect, useState } from "react";
import { fetchAnalytics, type AnalyticsData } from "../api_analytics";

const COLORS = ["#C4FF61", "#42A5F5", "#FF9F43", "#EF5350", "#4CAF50"];

const ModelAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const analytics = await fetchAnalytics();
        setData(analytics);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Pie chart for class balance (SVG, simple)
  function ClassBalancePie({ balance }: { balance: Record<string, number> }) {
    const total = Object.values(balance).reduce((a, b) => a + b, 0);
    let acc = 0;
    const arcs = Object.entries(balance).map(([label, value], i) => {
      const start = acc / total * 2 * Math.PI;
      acc += value;
      const end = acc / total * 2 * Math.PI;
      const x1 = 50 + 40 * Math.sin(start);
      const y1 = 50 - 40 * Math.cos(start);
      const x2 = 50 + 40 * Math.sin(end);
      const y2 = 50 - 40 * Math.cos(end);
      const large = end - start > Math.PI ? 1 : 0;
      return (
        <path
          key={label}
          d={`M50,50 L${x1},${y1} A40,40 0 ${large} 1 ${x2},${y2} Z`}
          fill={COLORS[i % COLORS.length]}
          opacity={0.8}
        >
          <title>{label}: {value}%</title>
        </path>
      );
    });
    return (
      <svg width={120} height={120} viewBox="0 0 100 100">
        {arcs}
      </svg>
    );
  }

  return (
    <div className="max-w-content mx-auto py-8 px-4">
      <h1 className="text-3xl font-display font-bold mb-6 text-primary">Model Analytics</h1>
      <div className="flex flex-wrap gap-6 mb-8">
        {data && (
          <>
            <div className="card p-6 rounded-card shadow-card min-w-[180px]">
              <div className="text-2xl font-bold text-primary">{data.accuracy}%</div>
              <div className="text-sm text-white/70">Accuracy</div>
            </div>
            <div className="card p-6 rounded-card shadow-card min-w-[180px]">
              <div className="text-2xl font-bold text-info">{data.f1_score}</div>
              <div className="text-sm text-white/70">F1 Score</div>
            </div>
            <div className="card p-6 rounded-card shadow-card min-w-[180px]">
              <div className="text-2xl font-bold text-warning">{data.latency}ms</div>
              <div className="text-sm text-white/70">Latency (P99)</div>
            </div>
            <div className="card p-6 rounded-card shadow-card min-w-[180px]">
              <div className="text-2xl font-bold text-error">{data.error_rate}%</div>
              <div className="text-sm text-white/70">Error Rate</div>
            </div>
          </>
        )}
      </div>
      <div className="card p-6 rounded-card shadow-card mb-8">
        {loading ? (
          <div className="h-32 flex items-center justify-center text-slate-400">Loading...</div>
        ) : error ? (
          <div className="h-32 flex items-center justify-center text-error">{error}</div>
        ) : data ? (
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div>
              <h2 className="text-lg font-bold mb-2 text-primary">Class Balance</h2>
              <ClassBalancePie balance={data.class_balance} />
              <div className="flex gap-2 mt-2 flex-wrap">
                {Object.entries(data.class_balance).map(([label, value], i) => (
                  <span key={label} className="flex items-center gap-1 text-xs font-bold" style={{ color: COLORS[i % COLORS.length] }}>
                    <span className="inline-block w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }}></span>
                    {label} ({value}%)
                  </span>
                ))}
              </div>
            </div>
            {data.drift_detected && (
              <div className="mt-4 p-3 rounded-lg bg-error/10 text-error font-bold flex items-center gap-2">
                <span>⚠️</span> Data Drift Detected
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ModelAnalytics;
