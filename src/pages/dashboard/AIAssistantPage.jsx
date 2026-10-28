import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  Bot,
  Sparkles,
  Send,
  HelpCircle,
  Lightbulb,
  TrendingUp,
  AlertCircle,
  DollarSign,
  CheckCircle2
} from 'lucide-react';

export const AIAssistantPage = () => {
  const [query, setQuery] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState([]);
  const [metrics, setMetrics] = useState(null);

  const quickPrompts = [
    'What was our revenue this month?',
    'What is our occupancy rate and ADR?',
    'Which bookings are unpaid?',
    'Which inventory items are below minimum stock?',
    'What are our operating expenses this month?'
  ];

  const fetchInitialInsights = async () => {
    try {
      const res = await api.get('/ai/insights');
      if (res.data.success) {
        setInsights(res.data.data.insights);
        setMetrics(res.data.data.metrics);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchInitialInsights();
  }, []);

  const handleAsk = async (textToSend) => {
    const q = textToSend || query;
    if (!q.trim()) return;

    const userMessage = { sender: 'user', text: q, time: new Date() };
    setConversation((prev) => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const res = await api.post('/ai/query', { query: q });
      if (res.data.success) {
        const aiMessage = {
          sender: 'ai',
          text: res.data.data.answer,
          category: res.data.data.category,
          time: new Date()
        };
        setConversation((prev) => [...prev, aiMessage]);
        if (res.data.data.insights) {
          setInsights(res.data.data.insights);
        }
        if (res.data.data.metrics) {
          setMetrics(res.data.data.metrics);
        }
      }
    } catch (err) {
      setConversation((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Unable to process query at this moment. Please check network connectivity.',
          time: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-brand-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/30 border border-brand-400/40 flex items-center justify-center text-amber-400">
          <Bot className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">AI Revenue & Operations Assistant</h1>
          <p className="text-xs text-brand-200 mt-0.5">
            Real-time hospitality business intelligence powered by verified database telemetry
          </p>
        </div>
      </div>

      {/* Live AI Telemetry Badges */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Current Occupancy</p>
              <p className="text-lg font-black text-slate-900">{metrics.currentOccupancy}%</p>
            </div>
            <TrendingUp className="w-5 h-5 text-brand-600" />
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Average Daily Rate</p>
              <p className="text-lg font-black text-slate-900">${metrics.adr}</p>
            </div>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Low Stock SKUs</p>
              <p className="text-lg font-black text-slate-900">{metrics.lowStockCount}</p>
            </div>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Month Invoiced</p>
              <p className="text-lg font-black text-slate-900">${metrics.thisMonthRevenue?.toLocaleString()}</p>
            </div>
            <Sparkles className="w-5 h-5 text-indigo-500" />
          </div>
        </div>
      )}

      {/* Main Grid: Chat Assistant & Proactive Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface (2 cols) */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col h-[520px]">
            {/* Quick Prompt Chips */}
            <div className="pb-3 border-b border-slate-100 flex flex-wrap gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
                <HelpCircle className="w-3.5 h-3.5" /> Suggested:
              </span>
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAsk(p)}
                  className="text-[11px] bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 px-2.5 py-1 rounded-full transition-colors font-medium border border-slate-200/60"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Conversation Log */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 px-1">
              {conversation.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-700 text-sm">Ask Innkeeper AI Anything</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Ask questions regarding revenue pacing, unpaid room charges, occupancy trends, or inventory thresholds.
                  </p>
                </div>
              ) : (
                conversation.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'ai' && (
                      <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-sm">
                        AI
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-brand-600 text-white rounded-tr-none shadow-sm'
                          : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/60'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                  <Bot className="w-4 h-4 animate-spin text-brand-600" />
                  <span>Aggregating database queries and computing metrics...</span>
                </div>
              )}
            </div>

            {/* Prompt Input */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask about revenue, occupancy, bookings, stock..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <Button
                variant="primary"
                icon={Send}
                disabled={!query.trim() || loading}
                onClick={() => handleAsk()}
              >
                Ask
              </Button>
            </div>
          </Card>
        </div>

        {/* Business Insights Panel (1 col) */}
        <div>
          <Card title="Proactive Business Insights" subtitle="Data-driven tactical suggestions">
            <div className="space-y-3 mt-1">
              {insights.map((ins, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl border text-xs ${
                    ins.type === 'warning' || ins.type === 'alert'
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Lightbulb className="w-4 h-4 flex-shrink-0" />
                    <span>{ins.title}</span>
                  </div>
                  <p className="leading-relaxed opacity-90">{ins.text}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

