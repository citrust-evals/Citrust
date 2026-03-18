import React, { useEffect, useState } from "react";
import { fetchCampaigns, type Campaign } from "../api_evaluations";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";

const COLORS = ["#42A5F5", "#C4FF61", "#FF9F43", "#EF5350", "#4CAF50"];

const ModelAnalytics: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { campaigns } = await fetchCampaigns();
        setCampaigns(campaigns.filter(c => c.status === "completed"));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Aggregate model scores across completed campaigns
  const aggregateModelScores = () => {
    const scores: Record<string, { f1: number[], bleu: number[], rouge: number[], latency: number[], total_tests: number }> = {};
    
    campaigns.forEach(campaign => {
      if (campaign.model_scores) {
        Object.entries(campaign.model_scores).forEach(([modelName, score]) => {
          if (!scores[modelName]) {
            scores[modelName] = { f1: [], bleu: [], rouge: [], latency: [], total_tests: 0 };
          }
          if (score.metric_averages) {
            if (score.metric_averages.f1_score !== undefined) scores[modelName].f1.push(score.metric_averages.f1_score);
            if (score.metric_averages.bleu_1 !== undefined) scores[modelName].bleu.push(score.metric_averages.bleu_1);
            if (score.metric_averages.rouge_1 !== undefined) scores[modelName].rouge.push(score.metric_averages.rouge_1);
          }
          if (score.avg_latency_ms !== undefined) scores[modelName].latency.push(score.avg_latency_ms);
          scores[modelName].total_tests += score.total_tests;
        });
      }
    });

    const averageArray = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return Object.entries(scores).map(([modelName, data]) => ({
      modelName,
      f1_score: Number(averageArray(data.f1).toFixed(3)),
      bleu_1: Number(averageArray(data.bleu).toFixed(3)),
      rouge_1: Number(averageArray(data.rouge).toFixed(3)),
      latency: Number(averageArray(data.latency).toFixed(0)),
      total_tests: data.total_tests
    }));
  };

  const chartData = aggregateModelScores();

  // Radar chart formatting
  const radarData = chartData.length > 0 ? [
    { metric: "F1 Score", ...Object.fromEntries(chartData.map(d => [d.modelName, d.f1_score * 100])) },
    { metric: "BLEU-1", ...Object.fromEntries(chartData.map(d => [d.modelName, d.bleu_1 * 100])) },
    { metric: "ROUGE-1", ...Object.fromEntries(chartData.map(d => [d.modelName, d.rouge_1 * 100])) },
  ] : [];

  return (
    <div className="max-w-content mx-auto py-8 px-4 h-full overflow-y-auto">
      <h1 className="text-3xl font-display font-bold mb-6 text-primary">Model Analytics</h1>
      
      {loading ? (
        <div className="h-32 flex items-center justify-center text-slate-400">Loading metrics...</div>
      ) : error ? (
        <div className="h-32 flex items-center justify-center text-error">{error}</div>
      ) : chartData.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-slate-400">No completed campaigns data available. Run some evaluations first!</div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Bar Chart: Latency */}
            <div className="card p-6 rounded-card shadow-card">
              <h2 className="text-lg font-bold mb-4 text-primary">Average Latency (ms)</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="modelName" stroke="#ffffff80" />
                    <YAxis stroke="#ffffff80" />
                    <Tooltip cursor={{fill: 'rgba(255, 255, 255, 0.1)'}} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Legend />
                    <Bar dataKey="latency" fill="#FF9F43" name="Latency (ms)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radar Chart: Evaluation Metrics */}
            <div className="card p-6 rounded-card shadow-card">
              <h2 className="text-lg font-bold mb-4 text-primary">Quality Metrics (0-100 Scale)</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#ffffff40" />
                    <PolarAngleAxis dataKey="metric" stroke="#ffffff80" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#ffffff40" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Legend />
                    {chartData.map((model, i) => (
                      <Radar
                        key={model.modelName}
                        name={model.modelName}
                        dataKey={model.modelName}
                        stroke={COLORS[i % COLORS.length]}
                        fill={COLORS[i % COLORS.length]}
                        fillOpacity={0.5}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bar Chart: Quality Metrics side-by-side */}
          <div className="card p-6 rounded-card shadow-card">
            <h2 className="text-lg font-bold mb-4 text-primary">Model Scores Breakdown</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="modelName" stroke="#ffffff80" />
                  <YAxis stroke="#ffffff80" domain={[0, 1]} />
                  <Tooltip cursor={{fill: 'rgba(255, 255, 255, 0.1)'}} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                  <Legend />
                  <Bar dataKey="f1_score" fill="#42A5F5" name="F1 Score" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="bleu_1" fill="#C4FF61" name="BLEU-1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rouge_1" fill="#EF5350" name="ROUGE-1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelAnalytics;
