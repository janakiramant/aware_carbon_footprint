import { useState, useMemo } from 'react';
import {
  calcTotalEmissions,
  simulateWhatIf,
  getFootprintRating,
  getEquivalencies,
  GLOBAL_WEEKLY_BENCHMARK,
} from '../utils/carbonMath';

// ── Radial gauge (pure SVG, no external deps) ───────────────────────────────
function RadialGauge({ value, max, label, color }) {
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const stroke = circumference * (1 - pct);

  return (
    <div className="radial-gauge">
      <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={stroke}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="60" y="55" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700" fontFamily="Space Grotesk, sans-serif">
          {value.toFixed(2)}
        </text>
        <text x="60" y="72" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8" fontFamily="Inter, sans-serif">
          kg CO₂e
        </text>
      </svg>
      <p className="gauge-label">{label}</p>
    </div>
  );
}

// ── Horizontal progress bar ──────────────────────────────────────────────────
function ProgressBar({ label, value, total, color, icon }) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div className="progress-bar-row">
      <div className="progress-bar-meta">
        <span className="progress-bar-icon">{icon}</span>
        <span className="progress-bar-label">{label}</span>
        <span className="progress-bar-value">{value.toFixed(3)} kg</span>
        <span className="progress-bar-pct">{pct.toFixed(1)}%</span>
      </div>
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${pct}%`, backgroundColor: color, transition: 'width 1s ease' }}
        />
      </div>
    </div>
  );
}

// ── Equivalency card ─────────────────────────────────────────────────────────
function EquivCard({ value, label, icon }) {
  return (
    <div className="equiv-card">
      <span className="equiv-icon">{icon}</span>
      <span className="equiv-value">{value.toLocaleString()}</span>
      <span className="equiv-label">{label}</span>
    </div>
  );
}

// ── What-If Slider ─────────────────────────────────────────────────────────
function WhatIfPanel({ habits }) {
  const scenarios = useMemo(() => simulateWhatIf(habits), [habits]);

  if (scenarios.length === 0) {
    return (
      <div className="whatif-empty">
        <span>🌱</span>
        <p>Complete your habit profile to unlock personalised What-If simulations.</p>
      </div>
    );
  }

  return (
    <div className="whatif-grid">
      {scenarios.map(s => (
        <div key={s.id} className="whatif-card" id={`whatif-${s.id}`}>
          <div className="whatif-header">
            <span className="whatif-icon">{s.icon}</span>
            <h4 className="whatif-title">{s.label}</h4>
            <span className="whatif-badge">-{s.percent}%</span>
          </div>
          <p className="whatif-desc">{s.description}</p>
          <div className="whatif-saving">
            <span className="whatif-saving-value">−{s.saving} kg CO₂e</span>
            <span className="whatif-saving-unit">saved per week</span>
          </div>
          <div className="whatif-bar-track">
            <div className="whatif-bar-fill" style={{ width: `${Math.min(s.percent, 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Smart Action Micro-Nudges ────────────────────────────────────────────────
const ACTION_TEMPLATES = [
  { id: 'a1', icon: '📦', text: 'Bundle your weekly deliveries into one consolidated order', category: 'delivery', saving: 'High' },
  { id: 'a2', icon: '🌱', text: 'Choose no-rush / economy shipping for your next e-commerce order', category: 'shipping', saving: 'High' },
  { id: 'a3', icon: '📺', text: 'Lower your streaming quality by one tier this week', category: 'digital', saving: 'Medium' },
  { id: 'a4', icon: '🎙️', text: 'Turn camera off in 50% of your video calls today', category: 'digital', saving: 'Medium' },
  { id: 'a5', icon: '♻️', text: 'Ask for paper / reusable packaging on your next food order', category: 'food', saving: 'Medium' },
  { id: 'a6', icon: '🚴', text: 'Walk or cycle to a restaurant instead of ordering delivery once this week', category: 'food', saving: 'High' },
  { id: 'a7', icon: '☁️', text: 'Delete unused files from cloud storage to reduce datacenter load', category: 'digital', saving: 'Low' },
  { id: 'a8', icon: '🛒', text: 'Plan grocery purchases to reduce quick-commerce impulse orders', category: 'delivery', saving: 'High' },
  { id: 'a9', icon: '📵', text: 'Set a 2-hour screen-off window daily to cut streaming emissions', category: 'digital', saving: 'Medium' },
  { id: 'a10', icon: '⚡', text: 'Prefer platforms that use EV delivery fleets (e.g. Blinkit EV zones)', category: 'delivery', saving: 'High' },
];

const SAVING_COLOR = { High: '#22c55e', Medium: '#eab308', Low: '#94a3b8' };

function ActionNudges({ breakdown }) {
  const [checked, setChecked] = useState({});
  const [streak, setStreak] = useState(0);

  const toggle = (id) => {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] };
      setStreak(Object.values(next).filter(Boolean).length);
      return next;
    });
  };

  // Prioritise actions based on which category has highest emissions
  const sorted = useMemo(() => {
    const categoryOrder = Object.entries(breakdown)
      .filter(([k]) => k !== 'total' && k !== 'annualTotal')
      .sort(([, a], [, b]) => b - a)
      .map(([k]) => k);

    const categoryMap = {
      quickCommerce: 'delivery',
      ecommerce: 'shipping',
      foodDelivery: 'food',
      streaming: 'digital',
      videoCall: 'digital',
      browsing: 'digital',
      cloudStorage: 'digital',
    };

    const topCategory = categoryMap[categoryOrder[0]] ?? 'delivery';
    return [...ACTION_TEMPLATES].sort((a, b) => {
      if (a.category === topCategory && b.category !== topCategory) return -1;
      if (b.category === topCategory && a.category !== topCategory) return 1;
      return 0;
    });
  }, [breakdown]);

  return (
    <div className="nudge-panel">
      <div className="nudge-streak">
        <span className="streak-fire">🔥</span>
        <div>
          <p className="streak-count">{streak} Actions Logged</p>
          <p className="streak-label">Carbon-saving streak this session</p>
        </div>
        <div className="streak-bar-track">
          <div className="streak-bar-fill" style={{ width: `${(streak / ACTION_TEMPLATES.length) * 100}%` }} />
        </div>
      </div>

      <ul className="nudge-list" aria-label="Action checklist">
        {sorted.map(action => (
          <li key={action.id} className={`nudge-item ${checked[action.id] ? 'nudge-done' : ''}`}>
            <button
              id={`nudge-${action.id}`}
              className="nudge-check"
              onClick={() => toggle(action.id)}
              aria-pressed={!!checked[action.id]}
              type="button"
            >
              {checked[action.id] ? '✓' : ''}
            </button>
            <span className="nudge-icon">{action.icon}</span>
            <span className="nudge-text">{action.text}</span>
            <span
              className="nudge-saving"
              style={{ color: SAVING_COLOR[action.saving] }}
            >{action.saving} Impact</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard({ habits, onReset }) {
  const breakdown = useMemo(() => calcTotalEmissions(habits), [habits]);
  const rating = useMemo(() => getFootprintRating(breakdown.total), [breakdown.total]);
  const equiv = useMemo(() => getEquivalencies(breakdown.total), [breakdown.total]);

  const [activeTab, setActiveTab] = useState('overview');

  const categories = [
    { key: 'quickCommerce', label: 'Quick-Commerce', icon: '⚡', color: '#f97316' },
    { key: 'ecommerce', label: 'E-Commerce', icon: '📦', color: '#8b5cf6' },
    { key: 'foodDelivery', label: 'Food Delivery', icon: '🍱', color: '#ec4899' },
    { key: 'streaming', label: 'Video Streaming', icon: '📺', color: '#06b6d4' },
    { key: 'videoCall', label: 'Video Calls', icon: '📹', color: '#10b981' },
    { key: 'browsing', label: 'Browsing / Social', icon: '🌐', color: '#6366f1' },
    { key: 'cloudStorage', label: 'Cloud Storage', icon: '☁️', color: '#64748b' },
  ];

  const vsGlobal = (breakdown.total / GLOBAL_WEEKLY_BENCHMARK) * 100;

  return (
    <section className="dashboard" aria-label="Carbon Impact Dashboard">
      {/* Hero score */}
      <div className="dashboard-hero">
        <div className="hero-score-area">
          <div className="hero-emoji-badge" style={{ borderColor: rating.color }}>
            <span style={{ fontSize: '2.5rem' }}>{rating.emoji}</span>
          </div>
          <div className="hero-text">
            <p className="hero-rating" style={{ color: rating.color }}>{rating.label}</p>
            <h1 className="hero-total">{breakdown.total} <span>kg CO₂e</span></h1>
            <p className="hero-period">weekly digital carbon footprint</p>
            <p className="hero-message">{rating.message}</p>
          </div>
        </div>

        <div className="hero-gauges">
          <RadialGauge value={breakdown.total} max={GLOBAL_WEEKLY_BENCHMARK * 3} label="This Week" color={rating.color} />
          <RadialGauge value={breakdown.annualTotal} max={GLOBAL_WEEKLY_BENCHMARK * 3 * 52} label="Annual" color="#6366f1" />
          <RadialGauge value={GLOBAL_WEEKLY_BENCHMARK} max={GLOBAL_WEEKLY_BENCHMARK * 3} label="Global Avg" color="#64748b" />
        </div>

        <div className="hero-vs-global">
          <p className="vs-label">vs. Global Average ({GLOBAL_WEEKLY_BENCHMARK} kg/week)</p>
          <div className="vs-track">
            <div className="vs-fill" style={{ width: `${Math.min(vsGlobal, 100)}%`, backgroundColor: rating.color }} />
          </div>
          <p className="vs-pct" style={{ color: rating.color }}>{vsGlobal.toFixed(0)}% of global benchmark</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="dash-tabs">
        {[
          { id: 'overview', label: '📊 Breakdown' },
          { id: 'whatif', label: '🔮 What-If Simulator' },
          { id: 'actions', label: '✅ Action Plan' },
        ].map(tab => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            className={`dash-tab ${activeTab === tab.id ? 'dash-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="dash-content">
        {activeTab === 'overview' && (
          <div className="overview-panel">
            <h3 className="panel-title">Emission Breakdown by Category</h3>
            <div className="breakdown-bars">
              {categories.map(cat => (
                <ProgressBar
                  key={cat.key}
                  label={cat.label}
                  value={breakdown[cat.key]}
                  total={breakdown.total}
                  color={cat.color}
                  icon={cat.icon}
                />
              ))}
            </div>

            <div className="equiv-section">
              <h3 className="panel-title">Your {breakdown.total} kg CO₂e is equivalent to…</h3>
              <div className="equiv-grid">
                <EquivCard value={equiv.smartphoneCharges} label="Smartphone Charges" icon="📱" />
                <EquivCard value={equiv.kmDriven} label="km Driven (avg car)" icon="🚗" />
                <EquivCard value={equiv.treeDays} label="Tree-Days to Absorb" icon="🌳" />
                <EquivCard value={equiv.cupsCoffee} label="Cups of Coffee" icon="☕" />
                <EquivCard value={equiv.plasticBags} label="Plastic Bags" icon="🛍️" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'whatif' && (
          <div className="whatif-panel">
            <h3 className="panel-title">What-If Simulator — Explore Alternatives</h3>
            <p className="panel-subtitle">See exactly how much CO₂e you could save by changing one habit at a time.</p>
            <WhatIfPanel habits={habits} />
          </div>
        )}

        {activeTab === 'actions' && (
          <div>
            <h3 className="panel-title">Smart Action Micro-Nudges</h3>
            <p className="panel-subtitle">Check off actions as you complete them to build your carbon-saving streak.</p>
            <ActionNudges breakdown={breakdown} />
          </div>
        )}
      </div>

      <button id="btn-retake" className="btn-ghost retake-btn" onClick={onReset} type="button">
        ← Retake Assessment
      </button>
    </section>
  );
}
