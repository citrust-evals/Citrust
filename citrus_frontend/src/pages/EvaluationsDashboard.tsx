import React, { useState, useEffect, useCallback } from 'react';
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
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/UIComponents';

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
        </div>
      </div>

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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/10 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{campaignData.name}</h2>
            <StatusBadge
              status={
                campaignData.status === 'completed' ? 'success' :
                campaignData.status === 'running' ? 'running' :
                campaignData.status === 'failed' ? 'error' : 'neutral'
              }
            />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Progress */}
          {campaignData.status === 'running' && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Progress</span>
                <span className="text-white">{Math.round(campaignData.progress)}%</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${campaignData.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Model Scores */}
          {campaignData.status === 'completed' && Object.keys(campaignData.model_scores).length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(campaignData.model_scores).map(([modelName, scores]) => (
                  <div key={modelName} className="glass-panel rounded-lg p-4">
                    <h4 className="text-white font-medium mb-2">{modelName}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Pass Rate</span>
                        <span className="text-primary">
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
                        <span className="text-white">
                          {scores.avg_latency_ms.toFixed(0)}ms
                        </span>
                      </div>
                      {scores.metric_averages && Object.entries(scores.metric_averages).map(([mName, mVal]) => (
                        <div key={mName} className="flex justify-between">
                          <span className="text-gray-400 capitalize">{mName.replace('_', ' ')}</span>
                          <span className="text-white">
                            {(mVal as number).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {campaignData.error_message && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400">{campaignData.error_message}</p>
            </div>
          )}

          {/* Test Case Results */}
          {campaignData.status === 'completed' && campaignData.results && campaignData.results.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Detailed Results</h3>
              <div className="overflow-x-auto border border-white/10 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="p-4 text-sm font-medium text-gray-400">Test Case</th>
                      <th className="p-4 text-sm font-medium text-gray-400">Model</th>
                      <th className="p-4 text-sm font-medium text-gray-400">Expected</th>
                      <th className="p-4 text-sm font-medium text-gray-400">Response</th>
                      <th className="p-4 text-sm font-medium text-gray-400 text-center">Status</th>
                      <th className="p-4 text-sm font-medium text-gray-400 text-center">Metrics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {campaignData.results.map((res: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-sm text-white font-medium max-w-[150px] truncate" title={res.test_case_name || 'Test Case'}>
                          {res.test_case_name || 'Test Case'}
                        </td>
                        <td className="p-4 text-sm text-gray-300">
                          {res.model_name}
                        </td>
                        <td className="p-4 text-sm text-gray-300 max-w-[200px] truncate" title={res.expected_response || '-'}>
                          {res.expected_response || '-'}
                        </td>
                        <td className="p-4 text-sm text-white max-w-[300px] truncate" title={res.model_response || '-'}>
                          {res.model_response || '-'}
                        </td>
                        <td className="p-4 text-center">
                          <StatusBadge status={res.passed ? 'success' : 'error'} />
                        </td>
                        <td className="p-4 text-sm text-gray-400">
                          {res.metric_scores && res.metric_scores.length > 0 ? (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {res.metric_scores.map((m: any, i: number) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded" title={`${m.metric_name}: ${m.score}`}>
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
                    <span className="text-white">{scores.avg_latency_ms.toFixed(0)}ms</span>
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
