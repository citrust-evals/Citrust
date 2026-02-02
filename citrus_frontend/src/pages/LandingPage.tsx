// Landing Page for Citrus AI - LLM Evaluation Platform
import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: 'compare',
      title: 'Dual Response Generation',
      description: 'Compare two model responses side-by-side for better evaluation',
    },
    {
      icon: 'psychology',
      title: 'Preference Learning',
      description: 'Collect and analyze user preferences to improve AI models',
    },
    {
      icon: 'monitoring',
      title: 'Real-time Tracing',
      description: 'Track every API call, token usage, and latency in real-time',
    },
    {
      icon: 'analytics',
      title: 'Performance Analytics',
      description: 'Dashboard-ready metrics and insights for your AI systems',
    },
    {
      icon: 'hub',
      title: 'Multi-Model Support',
      description: 'Works with Gemini, GPT-4, Claude, and custom models',
    },
    {
      icon: 'storage',
      title: 'Scalable Storage',
      description: 'MongoDB integration with optimized indexes for scale',
    },
  ];

  const stats = [
    { value: '99.9%', label: 'Uptime' },
    { value: '<100ms', label: 'Latency' },
    { value: '10M+', label: 'Evaluations' },
    { value: '50+', label: 'Models Supported' },
  ];

  return (
    <div className="min-h-screen bg-background-dark text-white overflow-x-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full mix-blend-screen filter blur-[120px] opacity-40 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-primary/8 rounded-full mix-blend-screen filter blur-[80px] opacity-25 animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
            <span className="material-symbols-outlined text-primary text-[32px]">spa</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Citrus AI</h1>
            <p className="text-xs text-gray-400 font-mono">v2.4.0</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-xl font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 lg:px-12 pt-20 pb-32">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-sm text-primary font-medium">Now with Multi-Model Support</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight">
            Evaluate, Compare &<br />
            <span className="text-primary">Improve Your LLMs</span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            The professional-grade platform for evaluating, comparing, and analyzing Large Language Models 
            with real-time tracing, performance analytics, and preference learning.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="btn-primary text-lg px-8 py-4 flex items-center gap-2"
            >
              <span className="material-symbols-outlined">rocket_launch</span>
              Start Evaluating
            </button>
            <button
              onClick={() => {
                const featuresSection = document.getElementById('features');
                featuresSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-4 rounded-xl font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200 flex items-center gap-2"
            >
              <span className="material-symbols-outlined">play_circle</span>
              See How It Works
            </button>
          </div>
        </div>

        {/* Hero Image/Preview */}
        <div className="max-w-5xl mx-auto mt-20">
          <div className="glass-panel rounded-3xl p-2 shadow-2xl shadow-black/50">
            <div className="bg-surface-dark rounded-2xl overflow-hidden">
              {/* Mock Browser Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-black/30 border-b border-white/5">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/70"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/70"></div>
                </div>
                <div className="flex-1 mx-4">
                  <div className="max-w-md mx-auto px-4 py-1.5 rounded-lg bg-white/5 text-sm text-gray-400 text-center">
                    citrus.ai/chat
                  </div>
                </div>
              </div>
              {/* Mock App Preview */}
              <div className="p-6">
                <div className="flex gap-6">
                  {/* Mock Sidebar */}
                  <div className="w-48 space-y-3">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
                      <span className="material-symbols-outlined text-primary text-lg">chat</span>
                      <span className="text-sm text-primary font-medium">Chat</span>
                    </div>
                    {['assessment', 'insights', 'settings'].map((icon, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-4 py-3 rounded-xl">
                        <span className="material-symbols-outlined text-gray-500 text-lg">{icon}</span>
                        <div className="w-16 h-2 rounded bg-white/10"></div>
                      </div>
                    ))}
                  </div>
                  {/* Mock Chat Area */}
                  <div className="flex-1 space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1 glass-panel rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs text-primary font-mono">Model A</span>
                          <span className="text-xs text-gray-500">• Gemini Pro</span>
                        </div>
                        <div className="space-y-2">
                          <div className="w-full h-2 rounded bg-white/10"></div>
                          <div className="w-4/5 h-2 rounded bg-white/10"></div>
                          <div className="w-3/5 h-2 rounded bg-white/10"></div>
                        </div>
                      </div>
                      <div className="flex-1 glass-panel rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs text-primary font-mono">Model B</span>
                          <span className="text-xs text-gray-500">• GPT-4</span>
                        </div>
                        <div className="space-y-2">
                          <div className="w-full h-2 rounded bg-white/10"></div>
                          <div className="w-3/4 h-2 rounded bg-white/10"></div>
                          <div className="w-4/5 h-2 rounded bg-white/10"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 px-6 lg:px-12 py-16 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl lg:text-5xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-6 lg:px-12 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Everything you need to evaluate and improve your AI models in one platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="glass-panel-hover rounded-2xl p-6 group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <span className="material-symbols-outlined text-primary text-[28px]">
                    {feature.icon}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 px-6 lg:px-12 py-24 bg-surface-dark/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Get started in minutes with our simple three-step process
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Send a Prompt',
                description: 'Enter your prompt and select the models you want to compare',
                icon: 'edit_note',
              },
              {
                step: '02',
                title: 'Compare Responses',
                description: 'View side-by-side responses from multiple AI models',
                icon: 'compare_arrows',
              },
              {
                step: '03',
                title: 'Analyze & Choose',
                description: 'Select the best response and help train better models',
                icon: 'analytics',
              },
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div className="text-8xl font-bold text-white/5 absolute -top-4 -left-2">
                  {item.step}
                </div>
                <div className="relative glass-panel rounded-2xl p-6 pt-16">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-primary text-[24px]">
                      {item.icon}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 lg:px-12 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="glass-panel rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"></div>
            <div className="relative z-10">
              <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
                Join thousands of developers who are building better AI systems with Citrus
              </p>
              <button
                onClick={() => navigate('/login')}
                className="btn-primary text-lg px-8 py-4"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 lg:px-12 py-12 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[24px]">spa</span>
              </div>
              <span className="text-lg font-bold">Citrus AI</span>
            </div>
            <div className="flex items-center gap-6 text-gray-400 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Documentation</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
            <div className="text-gray-500 text-sm">
              © 2026 Citrus AI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
