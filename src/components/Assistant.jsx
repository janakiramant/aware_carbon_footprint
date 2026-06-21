import { useState, useCallback, useEffect, useRef } from 'react';


// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT-AWARE FEEDBACK ENGINE
// Maps current habit selections to personalised, positive micro-messages
// displayed before transitioning to the next wizard step.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a contextual, encouraging feedback note based on current step habits.
 * Returns { emoji, headline, body } — all values are static strings (no user input
 * interpolated, so XSS risk is zero here).
 * @param {string} stepId - The step being completed
 * @param {object} habits - Current habit state
 * @returns {{ emoji: string, headline: string, body: string }}
 */
function buildFeedback(stepId, habits) {
  const h = habits ?? {};

  if (stepId === 'quick_commerce') {
    const orders = Number(h.quickOrders) || 0;
    if (orders === 0) {
      return {
        emoji: '🌟',
        headline: 'Zero quick-commerce orders — impressive!',
        body: 'Skipping impulse instant-delivery is one of the highest-impact urban choices you can make. Your footprint is already lower than most city dwellers!',
      };
    }
    if (h.quickVehicle === 'ev_bike') {
      return {
        emoji: '⚡',
        headline: 'Great — EV delivery is a real win!',
        body: 'Platforms using electric bikes for last-mile delivery cut per-order transport emissions by ~79%. Choosing EV-fleet services actively drives the market shift.',
      };
    }
    if (h.quickPackaging === 'reusable_container' || h.quickPackaging === 'paper_bag') {
      return {
        emoji: '♻️',
        headline: 'Sustainable packaging choice noted!',
        body: 'Paper and reusable containers can reduce packaging carbon by up to 97% compared to single-use plastics. Small material choices compound quickly at scale.',
      };
    }
    if (orders <= 3) {
      return {
        emoji: '🛒',
        headline: 'Mindful ordering is half the battle.',
        body: 'Keeping quick-commerce orders under 3/week puts you ahead of the urban average. Awareness is the first step to digital optimisation — let\'s keep going!',
      };
    }
    return {
      emoji: '🌿',
      headline: 'Awareness is the first step!',
      body: 'You now know the carbon cost of each instant order. The What-If simulator will show you exactly how batching deliveries can shrink this number significantly.',
    };
  }

  if (stepId === 'ecommerce') {
    const orders = Number(h.ecomOrders) || 0;
    if (orders === 0) {
      return {
        emoji: '🏆',
        headline: 'No e-commerce orders this week — excellent!',
        body: 'Reduced online shopping frequency is a powerful lever. Local purchasing keeps supply chains shorter and slashes last-mile emissions dramatically.',
      };
    }
    if (h.ecomSpeed === 'no_rush_ground') {
      return {
        emoji: '🌱',
        headline: 'No-rush shipping — a deceptively powerful choice!',
        body: 'Economy ground shipping emits up to 7× less CO₂e than next-day air freight. Choosing "no rush" on every order is one of the easiest high-impact habits to build.',
      };
    }
    if (h.ecomSpeed === 'two_day_ground') {
      return {
        emoji: '👍',
        headline: 'Ground shipping is already a solid choice.',
        body: 'Road freight emits ~5× less than air freight per kg-km. If you can stretch to no-rush economy, the What-If simulator will show you the exact additional saving.',
      };
    }
    return {
      emoji: '💡',
      headline: 'Did you know? Shipping speed is the biggest lever here.',
      body: 'Next-day air freight can emit over 1 kg CO₂e per kg of parcel — the highest factor in this category. Switching one order a week to economy shipping adds up fast.',
    };
  }

  if (stepId === 'food_delivery') {
    const orders = Number(h.foodOrders) || 0;
    if (orders === 0) {
      return {
        emoji: '🥗',
        headline: 'Cooking at home — zero delivery emissions!',
        body: "Home cooking eliminates food delivery vehicle emissions entirely and typically reduces food packaging waste too. That's a meaningful contribution.",
      };
    }
    if (h.foodVehicle === 'cycle') {
      return {
        emoji: '🚲',
        headline: 'Cycle delivery — zero direct vehicle emissions!',
        body: 'Pedal-powered delivery is the gold standard for last-mile food logistics. Supporting platforms that use cyclists makes an immediate, measurable difference.',
      };
    }
    if (h.foodVehicle === 'electric_bike') {
      return {
        emoji: '⚡',
        headline: 'Electric bike delivery — great choice of platform!',
        body: 'EV bikes emit ~76% less per km than petrol bikes. Actively preferring platforms with electric fleets creates demand-side pressure for cleaner logistics.',
      };
    }
    if (h.foodPackaging === 'reusable_container') {
      return {
        emoji: '♻️',
        headline: 'Reusable container scheme — a circular economy win!',
        body: 'Amortised over 50 uses, a reusable container produces ~97% less packaging carbon than a single-use plastic container. Choosing this scheme scales impact.',
      };
    }
    if (orders <= 2) {
      return {
        emoji: '✨',
        headline: 'Keeping food delivery moderate — well done!',
        body: "At 1–2 orders per week, your food delivery footprint stays manageable. You're in a great position to use the What-If simulator to optimise even further.",
      };
    }
    return {
      emoji: '🍱',
      headline: 'Tracking food delivery is a key insight!',
      body: 'Food delivery combines vehicle emissions with packaging waste — often making it the highest category for urban consumers. The dashboard will show your full breakdown.',
    };
  }

  if (stepId === 'streaming') {
    const hours = Number(h.streamHours) || 0;
    const quality = h.streamQuality ?? 'hd_1080p';
    if (hours <= 1) {
      return {
        emoji: '🎯',
        headline: 'Light streaming usage — very low digital footprint here!',
        body: 'Under 1 hour of streaming daily keeps your digital media emissions well below the global average. Your disciplined screen time has real climate benefits.',
      };
    }
    if (quality === 'sd_mobile' || quality === 'audio_only') {
      return {
        emoji: '📱',
        headline: 'Lower-quality streaming — a smart digital optimisation!',
        body: 'SD or audio-only streaming reduces data transfer by up to 98% compared to 4K HDR. This is a simple, friction-free way to cut digital carbon without losing content.',
      };
    }
    if (quality === 'uhd_4k' || quality === 'hdr_4k') {
      return {
        emoji: '💡',
        headline: 'Awareness is the first step to digital optimisation!',
        body: '4K streams use ~15× more data than audio-only. The What-If simulator will show you exactly how much CO₂e you could save by dropping one quality tier — it may surprise you!',
      };
    }
    if (h.callVideo === 'video_off') {
      return {
        emoji: '🎙️',
        headline: 'Camera-off calls — a surprisingly effective habit!',
        body: 'Turning off your camera reduces video-call emissions by ~89%. For remote workers averaging 2+ hours of calls daily, this single change can save over 0.18 kg CO₂e per week.',
      };
    }
    return {
      emoji: '📊',
      headline: "You're almost at the full picture!",
      body: "Digital streaming and cloud services are the fastest-growing segment of global ICT emissions. You're now building a complete, evidence-based view of your digital footprint.",
    };
  }

  return {
    emoji: '🌍',
    headline: "Great progress — you're almost there!",
    body: 'Every piece of data you provide makes your carbon profile more accurate. Continue to unlock your personalised impact dashboard and action plan.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WIZARD STEP DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 'quick_commerce',
    title: 'Quick-Commerce & Instant Delivery',
    icon: '⚡',
    subtitle: 'Groceries, pharmacy, 10-minute deliveries',
    questions: [
      {
        key: 'quickOrders',
        label: 'How many quick-commerce orders do you place per week?',
        type: 'slider',
        min: 0, max: 21, step: 1, default: 3,
        unit: 'orders/week',
        hint: 'Include Blinkit, Zepto, Swiggy Instamart, Dunzo, Gorillas, etc.',
      },
      {
        key: 'quickVehicle',
        label: 'What vehicle do they typically use for delivery?',
        type: 'choice',
        options: [
          { value: 'petrol_bike', label: '🛵 Petrol Bike', sublabel: '0.42 kg CO₂e/order' },
          { value: 'ev_bike',     label: '⚡ Electric Bike / EV', sublabel: '0.09 kg CO₂e/order' },
        ],
        default: 'petrol_bike',
      },
      {
        key: 'quickPackaging',
        label: 'What packaging do they typically use?',
        type: 'choice',
        options: [
          { value: 'plastic_container',  label: '🧴 Plastic Container',  sublabel: '0.12 kg CO₂e/unit' },
          { value: 'paper_bag',          label: '📄 Paper Bag',          sublabel: '0.003 kg CO₂e/unit' },
          { value: 'styrofoam_box',      label: '📦 Styrofoam Box',      sublabel: '0.20 kg CO₂e/unit' },
          { value: 'reusable_container', label: '♻️ Reusable Container', sublabel: '0.003 kg CO₂e/use' },
        ],
        default: 'plastic_container',
      },
      {
        key: 'quickItems',
        label: 'Average number of packaged items per order?',
        type: 'slider',
        min: 1, max: 10, step: 1, default: 3,
        unit: 'items',
      },
    ],
  },
  {
    id: 'ecommerce',
    title: 'E-Commerce Shipping',
    icon: '📦',
    subtitle: 'Online shopping, package deliveries',
    questions: [
      {
        key: 'ecomOrders',
        label: 'How many online shopping orders per week?',
        type: 'slider',
        min: 0, max: 14, step: 1, default: 2,
        unit: 'orders/week',
        hint: 'Amazon, Flipkart, Myntra, Meesho, Shopify stores, etc.',
      },
      {
        key: 'ecomSpeed',
        label: 'Which shipping speed do you typically choose?',
        type: 'choice',
        options: [
          { value: 'next_day_air',    label: '✈️ Next-Day / Express Air', sublabel: '1.02 kg CO₂e/kg-parcel' },
          { value: 'same_day_van',    label: '🚐 Same-Day Van Delivery',  sublabel: '0.48 kg CO₂e/kg-parcel' },
          { value: 'two_day_ground',  label: '🚛 2-Day Ground Shipping',  sublabel: '0.21 kg CO₂e/kg-parcel' },
          { value: 'no_rush_ground',  label: '🌱 No-Rush / Economy',      sublabel: '0.14 kg CO₂e/kg-parcel' },
        ],
        default: 'two_day_ground',
      },
      {
        key: 'ecomWeight',
        label: 'Average parcel weight?',
        type: 'slider',
        min: 0.1, max: 5, step: 0.1, default: 0.5,
        unit: 'kg',
      },
      {
        key: 'ecomDistance',
        label: 'Estimated shipping distance (warehouse to your door)?',
        type: 'slider',
        min: 50, max: 2000, step: 50, default: 500,
        unit: 'km',
        hint: 'Local city ~50–200 km · National warehouse ~500–2000 km',
      },
    ],
  },
  {
    id: 'food_delivery',
    title: 'Food Delivery',
    icon: '🍱',
    subtitle: 'Restaurant meals, takeaway, cloud kitchen orders',
    questions: [
      {
        key: 'foodOrders',
        label: 'How many food delivery orders per week?',
        type: 'slider',
        min: 0, max: 21, step: 1, default: 4,
        unit: 'orders/week',
        hint: 'Zomato, Swiggy, Uber Eats, Deliveroo, Talabat, etc.',
      },
      {
        key: 'foodDistance',
        label: 'Average restaurant-to-home distance?',
        type: 'slider',
        min: 0.5, max: 15, step: 0.5, default: 3,
        unit: 'km',
      },
      {
        key: 'foodVehicle',
        label: 'Delivery vehicle type?',
        type: 'choice',
        options: [
          { value: 'petrol_bike',   label: '🛵 Petrol Bike',   sublabel: '0.089 kg CO₂e/km' },
          { value: 'electric_bike', label: '⚡ Electric Bike', sublabel: '0.021 kg CO₂e/km' },
          { value: 'car',           label: '🚗 Car',           sublabel: '0.170 kg CO₂e/km' },
          { value: 'cycle',         label: '🚲 Cycle',         sublabel: '0 direct emissions' },
        ],
        default: 'petrol_bike',
      },
      {
        key: 'foodPackaging',
        label: 'Food packaging type?',
        type: 'choice',
        options: [
          { value: 'plastic_container',  label: '🧴 Plastic Containers',  sublabel: '0.12 kg CO₂e/unit' },
          { value: 'styrofoam_box',      label: '📦 Styrofoam Box',        sublabel: '0.20 kg CO₂e/unit' },
          { value: 'paper_bag',          label: '📄 Paper/Kraft Packaging', sublabel: '0.003 kg CO₂e/unit' },
          { value: 'reusable_container', label: '♻️ Reusable Container',   sublabel: '0.003 kg CO₂e/use' },
        ],
        default: 'plastic_container',
      },
      {
        key: 'foodContainers',
        label: 'Number of containers per order?',
        type: 'slider',
        min: 1, max: 8, step: 1, default: 2,
        unit: 'containers',
      },
    ],
  },
  {
    id: 'streaming',
    title: 'Digital Streaming & Cloud',
    icon: '📺',
    subtitle: 'Video, music, cloud storage, video calls',
    questions: [
      {
        key: 'streamHours',
        label: 'Hours of video streaming per day?',
        type: 'slider',
        min: 0, max: 12, step: 0.5, default: 2,
        unit: 'hrs/day',
        hint: 'Netflix, YouTube, Prime Video, Disney+, Hotstar, etc.',
      },
      {
        key: 'streamQuality',
        label: 'Preferred streaming quality?',
        type: 'choice',
        options: [
          { value: 'audio_only', label: '🎵 Audio Only',        sublabel: '0.001 kg CO₂e/hr' },
          { value: 'sd_mobile',  label: '📱 SD / Mobile',       sublabel: '0.008 kg CO₂e/hr' },
          { value: 'hd_1080p',   label: '🖥️ HD 1080p',          sublabel: '0.028 kg CO₂e/hr' },
          { value: 'uhd_4k',     label: '📺 4K UHD',            sublabel: '0.088 kg CO₂e/hr' },
          { value: 'hdr_4k',     label: '✨ 4K HDR',            sublabel: '0.110 kg CO₂e/hr' },
        ],
        default: 'hd_1080p',
      },
      {
        key: 'callHours',
        label: 'Hours of video calls per day?',
        type: 'slider',
        min: 0, max: 10, step: 0.5, default: 1,
        unit: 'hrs/day',
        hint: 'Zoom, Google Meet, Microsoft Teams, Webex, etc.',
      },
      {
        key: 'callVideo',
        label: 'Do you typically keep your camera on?',
        type: 'choice',
        options: [
          { value: 'hd_video_on', label: '📹 Camera On (HD)',          sublabel: '0.036 kg CO₂e/hr' },
          { value: 'video_off',   label: '🎙️ Audio Only / Camera Off', sublabel: '0.004 kg CO₂e/hr' },
        ],
        default: 'hd_video_on',
      },
      {
        key: 'cloudGB',
        label: 'Cloud storage used (Google Drive, iCloud, Dropbox, OneDrive)?',
        type: 'slider',
        min: 0, max: 2000, step: 10, default: 50,
        unit: 'GB',
      },
      {
        key: 'browseHours',
        label: 'Hours of general browsing / social media per day?',
        type: 'slider',
        min: 0, max: 12, step: 0.5, default: 2,
        unit: 'hrs/day',
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PRESENTATIONAL SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SliderQuestion({ question, value, onChange }) {
  const safeVal  = Number.isFinite(Number(value)) ? Number(value) : question.default;
  const pct      = ((safeVal - question.min) / Math.max(question.max - question.min, 1)) * 100;

  const handleChange = useCallback((e) => {
    const raw  = e.target.value;
    const parsed = question.step < 1 ? parseFloat(raw) : parseInt(raw, 10);
    if (Number.isFinite(parsed)) {
      onChange(question.key, parsed);
    }
  }, [question.key, question.step, onChange]);

  return (
    <div className="question-block">
      <label className="question-label" htmlFor={`slider-${question.key}`}>
        {question.label}
      </label>
      {question.hint && <p className="question-hint">{question.hint}</p>}
      <div className="slider-wrapper">
        <input
          id={`slider-${question.key}`}
          type="range"
          min={question.min}
          max={question.max}
          step={question.step}
          value={safeVal}
          onChange={handleChange}
          className="eco-slider"
          style={{ '--pct': `${pct}%` }}
          aria-valuemin={question.min}
          aria-valuemax={question.max}
          aria-valuenow={safeVal}
          aria-label={question.label}
        />
        <span className="slider-value">
          <strong>{safeVal}</strong>{' '}
          <span className="slider-unit">{question.unit}</span>
        </span>
      </div>
    </div>
  );
}

function ChoiceQuestion({ question, value, onChange }) {
  return (
    <div className="question-block">
      <p className="question-label" role="group" aria-label={question.label}>
        {question.label}
      </p>
      <div className="choice-grid" role="radiogroup" aria-label={question.label}>
        {question.options.map(opt => (
          <button
            key={opt.value}
            id={`choice-${question.key}-${opt.value}`}
            className={`choice-btn ${value === opt.value ? 'choice-active' : ''}`}
            onClick={() => onChange(question.key, opt.value)}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
          >
            <span className="choice-label">{opt.label}</span>
            <span className="choice-sublabel">{opt.sublabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Feedback toast — auto-dismisses after 3 s or on any scroll.
 * No button: the note is a positive nudge, not a gate.
 * Only shown between steps (never on the final step).
 * Content is static strings from buildFeedback() — zero XSS surface.
 */
function FeedbackToast({ feedback, onDismiss }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!feedback) return;

    // Auto-dismiss after 3 seconds
    timerRef.current = setTimeout(onDismiss, 3000);

    // Dismiss immediately on any scroll
    const handleScroll = () => {
      clearTimeout(timerRef.current);
      onDismiss();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [feedback, onDismiss]);

  if (!feedback) return null;

  return (
    <div
      className="feedback-banner"
      role="status"
      aria-live="polite"
      aria-label="Step feedback"
    >
      <span className="feedback-emoji" aria-hidden="true">{feedback.emoji}</span>
      <div className="feedback-text">
        <strong className="feedback-headline">{feedback.headline}</strong>
        <span className="feedback-body">{feedback.body}</span>
      </div>
      <div className="feedback-timer-bar" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ASSISTANT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function Assistant({ habits, onHabitsChange, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [animating,   setAnimating]   = useState(false);
  const [feedback,    setFeedback]    = useState(null); // null = hidden; object = show toast

  const step       = STEPS[currentStep] ?? STEPS[0];
  const isLastStep = currentStep === STEPS.length - 1;

  const handleChange = useCallback((key, value) => {
    // Defensive: only accept keys that match an expected question key to prevent
    // prototype pollution or state injection through crafted key strings.
    const isValidKey = STEPS.some(s => s.questions.some(q => q.key === key));
    if (!isValidKey) return;
    onHabitsChange(prev => ({ ...prev, [key]: value }));
  }, [onHabitsChange]);

  /**
   * "Next" handler:
   * • On the final step: skip the toast and go straight to the dashboard.
   * • On all other steps: show the contextual positive note; the toast
   *   auto-dismisses after 3 s or on scroll, then transitions the step.
   */
  const handleNextClick = useCallback(() => {
    if (isLastStep) {
      // No toast on final submission — jump straight to results
      onComplete();
      return;
    }
    const msg = buildFeedback(step.id, habits);
    setFeedback(msg);
  }, [isLastStep, step.id, habits, onComplete]);

  /**
   * Called by FeedbackToast when it auto-dismisses (timer or scroll).
   * Performs the actual step-forward transition with a fade animation.
   */
  const handleFeedbackDismiss = useCallback(() => {
    setFeedback(null);
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep(s => s + 1);
      setAnimating(false);
    }, 230);
  }, []);

  const handleBack = useCallback(() => {
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep(s => Math.max(0, s - 1));
      setAnimating(false);
    }, 230);
  }, []);

  const handleTabJump = useCallback((idx) => {
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep(idx);
      setAnimating(false);
    }, 200);
  }, []);

  const progressPct = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <section className="assistant-container" aria-label="Eco-Query Assistant">
      {/* Contextual positive note — auto-hides on scroll or after 3 s; never shown on final step */}
      {feedback && (
        <FeedbackToast feedback={feedback} onDismiss={handleFeedbackDismiss} />
      )}

      {/* Progress bar */}
      <div
        className="assistant-progress-track"
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Assessment progress: step ${currentStep + 1} of ${STEPS.length}`}
      >
        <div className="assistant-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Step tab indicators */}
      <nav className="step-tabs" aria-label="Assessment steps">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            id={`step-tab-${s.id}`}
            className={`step-tab ${i === currentStep ? 'step-tab-active' : ''} ${i < currentStep ? 'step-tab-done' : ''}`}
            onClick={() => handleTabJump(i)}
            type="button"
            aria-current={i === currentStep ? 'step' : undefined}
            aria-label={`${i < currentStep ? 'Completed: ' : ''}Step ${i + 1}: ${s.title}`}
          >
            <span className="step-tab-icon" aria-hidden="true">
              {i < currentStep ? '✓' : s.icon}
            </span>
            <span className="step-tab-label">{s.title}</span>
          </button>
        ))}
      </nav>

      {/* Step card */}
      <div className={`step-card ${animating ? 'step-fade-out' : 'step-fade-in'}`}>
        <div className="step-header">
          <span className="step-icon-large" aria-hidden="true">{step.icon}</span>
          <div>
            <h2 className="step-title">{step.title}</h2>
            <p className="step-subtitle">{step.subtitle}</p>
          </div>
        </div>

        <div className="step-questions">
          {step.questions.map(q => {
            const val = habits[q.key] ?? q.default;
            return q.type === 'slider'
              ? <SliderQuestion key={q.key} question={q} value={val} onChange={handleChange} />
              : <ChoiceQuestion key={q.key} question={q} value={val} onChange={handleChange} />;
          })}
        </div>

        {/* Navigation */}
        <div className="step-nav">
          <button
            id="btn-prev-step"
            className="btn-ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
            type="button"
            aria-disabled={currentStep === 0}
          >
            ← Back
          </button>
          <span className="step-counter" aria-live="polite">
            {currentStep + 1} / {STEPS.length}
          </span>
          <button
            id="btn-next-step"
            className={`btn-primary ${isLastStep ? 'btn-complete' : ''}`}
            onClick={handleNextClick}
            type="button"
          >
            {isLastStep ? '🌿 See My Impact →' : 'Next →'}
          </button>
        </div>
      </div>
    </section>
  );
}
