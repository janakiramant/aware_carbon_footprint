import { useState } from 'react';
import Assistant from './components/Assistant';
import Dashboard from './components/Dashboard';
import './index.css';

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT HABITS — documented initial state used for first render and reset.
// All values are explicit primitives; no user input reaches this object directly,
// so no sanitization is needed here.
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_HABITS = {
  // Quick-commerce
  quickOrders:   3,
  quickVehicle:  'petrol_bike',
  quickPackaging:'plastic_container',
  quickItems:    3,
  // E-commerce
  ecomOrders:    2,
  ecomSpeed:     'two_day_ground',
  ecomWeight:    0.5,
  ecomDistance:  500,
  // Food delivery
  foodOrders:    4,
  foodDistance:  3,
  foodVehicle:   'petrol_bike',
  foodPackaging: 'plastic_container',
  foodContainers:2,
  // Digital
  streamHours:   2,
  streamQuality: 'hd_1080p',
  callHours:     1,
  callVideo:     'hd_video_on',
  cloudGB:       50,
  browseHours:   2,
};

export default function App() {
  const [habits, setHabits] = useState(DEFAULT_HABITS);
  const [view, setView]     = useState('landing'); // 'landing' | 'assistant' | 'dashboard'

  const handleComplete = () => setView('dashboard');
  const handleReset    = () => { setHabits(DEFAULT_HABITS); setView('assistant'); };

  if (view === 'landing') {
    return <Landing onStart={() => setView('assistant')} />;
  }

  return (
    <AppShell>
      {view === 'assistant'
        ? <Assistant habits={habits} onHabitsChange={setHabits} onComplete={handleComplete} />
        : <Dashboard habits={habits} onReset={handleReset} />
      }
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP SHELL — persistent header / footer wrapper for wizard and dashboard views
// ─────────────────────────────────────────────────────────────────────────────
function AppShell({ children }) {
  return (
    <div className="app-shell">
      <header className="app-header" role="banner">
        <div className="header-inner">
          {/* Brand */}
          <div className="logo-group">
            <span className="logo-leaf" aria-hidden="true">🌿</span>
            <div>
              <span className="logo-text">EcoByte</span>
              <span className="logo-tagline">Global Carbon Awareness Platform</span>
            </div>
          </div>

          {/* External reference links — UNFCCC & IEA */}
          <nav className="header-nav" aria-label="International climate frameworks">
            <a
              href="https://unfccc.int/topics/mitigation/resources/mitigation-resources"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link nav-link-ext"
              title="Visit the United Nations Framework Convention on Climate Change — the international treaty governing global greenhouse gas mitigation standards and nationally determined contributions (NDCs)"
              aria-label="UNFCCC Mitigation Resources — official UN climate treaty framework (opens in new tab)"
            >
              <span className="nav-link-icon" aria-hidden="true">🌐</span>
              <span className="nav-link-body">
                <span className="nav-link-label">UNFCCC</span>
                <span className="nav-link-sub">UN Climate Treaty</span>
              </span>
            </a>

            <a
              href="https://www.iea.org/topics/energy-efficiency/digitalization"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link nav-link-ext"
              title="Visit the International Energy Agency's Digitalization & Energy platform — global data standards, energy efficiency benchmarks, and ICT sector emission tracking used by EcoByte's emission factors"
              aria-label="IEA Digitalisation and Energy — global energy data standards platform (opens in new tab)"
            >
              <span className="nav-link-icon" aria-hidden="true">⚡</span>
              <span className="nav-link-body">
                <span className="nav-link-label">IEA Digital</span>
                <span className="nav-link-sub">Energy Data Standards</span>
              </span>
            </a>
          </nav>
        </div>
      </header>

      <main className="app-main" id="main-content">
        {children}
      </main>

      <footer className="app-footer" role="contentinfo">
        <p>
          Emission factors sourced from IPCC AR6, IEA 2023, EPA, CE Delft, Shift Project, and Carbon Trust.
          All calculations run entirely client-side — no personal data leaves your browser.
        </p>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LANDING PAGE — fully static; no user input rendered, no sanitization needed
// ─────────────────────────────────────────────────────────────────────────────
function Landing({ onStart }) {
  const stats = [
    { value: '4.2 kg',  label: 'Global avg weekly digital CO₂e', icon: '🌍' },
    { value: '3.7%',    label: 'Global CO₂ from digital technology', icon: '💻' },
    { value: '7×',      label: 'More CO₂: next-day vs. economy shipping', icon: '📦' },
    { value: '11×',     label: '4K vs SD streaming carbon ratio', icon: '📺' },
  ];

  const features = [
    { icon: '⚡', title: 'Quick-Commerce Impact',   desc: 'Blinkit, Zepto, Swiggy Instamart — every 10-minute order has a measurable carbon cost.' },
    { icon: '📦', title: 'Shipping Speed Carbon',    desc: 'Next-day air vs. no-rush ground: a 7× difference in CO₂e emissions per parcel.' },
    { icon: '📺', title: 'Streaming Footprint',      desc: '4K streaming generates up to 11× more CO₂e than SD quality per hour of playback.' },
    { icon: '🔮', title: 'What-If Simulator',        desc: 'See instantly how a single habit change can slash your weekly digital emissions.' },
  ];

  return (
    <div className="landing">
      {/* CSS-only particle animation — no script injection */}
      <div className="particles" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} className="particle" style={{ '--i': i }} />
        ))}
      </div>

      {/* Top-left logo on landing */}
      <div className="landing-header" role="banner">
        <div className="logo-group">
          <span className="logo-leaf" aria-hidden="true">🌿</span>
          <div>
            <span className="logo-text">EcoByte</span>
            <span className="logo-tagline">Global Carbon Awareness Platform</span>
          </div>
        </div>
      </div>

      <div className="landing-hero">
        <div className="landing-badge">🌿 EcoByte · Global Carbon Awareness Platform</div>
        <h1 className="landing-title">
          Discover the Hidden Carbon Cost<br />
          <span className="landing-gradient">of Your Digital Life</span>
        </h1>
        <p className="landing-desc">
          Every quick-commerce order, food delivery, 4K binge session, and next-day shipment
          carries a carbon price tag. EcoByte makes the invisible visible — and gives you
          the evidence-based tools to act.
        </p>

        <button
          id="btn-start-assessment"
          className="btn-hero"
          onClick={onStart}
          type="button"
          aria-label="Start the carbon footprint assessment — takes about 3 minutes"
        >
          <span>Calculate My Footprint</span>
          <span className="btn-hero-arrow" aria-hidden="true">→</span>
        </button>

        <p className="landing-time">Takes about 3 minutes · No signup · No data sent to servers</p>
      </div>

      {/* Stats grid */}
      <div className="landing-stats" role="list" aria-label="Key digital carbon statistics">
        {stats.map((s, i) => (
          <div key={i} className="stat-card" role="listitem">
            <span className="stat-icon" aria-hidden="true">{s.icon}</span>
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Feature grid */}
      <div className="landing-features" role="list" aria-label="Platform features">
        {features.map((f, i) => (
          <div key={i} className="feature-card" role="listitem">
            <span className="feature-icon" aria-hidden="true">{f.icon}</span>
            <h2 className="feature-title">{f.title}</h2>
            <p className="feature-desc">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
