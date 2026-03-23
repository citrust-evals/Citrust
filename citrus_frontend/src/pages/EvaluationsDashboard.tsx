import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchCampaigns,
  fetchTestSets,
  createTestSet,
  updateTestSet,
  fetchStats,
  fetchAvailableModels,
  fetchCampaign,
  createCampaign,
  runEvaluation,
  compareModels,
  seedSampleData,
  type Campaign,
  type TestSet,
  type AvailableModel,
  type Stats,
} from '../api_evaluations';
import { getTraces, evaluateTrace } from '../api';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/UIComponents';
import { usePrivacy } from '../context/PrivacyContext';
import { Shield } from 'lucide-react';

// Private Eval Result Type
interface PrivateEvalResult {
  modelName: string;
  traceId: string;
  safety: {
    score: number;
    reasoning: string;
  };
  quality: {
    score: number;
    dimensions: {
      accuracy: number;
      relevance: number;
      coherence: number;
      completeness: number;
    };
    reasoning: string;
  };
  evaluatedAt: string;
}

type TabType = 'overview' | 'campaigns' | 'test-sets' | 'compare';

const EvaluationsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [testSets, setTestSets] = useState<TestSet[]>([]);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedTestSet, setSelectedTestSet] = useState<TestSet | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runningCampaignId, setRunningCampaignId] = useState<string | null>(null);
  const [seedingData, setSeedingData] = useState(false);
  const [isCreatingTestSet, setIsCreatingTestSet] = useState(false);

  // VaultGemma Integration
  const { isPrivacyModeEnabled, activeCampaignID, setActiveCampaign } = usePrivacy();
  const [runningPrivateEval, setRunningPrivateEval] = useState(false);
  const [showPrivateEvalPanel, setShowPrivateEvalPanel] = useState(false);
  const [selectedPrivateEvalModel, setSelectedPrivateEvalModel] = useState<string>('');
  const [privateEvalResult, setPrivateEvalResult] = useState<PrivateEvalResult | null>(null);
  const [privateEvalError, setPrivateEvalError] = useState<string | null>(null);

  const handleRunPrivateEval = async (modelName?: string) => {
    const model = modelName || selectedPrivateEvalModel;
    if (!model) return;
    
    setRunningPrivateEval(true);
    setPrivateEvalError(null);
    
    try {
      // Step 1: Fetch recent traces to evaluate
      const tracesResult = await getTraces({ limit: 10 });
      const traces = tracesResult.traces || [];
      
      if (traces.length === 0) {
        setPrivateEvalError('No traces available for evaluation. Create some chat traces first.');
        setRunningPrivateEval(false);
        return;
      }
      
      // Step 2: Pick the most recent trace for evaluation
      const traceToEvaluate = traces[0];
      
      // Step 3: Call the evaluate API
      const evalResponse = await evaluateTrace(traceToEvaluate.trace_id);
      
      if (evalResponse.success && evalResponse.data) {
        const result: PrivateEvalResult = {
          modelName: model,
          traceId: evalResponse.data.trace_id,
          safety: {
            score: evalResponse.data.safety.score,
            reasoning: evalResponse.data.safety.reasoning,
          },
          quality: {
            score: evalResponse.data.quality.score,
            dimensions: evalResponse.data.quality.dimensions,
            reasoning: evalResponse.data.quality.reasoning,
          },
          evaluatedAt: evalResponse.data.evaluated_at,
        };
        
        setPrivateEvalResult(result);
        setActiveCampaign(`vaultgemma-eval-${model}-${Date.now()}`);
      } else {
        setPrivateEvalError('Evaluation completed but returned no data');
      }
    } catch (err: any) {
      console.error('Private eval failed:', err);
      setPrivateEvalError(err.message || 'Failed to run private evaluation');
    } finally {
      setRunningPrivateEval(false);
      setShowPrivateEvalPanel(false);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, campaignsData, testSetsData, modelsData] = await Promise.all([
        fetchStats(),
        fetchCampaigns({ limit: 50 }),
        fetchTestSets({ limit: 50 }),
        fetchAvailableModels(),
      ]);
      setStats(statsData);
      setCampaigns(campaignsData.campaigns);
      setTestSets(testSetsData.test_sets);
      setAvailableModels(modelsData);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSeedData = async () => {
    setSeedingData(true);
    try {
      await seedSampleData();
      await loadData();
      setActiveTab('test-sets');
    } catch (err: any) {
      console.error('Failed to seed data:', err);
    } finally {
      setSeedingData(false);
    }
  };

  const handleRunEvaluation = async (campaignId: string) => {
    setIsRunning(true);
    setRunningCampaignId(campaignId);
    try {
      await runEvaluation(campaignId);
      // Poll for completion
      const checkStatus = setInterval(async () => {
        const campaign = await fetchCampaign(campaignId);
        if (campaign.status === 'completed' || campaign.status === 'failed') {
          clearInterval(checkStatus);
          setIsRunning(false);
          setRunningCampaignId(null);
          await loadData();
        }
      }, 2000);
    } catch (err: any) {
      console.error('Failed to run evaluation:', err);
      setIsRunning(false);
      setRunningCampaignId(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard
          title="Total Campaigns"
          value={stats?.total_campaigns || 0}
          icon="campaign"
          color="primary"
        />
        <MetricCard
          title="Test Sets"
          value={stats?.total_test_sets || 0}
          icon="fact_check"
          color="info"
        />
        <MetricCard
          title="Total Traces"
          value={stats?.total_traces || 0}
          icon="insights"
          color="warning"
        />
        <MetricCard
          title="Preferences"
          value={stats?.total_preferences || 0}
          icon="thumb_up"
          color="success"
        />
        <MetricCard
          title="Evaluations"
          value={stats?.total_evaluations || 0}
          icon="assessment"
          color="primary"
        />
      </div>

      {/* Quick Actions */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleSeedData}
            disabled={seedingData}
            className="btn-secondary"
          >
            <span className="material-symbols-outlined text-[18px] mr-2">
              {seedingData ? 'hourglass_empty' : 'add'}
            </span>
            {seedingData ? 'Seeding...' : 'Load Sample Data'}
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className="btn-primary"
          >
            <span className="material-symbols-outlined text-[18px] mr-2">add</span>
            New Campaign
          </button>
          <button
            onClick={() => setActiveTab('test-sets')}
            className="btn-primary"
          >
            <span className="material-symbols-outlined text-[18px] mr-2">add</span>
            New Test Set
          </button>
          {/* VaultGemma Private Eval Button - Opens Panel */}
          <button
            onClick={() => setShowPrivateEvalPanel(!showPrivateEvalPanel)}
            disabled={runningPrivateEval}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              showPrivateEvalPanel 
                ? 'bg-yellow-600 text-black ring-2 ring-yellow-400/50' 
                : 'bg-[#FFB800] hover:bg-yellow-600 text-black'
            }`}
          >
            <Shield size={16} />
            {runningPrivateEval ? 'Running...' : 'Run Private Eval'}
          </button>
        </div>
        
        {/* Private Eval Model Selection Panel */}
        {showPrivateEvalPanel && (
          <div className="mt-4 p-4 rounded-xl border border-[#FFB800]/30 bg-[#FFB800]/5">
            <h4 className="text-sm font-semibold text-[#FFB800] mb-3 flex items-center gap-2">
              <Shield size={16} />
              Select Model for Private Evaluation
            </h4>
            <div className="flex flex-wrap gap-3 mb-4">
              {availableModels.filter(m => m.is_available).map((model) => (
                <button
                  key={model.model_name}
                  type="button"
                  onClick={() => setSelectedPrivateEvalModel(model.model_name)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    selectedPrivateEvalModel === model.model_name
                      ? 'bg-[#FFB800] text-black border-[#FFB800]'
                      : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {model.model_name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleRunPrivateEval()}
                disabled={runningPrivateEval || !selectedPrivateEvalModel}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm bg-[#FFB800] hover:bg-yellow-600 text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Shield size={16} />
                {runningPrivateEval ? 'Anonymizing & Scoring...' : `Run Eval on ${selectedPrivateEvalModel || 'Selected Model'}`}
              </button>
              <button
                onClick={() => setShowPrivateEvalPanel(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delta View - VaultGemma Comparison (Privacy Mode Only) */}
      {isPrivacyModeEnabled && activeCampaignID && privateEvalResult && (
        <div className="glass-panel rounded-2xl p-6 border-2 border-[#FFB800]">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="text-[#FFB800]" size={24} />
            <h3 className="text-xl font-bold text-white">Delta View: {privateEvalResult.modelName} Evaluation</h3>
          </div>
          <p className="text-sm text-gray-400 mb-6">
            <span className="text-[#FFB800] font-bold">Privacy-Preserved Evaluation</span> • Trace ID: <code className="text-xs">{privateEvalResult.traceId}</code>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Safety Score */}
            <div className="glass-panel rounded-lg p-5">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Safety Analysis</div>
              <div className="text-2xl font-bold text-white mb-1">Safety Score</div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className={`text-4xl font-bold ${privateEvalResult.safety.score >= 0.8 ? 'text-green-400' : privateEvalResult.safety.score >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {(privateEvalResult.safety.score * 100).toFixed(0)}%
                </span>
                <span className="text-sm text-gray-400">confidence</span>
              </div>
              <div className="text-xs text-gray-400 line-clamp-3">{privateEvalResult.safety.reasoning}</div>
            </div>
            
            {/* Quality Score */}
            <div className="glass-panel rounded-lg p-5 border-l-4 border-[#FFB800] bg-yellow-500/5">
              <div className="text-xs text-[#FFB800] uppercase tracking-wider mb-2 font-bold">Quality Analysis</div>
              <div className="text-2xl font-bold text-white mb-1">Quality Score</div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold text-[#FFB800]">
                  {(privateEvalResult.quality.score * 100).toFixed(0)}%
                </span>
                <span className="text-sm text-gray-400">overall</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Accuracy:</span>
                  <span className="text-white font-mono">{(privateEvalResult.quality.dimensions.accuracy * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Relevance:</span>
                  <span className="text-white font-mono">{(privateEvalResult.quality.dimensions.relevance * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Coherence:</span>
                  <span className="text-white font-mono">{(privateEvalResult.quality.dimensions.coherence * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Completeness:</span>
                  <span className="text-white font-mono">{(privateEvalResult.quality.dimensions.completeness * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Link to Trace */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-sm text-gray-400 mb-3">
              Evaluated at: <code className="text-[#FFB800] font-mono">{new Date(privateEvalResult.evaluatedAt).toLocaleString()}</code>
            </p>
            <Link 
              to={`/traces?highlight=${privateEvalResult.traceId}`}
              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              View Trace Detail
            </Link>
          </div>
        </div>
      )}

      {/* Error Display for Private Eval */}
      {privateEvalError && (
        <div className="glass-panel rounded-2xl p-6 border-2 border-red-500/50 bg-red-500/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-red-400">error</span>
            <h3 className="text-lg font-bold text-red-400">Evaluation Error</h3>
          </div>
          <p className="text-sm text-gray-300">{privateEvalError}</p>
          <button
            onClick={() => setPrivateEvalError(null)}
            className="mt-4 text-sm text-gray-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Recent Campaigns */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">Recent Campaigns</h3>
        </div>
        {campaigns.length === 0 ? (
          <EmptyState
            icon="campaign"
            title="No Campaigns Yet"
            description="Create your first evaluation campaign to get started"
          />
        ) : (
          <div className="divide-y divide-white/5">
            {campaigns.slice(0, 5).map((campaign) => (
              <div
                key={campaign.id}
                className="p-4 hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedCampaign(campaign);
                  setActiveTab('campaigns');
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">{campaign.name}</h4>
                    <p className="text-sm text-gray-400">
                      {campaign.evaluation_type} • {campaign.model_configs.map(m => m.model_name).join(' vs ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge
                      status={
                        campaign.status === 'completed' ? 'success' :
                        campaign.status === 'running' ? 'running' :
                        campaign.status === 'failed' ? 'error' : 'neutral'
                      }
                    />
                    {campaign.status === 'running' && (
                      <span className="text-sm text-gray-400">
                        {Math.round(campaign.progress)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCampaigns = () => (
    <div className="space-y-6">
      {/* Create Campaign Form */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Create Evaluation Campaign</h3>
        <CreateCampaignForm
          testSets={testSets}
          availableModels={availableModels}
          onCampaignCreated={async (campaign) => {
            await loadData();
            if (campaign) {
              handleRunEvaluation(campaign.id);
            }
          }}
        />
      </div>

      {/* Campaign List */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">All Campaigns</h3>
        </div>
        {campaigns.length === 0 ? (
          <EmptyState
            icon="campaign"
            title="No Campaigns"
            description="Create your first campaign above"
          />
        ) : (
          <div className="divide-y divide-white/5">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onRun={() => handleRunEvaluation(campaign.id)}
                onView={() => setSelectedCampaign(campaign)}
                isRunning={isRunning}
                isThisRunning={runningCampaignId === campaign.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <CampaignDetailModal
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
        />
      )}
    </div>
  );

  const renderTestSets = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">Test Sets</h3>
        <button
          onClick={() => setIsCreatingTestSet(true)}
          className="btn-primary"
        >
          <span className="material-symbols-outlined text-[18px] mr-2">add</span>
          New Test Set
        </button>
      </div>
      
      {isCreatingTestSet && (
        <CreateTestSetForm
          onCreated={(ts) => {
            setIsCreatingTestSet(false);
            if (ts) loadData();
          }}
          onCancel={() => setIsCreatingTestSet(false)}
        />
      )}

      {/* Test Sets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testSets.map((ts) => (
          <TestSetCard
            key={ts.id}
            testSet={ts}
            onSelect={() => setSelectedTestSet(ts)}
          />
        ))}
        {testSets.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon="fact_check"
              title="No Test Sets"
              description="Create a test set to start evaluating models"
            />
          </div>
        )}
      </div>

      {/* Test Set Details Modal */}
      {selectedTestSet && (
        <TestSetDetailModal
          testSet={selectedTestSet}
          onClose={() => setSelectedTestSet(null)}
        />
      )}
    </div>
  );

  const renderCompare = () => (
    <div className="space-y-6">
      <ModelComparison
        testSets={testSets}
        availableModels={availableModels.filter(m => m.is_available)}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" text="Loading evaluations..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <ErrorState error={error} retry={loadData} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Evaluations</h1>
            <p className="text-gray-400">Compare models, run benchmarks, analyze performance</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          {[
            { id: 'overview', label: 'Overview', icon: 'dashboard' },
            { id: 'campaigns', label: 'Campaigns', icon: 'campaign' },
            { id: 'test-sets', label: 'Test Sets', icon: 'fact_check' },
            { id: 'compare', label: 'Compare', icon: 'compare_arrows' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'campaigns' && renderCampaigns()}
        {activeTab === 'test-sets' && renderTestSets()}
        {activeTab === 'compare' && renderCompare()}
      </div>
    </div>
  );
};

// =============================================================================
// Sub-Components
// =============================================================================

interface CreateCampaignFormProps {
  testSets: TestSet[];
  availableModels: AvailableModel[];
  onCampaignCreated: (campaign: Campaign | null) => void;
}

const CreateCampaignForm: React.FC<CreateCampaignFormProps> = ({
  testSets,
  availableModels,
  onCampaignCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [evaluationType, setEvaluationType] = useState<import('../api_evaluations').EvaluationType>('single_model');
  const [selectedTestSetId, setSelectedTestSetId] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !selectedTestSetId || selectedModels.length === 0) return;

    setSubmitting(true);
    try {
      const campaign = await createCampaign({
        name,
        description,
        evaluation_type: evaluationType,
        test_set_id: selectedTestSetId,
        model_configs: selectedModels.map((modelName) => {
          const model = availableModels.find((m) => m.model_name === modelName);
          return {
            model_name: modelName,
            provider: (model?.provider as "google" | "openai" | "anthropic" | "custom") || 'google',
            temperature: 0.7,
            max_tokens: 2000,
            metadata: {},
          };
        }),
        metric_names: ['exact_match', 'f1_score', 'latency'],
      });
      onCampaignCreated(campaign);
    } catch (err) {
      console.error('Failed to create campaign:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Campaign Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Math Benchmark v1"
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Evaluation Type
          </label>
          <select
            value={evaluationType}
            onChange={(e) => setEvaluationType(e.target.value as import('../api_evaluations').EvaluationType)}
            className="input-field"
          >
            <option value="single_model">Single Model</option>
            <option value="side_by_side">Side by Side (A/B)</option>
            <option value="multi_model">Multi-Model</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this evaluation for?"
          className="input-field h-20"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Test Set
          </label>
          <select
            value={selectedTestSetId}
            onChange={(e) => setSelectedTestSetId(e.target.value)}
            className="input-field"
            required
          >
            <option value="">Select a test set</option>
            {testSets.map((ts) => (
              <option key={ts.id} value={ts.id}>
                {ts.name} ({ts.test_cases.length} cases)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Models
          </label>
          <div className="flex flex-wrap gap-2">
            {availableModels.filter(m => m.is_available).map((model) => (
              <button
                key={model.model_name}
                type="button"
                onClick={() => {
                  setSelectedModels((prev) =>
                    prev.includes(model.model_name)
                      ? prev.filter((m) => m !== model.model_name)
                      : [...prev, model.model_name]
                  );
                }}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  selectedModels.includes(model.model_name)
                    ? 'bg-primary text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {model.model_name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || !name || !selectedTestSetId || selectedModels.length === 0}
        className="btn-primary"
      >
        {submitting ? 'Creating...' : 'Create & Run'}
      </button>
    </form>
  );
};

interface CampaignCardProps {
  campaign: Campaign;
  onRun: () => void;
  onView: () => void;
  isRunning: boolean;
  isThisRunning: boolean;
}

const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  onRun,
  onView,
  isRunning,
  isThisRunning,
}) => (
  <div className="p-4 hover:bg-white/5 transition-colors">
    <div className="flex items-center justify-between">
      <div className="flex-1 cursor-pointer" onClick={onView}>
        <h4 className="text-white font-medium">{campaign.name}</h4>
        <p className="text-sm text-gray-400">
          {campaign.evaluation_type} • {campaign.model_configs.map(m => m.model_name).join(' vs ')}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {campaign.total_test_cases} test cases • {campaign.completed_test_cases} completed
        </p>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge
          status={
            campaign.status === 'completed' ? 'success' :
            campaign.status === 'running' ? 'running' :
            campaign.status === 'failed' ? 'error' : 'neutral'
          }
        />
        {campaign.status === 'draft' && (
          <button
            onClick={onRun}
            disabled={isRunning}
            className="btn-primary btn-sm"
          >
            {isThisRunning ? 'Running...' : 'Run'}
          </button>
        )}
        {campaign.status === 'running' && (
          <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${campaign.progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  </div>
);

interface TestSetCardProps {
  testSet: TestSet;
  onSelect: () => void;
}

const TestSetCard: React.FC<TestSetCardProps> = ({ testSet, onSelect }) => (
  <div
    className="glass-panel rounded-2xl p-6 cursor-pointer hover:border-primary/50 transition-colors"
    onClick={onSelect}
  >
    <h4 className="text-white font-medium mb-2">{testSet.name}</h4>
    <p className="text-sm text-gray-400 mb-4 line-clamp-2">
      {testSet.description || 'No description'}
    </p>
    <div className="flex items-center justify-between">
      <span className="badge-neutral">
        {testSet.test_cases.length} cases
      </span>
      <div className="flex gap-1">
        {testSet.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-1 bg-white/10 rounded"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  </div>
);

interface CampaignDetailModalProps {
  campaign: Campaign;
  onClose: () => void;
}

const CampaignDetailModal: React.FC<CampaignDetailModalProps> = ({
  campaign,
  onClose,
}) => {
  const [campaignData, setCampaignData] = useState(campaign);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (campaignData.status === 'running') {
        try {
          const updated = await fetchCampaign(campaign.id);
          setCampaignData(updated);
        } catch (e) {
          console.error(e);
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [campaign.id, campaignData.status]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden animate-fadeInUp"
        style={{
          background: 'linear-gradient(135deg, #0a0e14 0%, #1a1f2e 50%, #0f1419 100%)',
          border: '2px solid rgba(196, 255, 97, 0.2)',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6), 0 0 100px rgba(196, 255, 97, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative px-8 py-6 border-b"
          style={{
            background: 'linear-gradient(180deg, rgba(196, 255, 97, 0.05) 0%, rgba(0, 0, 0, 0.2) 100%)',
            borderBottom: '1px solid rgba(196, 255, 97, 0.2)',
          }}
        >
          {/* Decorative corner brackets */}
          <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-primary/40" />
          <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-primary/40" />
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white font-mono tracking-tight">{campaignData.name}</h2>
                <StatusBadge
                  status={
                    campaignData.status === 'completed' ? 'success' :
                    campaignData.status === 'running' ? 'running' :
                    campaignData.status === 'failed' ? 'error' : 'neutral'
                  }
                />
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 font-mono">ID: {campaignData.id.slice(0, 8)}...</span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-400 font-mono">{campaignData.evaluation_type}</span>
                <span className="text-gray-600">•</span>
                <span className="text-primary font-mono">{campaignData.model_configs.map(m => m.model_name).join(' vs ')}</span>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2.5 rounded-xl hover:bg-white/10 transition-all duration-200 text-gray-400 hover:text-white border border-transparent hover:border-white/20"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Progress (Running) */}
          {campaignData.status === 'running' && (
            <div
              className="p-6 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(37, 99, 235, 0.03))',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-blue-400 uppercase tracking-wider font-mono">Progress</span>
                <span className="text-2xl font-bold text-blue-400 font-mono">{Math.round(campaignData.progress)}%</span>
              </div>
              <div className="h-4 bg-blue-500/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                  style={{ width: `${campaignData.progress}%` }}
                />
              </div>
              <div className="mt-3 text-sm text-gray-400 font-mono">
                {campaignData.completed_test_cases} / {campaignData.total_test_cases} test cases completed
              </div>
            </div>
          )}

          {/* Model Scores */}
          {campaignData.status === 'completed' && Object.keys(campaignData.model_scores).length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 font-mono">
                <span className="material-symbols-outlined text-primary">assessment</span>
                Model Results
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(campaignData.model_scores).map(([modelName, scores]) => (
                  <div
                    key={modelName}
                    className="relative p-6 rounded-2xl overflow-hidden group hover:scale-[1.01] transition-transform duration-300"
                    style={{
                      background: 'linear-gradient(135deg, rgba(196, 255, 97, 0.05), rgba(196, 255, 97, 0.02))',
                      border: '1px solid rgba(196, 255, 97, 0.2)',
                    }}
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl" />
                    <h4 className="text-xl font-bold text-white mb-4 font-mono">{modelName}</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm font-mono">Pass Rate</span>
                        <span className="text-2xl font-bold text-primary font-mono">
                          {(scores.pass_rate * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-green-400"
                          style={{ width: `${scores.pass_rate * 100}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-mono">Passed</div>
                          <div className="text-lg font-bold text-green-400 font-mono">{scores.passed_tests}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-mono">Total</div>
                          <div className="text-lg font-bold text-white font-mono">{scores.total_tests}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-mono">Avg Latency</div>
                          <div className="text-lg font-bold text-blue-400 font-mono">{Math.round(scores.avg_latency_ms * 100) / 100}ms</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-mono">Avg Score</div>
                          <div className="text-lg font-bold text-yellow-400 font-mono">{scores.avg_score?.toFixed(2) || 'N/A'}</div>
                        </div>
                      </div>
                      {scores.metric_averages && Object.keys(scores.metric_averages).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                          {Object.entries(scores.metric_averages).map(([mName, mVal]) => (
                            <div key={mName} className="flex justify-between">
                              <span className="text-gray-400 text-sm capitalize font-mono">{mName.replace('_', ' ')}</span>
                              <span className="text-white font-mono">{(mVal as number).toFixed(3)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {campaignData.error_message && (
            <div
              className="p-6 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05))',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-red-400">error</span>
                <span className="text-sm font-bold text-red-400 uppercase tracking-wider font-mono">Error</span>
              </div>
              <p className="text-red-300 font-mono">{campaignData.error_message}</p>
            </div>
          )}

          {/* Test Case Results Table */}
          {campaignData.status === 'completed' && campaignData.results && campaignData.results.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 font-mono">
                <span className="material-symbols-outlined text-blue-400">format_list_bulleted</span>
                Detailed Results ({campaignData.results.length} cases)
              </h3>
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Test Case</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Model</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Expected</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Response</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider font-mono text-center">Status</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider font-mono text-center">Metrics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {campaignData.results.map((res: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-sm text-white font-medium font-mono max-w-[150px] truncate" title={res.test_case_name || 'Test Case'}>
                          {res.test_case_name || `Case ${idx + 1}`}
                        </td>
                        <td className="p-4 text-sm text-gray-300 font-mono">
                          {res.model_name}
                        </td>
                        <td className="p-4 text-sm text-gray-300 font-mono max-w-[200px] truncate" title={res.expected_response || '-'}>
                          {res.expected_response || '-'}
                        </td>
                        <td className="p-4 text-sm text-white font-mono max-w-[300px] truncate" title={res.model_response || '-'}>
                          {res.model_response || '-'}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                            res.passed 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            <span className="material-symbols-outlined text-[14px]">
                              {res.passed ? 'check_circle' : 'cancel'}
                            </span>
                            {res.passed ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-400">
                          {res.metric_scores && res.metric_scores.length > 0 ? (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {res.metric_scores.map((m: any, i: number) => (
                                <span key={i} className="text-[10px] px-2 py-1 bg-white/10 rounded-lg font-mono" title={`${m.metric_name}: ${m.score}`}>
                                  {m.metric_name}: {typeof m.score === 'number' ? m.score.toFixed(2) : m.score}
                                </span>
                              ))}
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface TestSetDetailModalProps {
  testSet: TestSet;
  onClose: () => void;
}

const TestSetDetailModal: React.FC<TestSetDetailModalProps> = ({
  testSet: initialTestSet,
  onClose,
}) => {
  const [testSet, setTestSet] = useState(initialTestSet);
  const [isAddingCase, setIsAddingCase] = useState(false);
  const [newPrompt, setNewPrompt] = useState('');
  const [newExpected, setNewExpected] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddCase = async () => {
    if (!newPrompt.trim()) return;
    setIsSaving(true);
    try {
      const newCase = {
        id: crypto.randomUUID(),
        name: 'Test Case ' + (testSet.test_cases.length + 1),
        description: '',
        input: { prompt: newPrompt },
        output: { expected_response: newExpected },
        tags: [],
        difficulty: 'medium' as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const updated = {
        ...testSet,
        test_cases: [...testSet.test_cases, newCase]
      };
      
      const saved = await updateTestSet(testSet.id, updated);
      setTestSet(saved);
      setIsAddingCase(false);
      setNewPrompt('');
      setNewExpected('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
    onClick={onClose}
  >
    <div
      className="glass-panel rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-6 border-b border-white/10 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">{testSet.name}</h2>
          <p className="text-gray-400">{testSet.description}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
      </div>

      <div className="p-6">
        <div className="flex gap-2 mb-4">
          {testSet.tags.map((tag) => (
            <span key={tag} className="badge-neutral">{tag}</span>
          ))}
        </div>

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">Test Cases ({testSet.test_cases.length})</h3>
          <button onClick={() => setIsAddingCase(true)} className="btn-secondary text-sm py-1 px-3">
            <span className="material-symbols-outlined text-[16px] mr-1">add</span> Add Case
          </button>
        </div>
        
        {isAddingCase && (
          <div className="bg-background-dark rounded-xl p-4 border border-primary/30 mb-4 space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Prompt</label>
              <textarea 
                value={newPrompt} 
                onChange={e => setNewPrompt(e.target.value)}
                className="input-field w-full text-sm py-2" rows={2}
                placeholder="Enter user prompt"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Expected Response (Optional)</label>
              <textarea 
                value={newExpected} 
                onChange={e => setNewExpected(e.target.value)}
                className="input-field w-full text-sm py-2" rows={2}
                placeholder="Enter expected response"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsAddingCase(false)} className="text-gray-400 hover:text-white text-sm px-3">Cancel</button>
              <button onClick={handleAddCase} disabled={isSaving || !newPrompt.trim()} className="btn-primary py-1 px-4 text-sm">
                {isSaving ? 'Saving...' : 'Save Case'}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {testSet.test_cases.map((tc, idx) => (
            <div key={tc.id || idx} className="glass-panel rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-white font-medium">{tc.name}</h4>
                <span className="badge-neutral text-xs">{tc.difficulty}</span>
              </div>
              <p className="text-gray-400 text-sm mb-2">{tc.description}</p>
              <div className="bg-white/5 rounded p-3">
                <p className="text-xs text-gray-500 mb-1">Input:</p>
                <p className="text-white text-sm">{tc.input.prompt}</p>
              </div>
              {tc.output?.expected_response && (
                <div className="bg-primary/5 rounded p-3 mt-2">
                  <p className="text-xs text-gray-500 mb-1">Expected:</p>
                  <p className="text-primary text-sm">{tc.output.expected_response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
  );
};

interface ModelComparisonProps {
  testSets: TestSet[];
  availableModels: AvailableModel[];
}

const ModelComparison: React.FC<ModelComparisonProps> = ({
  testSets,
  availableModels,
}) => {
  const [selectedTestSetId, setSelectedTestSetId] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [results, setResults] = useState<any>(null);
  const [comparing, setComparing] = useState(false);

  const handleCompare = async () => {
    if (!selectedTestSetId || selectedModels.length < 2) return;

    setComparing(true);
    try {
      const comparison = await compareModels({
        test_set_id: selectedTestSetId,
        models: selectedModels.map((modelName) => ({
          model_name: modelName,
          provider: 'google',
          temperature: 0.7,
          max_tokens: 2000,
          metadata: {},
        })),
      });
      setResults(comparison);
    } catch (err) {
      console.error('Failed to compare models:', err);
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Compare Models</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Test Set
            </label>
            <select
              value={selectedTestSetId}
              onChange={(e) => setSelectedTestSetId(e.target.value)}
              className="input-field"
            >
              <option value="">Select a test set</option>
              {testSets.map((ts) => (
                <option key={ts.id} value={ts.id}>
                  {ts.name} ({ts.test_cases.length} cases)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Select Models (min 2)
            </label>
            <div className="flex flex-wrap gap-2">
              {availableModels.map((model) => (
                <button
                  key={model.model_name}
                  type="button"
                  onClick={() => {
                    setSelectedModels((prev) =>
                      prev.includes(model.model_name)
                        ? prev.filter((m) => m !== model.model_name)
                        : [...prev, model.model_name]
                    );
                  }}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    selectedModels.includes(model.model_name)
                      ? 'bg-primary text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {model.model_name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleCompare}
          disabled={comparing || !selectedTestSetId || selectedModels.length < 2}
          className="btn-primary"
        >
          {comparing ? 'Comparing...' : 'Compare Models'}
        </button>
      </div>

      {results && (
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Results</h3>
            {results.winner && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Winner:</span>
                <span className="text-primary font-bold">{results.winner}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(results.model_scores).map(([modelName, scores]: [string, any]) => (
              <div
                key={modelName}
                className={`glass-panel rounded-lg p-4 ${
                  results.winner === modelName ? 'border-2 border-primary' : ''
                }`}
              >
                <h4 className="text-white font-medium mb-4">{modelName}</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pass Rate</span>
                    <span className="text-primary font-bold">
                      {(scores.pass_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Passed</span>
                    <span className="text-white">
                      {scores.passed_tests} / {scores.total_tests}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Latency</span>
                    <span className="text-white">{Math.round(scores.avg_latency_ms * 100) / 100}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Tokens</span>
                    <span className="text-white">{scores.total_tokens.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationsDashboard;

// =============================================================================
// Test Set Creation Form
// =============================================================================
interface CreateTestSetFormProps {
  onCreated: (testSet: TestSet | null) => void;
  onCancel: () => void;
}

const CreateTestSetForm: React.FC<CreateTestSetFormProps> = ({ onCreated, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const ts = await createTestSet({
        name,
        description,
        test_cases: [],
        tags: [],
        is_public: false,
        metadata: {}
      });
      onCreated(ts);
    } catch (err) {
      console.error(err);
      onCreated(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl mb-6">
      <h3 className="text-xl font-bold text-white mb-4">Create New Test Set</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            required
            placeholder="e.g. Math Word Problems"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
            rows={3}
            placeholder="Describe the purpose of this test set"
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
};
