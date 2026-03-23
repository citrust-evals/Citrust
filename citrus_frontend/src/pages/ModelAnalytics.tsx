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
  Radar,
} from "recharts";
import { TrendingUp, Zap, Target, Brain, Activity } from "lucide-react";

const COLORS = ["#42A5F5", "#C4FF61", "#FF9F43", "#A855F7", "#4CAF50"];

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
    const scores: Record<string, { f1: number[], bleu: number[], rouge: number[], latency: number[], total_tests: number, pass_rate: number[] }> = {};
    
    campaigns.forEach(campaign => {
      if (campaign.model_scores) {
        Object.entries(campaign.model_scores).forEach(([modelName, score]) => {
          if (!scores[modelName]) {
            scores[modelName] = { f1: [], bleu: [], rouge: [], latency: [], total_tests: 0, pass_rate: [] };
          }
          if (score.metric_averages) {
            if (score.metric_averages.f1_score !== undefined) scores[modelName].f1.push(score.metric_averages.f1_score);
            if (score.metric_averages.bleu_1 !== undefined) scores[modelName].bleu.push(score.metric_averages.bleu_1);
            if (score.metric_averages.rouge_1 !== undefined) scores[modelName].rouge.push(score.metric_averages.rouge_1);
          }
          if (score.avg_latency_ms !== undefined) scores[modelName].latency.push(score.avg_latency_ms);
          if (score.pass_rate !== undefined) scores[modelName].pass_rate.push(score.pass_rate);
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
      latency: Number(averageArray(data.latency).toFixed(2)),
      pass_rate: Number((averageArray(data.pass_rate) * 100).toFixed(1)),
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

  // Summary stats
  const totalModels = chartData.length;
  const avgLatency = chartData.length > 0 ? (chartData.reduce((sum, d) => sum + d.latency, 0) / chartData.length).toFixed(2) : '0';
  const totalTests = chartData.reduce((sum, d) => sum + d.total_tests, 0);
  const avgPassRate = chartData.length > 0 ? (chartData.reduce((sum, d) => sum + d.pass_rate, 0) / chartData.length).toFixed(1) : '0';

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="p-2.5 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(196, 255, 97, 0.2), rgba(196, 255, 97, 0.1))',
                border: '1px solid rgba(196, 255, 97, 0.3)',
              }}
            >
              <Activity size={24} className="text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-white font-mono tracking-tight">Model Analytics</h1>
          </div>
          <p className="text-gray-400">Comprehensive performance metrics across all evaluated models</p>
        </div>
        
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-gray-400 font-mono">Loading analytics...</span>
            </div>
          </div>
        ) : error ? (
          <div
            className="p-6 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05))',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <p className="text-red-400 font-mono">{error}</p>
          </div>
        ) : chartData.length === 0 ? (
          <div
            className="p-8 rounded-2xl text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Brain size={48} className="mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-bold text-white mb-2">No Data Available</h3>
            <p className="text-gray-400">Run some evaluation campaigns to see analytics here.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Summary Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Models Evaluated */}
              <div
                className="relative p-6 rounded-2xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(66, 165, 245, 0.08), rgba(66, 165, 245, 0.03))',
                  border: '1px solid rgba(66, 165, 245, 0.3)',
                }}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-blue-400/80 uppercase tracking-widest font-mono">Models</span>
                    <Brain size={18} className="text-blue-400" />
                  </div>
                  <div className="text-4xl font-black text-blue-400 mb-1 font-mono tracking-tighter">
                    {totalModels}
                  </div>
                  <div className="text-xs text-gray-400 font-mono">Evaluated</div>
                </div>
              </div>

              {/* Total Tests */}
              <div
                className="relative p-6 rounded-2xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(196, 255, 97, 0.08), rgba(196, 255, 97, 0.03))',
                  border: '1px solid rgba(196, 255, 97, 0.3)',
                }}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-primary/80 uppercase tracking-widest font-mono">Total Tests</span>
                    <Target size={18} className="text-primary" />
                  </div>
                  <div className="text-4xl font-black text-primary mb-1 font-mono tracking-tighter">
                    {totalTests.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400 font-mono">Completed</div>
                </div>
              </div>

              {/* Avg Pass Rate */}
              <div
                className="relative p-6 rounded-2xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.03))',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                }}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-400/10 to-transparent rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-green-400/80 uppercase tracking-widest font-mono">Avg Pass Rate</span>
                    <TrendingUp size={18} className="text-green-400" />
                  </div>
                  <div className="text-4xl font-black text-green-400 mb-1 font-mono tracking-tighter">
                    {avgPassRate}%
                  </div>
                  <div className="text-xs text-gray-400 font-mono">Across Models</div>
                </div>
              </div>

              {/* Avg Latency */}
              <div
                className="relative p-6 rounded-2xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 159, 67, 0.08), rgba(255, 159, 67, 0.03))',
                  border: '1px solid rgba(255, 159, 67, 0.3)',
                }}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-400/10 to-transparent rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-orange-400/80 uppercase tracking-widest font-mono">Avg Latency</span>
                    <Zap size={18} className="text-orange-400" />
                  </div>
                  <div className="text-4xl font-black text-orange-400 mb-1 font-mono tracking-tighter">
                    {avgLatency}<span className="text-lg">ms</span>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">Response Time</div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Bar Chart: Latency */}
              <div
                className="p-6 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <h2 className="text-lg font-bold mb-6 text-white flex items-center gap-2 font-mono">
                  <Zap size={20} className="text-orange-400" />
                  Average Latency (ms)
                </h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="modelName" stroke="#ffffff60" fontSize={12} fontFamily="monospace" />
                      <YAxis stroke="#ffffff60" fontSize={12} fontFamily="monospace" />
                      <Tooltip 
                        cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} 
                        contentStyle={{ 
                          backgroundColor: '#0d1117', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '12px', 
                          color: '#fff',
                          fontFamily: 'monospace',
                        }} 
                      />
                      <Legend wrapperStyle={{ fontFamily: 'monospace' }} />
                      <Bar dataKey="latency" fill="#FF9F43" name="Latency (ms)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Radar Chart: Evaluation Metrics */}
              <div
                className="p-6 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <h2 className="text-lg font-bold mb-6 text-white flex items-center gap-2 font-mono">
                  <Target size={20} className="text-primary" />
                  Quality Metrics Comparison
                </h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.15)" />
                      <PolarAngleAxis dataKey="metric" stroke="#ffffff80" fontSize={12} fontFamily="monospace" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.2)" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0d1117', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '12px', 
                          color: '#fff',
                          fontFamily: 'monospace',
                        }} 
                      />
                      <Legend wrapperStyle={{ fontFamily: 'monospace' }} />
                      {chartData.map((model, i) => (
                        <Radar
                          key={model.modelName}
                          name={model.modelName}
                          dataKey={model.modelName}
                          stroke={COLORS[i % COLORS.length]}
                          fill={COLORS[i % COLORS.length]}
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                      ))}
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bar Chart: Quality Metrics side-by-side */}
            <div
              className="p-6 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <h2 className="text-lg font-bold mb-6 text-white flex items-center gap-2 font-mono">
                <TrendingUp size={20} className="text-blue-400" />
                Model Scores Breakdown
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="modelName" stroke="#ffffff60" fontSize={12} fontFamily="monospace" />
                    <YAxis stroke="#ffffff60" domain={[0, 1]} fontSize={12} fontFamily="monospace" />
                    <Tooltip 
                      cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} 
                      contentStyle={{ 
                        backgroundColor: '#0d1117', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: '12px', 
                        color: '#fff',
                        fontFamily: 'monospace',
                      }} 
                    />
                    <Legend wrapperStyle={{ fontFamily: 'monospace' }} />
                    <Bar dataKey="f1_score" fill="#42A5F5" name="F1 Score" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="bleu_1" fill="#C4FF61" name="BLEU-1" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="rouge_1" fill="#A855F7" name="ROUGE-1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Model Performance Table */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className="p-6" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                  <Brain size={20} className="text-purple-400" />
                  Model Performance Summary
                </h2>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Model</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider font-mono text-center">Pass Rate</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider font-mono text-center">F1 Score</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider font-mono text-center">BLEU-1</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider font-mono text-center">ROUGE-1</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider font-mono text-center">Latency</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider font-mono text-center">Tests</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {chartData.map((model, idx) => (
                    <tr key={model.modelName} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-white font-bold font-mono flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        {model.modelName}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`font-mono font-bold ${
                          model.pass_rate >= 80 ? 'text-green-400' : 
                          model.pass_rate >= 60 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {model.pass_rate}%
                        </span>
                      </td>
                      <td className="p-4 text-center text-blue-400 font-mono">{model.f1_score}</td>
                      <td className="p-4 text-center text-primary font-mono">{model.bleu_1}</td>
                      <td className="p-4 text-center text-purple-400 font-mono">{model.rouge_1}</td>
                      <td className="p-4 text-center text-orange-400 font-mono">{model.latency}ms</td>
                      <td className="p-4 text-center text-gray-400 font-mono">{model.total_tests.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelAnalytics;
