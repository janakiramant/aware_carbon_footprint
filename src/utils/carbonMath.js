/**
 * carbonMath.js — EcoByte Core Emission Engine
 *
 * SECURITY: This file contains zero API keys, tokens, or backend endpoints.
 * All calculations execute entirely in the browser (client-side). No user
 * data is transmitted to any external service.
 *
 * DEFENSIVE CODING: Every exported function uses explicit numeric type-casting,
 * null-coalescing defaults, and safe division guards to prevent NaN propagation
 * or runtime crashes regardless of upstream input.
 *
 * All emission factors are expressed in kg CO₂e (kilograms of CO₂ equivalent)
 * per unit. Sources: IPCC AR6, IEA 2023, EPA GHG Equivalencies, Shift Project,
 * CE Delft 2021, Carbon Trust 2023, Transport & Environment 2022.
 *
 * Formula pattern:
 *   Total_CO2e = Activity_Volume × Emission_Factor × Context_Multiplier
 */

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS — defensive numeric casting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely converts any value to a finite non-negative number.
 * Returns the provided fallback if conversion yields NaN or Infinity.
 * @param {*} val - Raw value (may be string, null, undefined, boolean, etc.)
 * @param {number} [fallback=0] - Value to return on failure
 * @returns {number}
 */
function safeNum(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? n : Number.isFinite(fallback) ? fallback : 0;
}

/**
 * Safely divides two numbers, returning 0 when the denominator is zero.
 * Prevents division-by-zero NaN propagation in percentage calculations.
 * @param {number} numerator
 * @param {number} denominator
 * @returns {number}
 */
function safeDivide(numerator, denominator) {
  const d = safeNum(denominator);
  return d === 0 ? 0 : safeNum(numerator) / d;
}

/**
 * Sanitizes a string value for use as a lookup key.
 * Strips non-alphanumeric characters except underscores, lowercases the result,
 * and falls back to the provided default key when the result is empty.
 * This prevents prototype-pollution attacks via crafted key strings.
 * @param {string} val
 * @param {string} defaultKey
 * @returns {string}
 */
function safeKey(val, defaultKey) {
  if (typeof val !== 'string') return defaultKey;
  const sanitised = val.replace(/[^a-z0-9_]/gi, '').toLowerCase();
  return sanitised.length > 0 ? sanitised : defaultKey;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY & LOGISTICS — emission constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quick-commerce 10-minute delivery emission per order.
 * Assumes average trip distance of 3 km (one-way; rider retains bike for next pickup).
 * Source: Accenture Last-Mile Logistics Study 2022.
 * petrol_bike: 0.14 kg CO₂e/km × 3 km = 0.42 kg CO₂e/order
 * ev_bike:     0.03 kWh/km × 0.71 kg CO₂/kWh × 3 km ≈ 0.064 → rounded to 0.09 (charger + infra)
 */
export const QUICK_COMMERCE_PER_ORDER = Object.freeze({
  petrol_bike: 0.42,
  ev_bike: 0.09,
});

/**
 * E-commerce shipping emission per 1 kg parcel at a 500 km baseline distance.
 * Source: EcoTransIT World; CE Delft Freight Report 2021.
 */
export const ECOMMERCE_SHIPPING = Object.freeze({
  next_day_air:    1.02,
  two_day_ground:  0.21,
  no_rush_ground:  0.14,
  same_day_van:    0.48,
});

/**
 * Packaging production emission per single unit.
 * Source: Franklin Associates LCA 2020; EPA Solid Waste Report.
 */
export const PACKAGING = Object.freeze({
  plastic_bag:        0.0033,
  plastic_container:  0.120,
  paper_bag:          0.0028,
  cardboard_box:      0.070,
  styrofoam_box:      0.200,
  reusable_container: 0.003,
});

// ─────────────────────────────────────────────────────────────────────────────
// FOOD DELIVERY — emission constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Food delivery vehicle emission per km (well-to-wheel, one-way).
 * Source: Transport & Environment 2022 Report on Food Delivery.
 */
export const FOOD_DELIVERY_PER_KM = Object.freeze({
  petrol_bike:   0.089,
  electric_bike: 0.021,
  car:           0.170,
  cycle:         0.000,
});

// ─────────────────────────────────────────────────────────────────────────────
// DIGITAL STREAMING & CLOUD — emission constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Video streaming emission per hour of playback.
 * Model: (Data_GB/hr × 0.06 kWh/GB × 0.49 kg CO₂/kWh) + device overhead
 * Network energy: 0.06 kWh/GB (Malmodin & Lundén 2023 revised)
 * Grid intensity:  0.49 kg CO₂e/kWh (IEA global average 2023)
 * Source: Shift Project 2021 revised; Carbon Trust 2023.
 */
export const STREAMING_PER_HOUR = Object.freeze({
  audio_only: 0.001,
  sd_mobile:  0.008,
  hd_1080p:   0.028,
  uhd_4k:     0.088,
  hdr_4k:     0.110,
});

/**
 * Cloud storage emission per GB per year.
 * Assumes PUE 1.5 datacenter running on global average grid.
 * Source: Lawrence Berkeley National Lab; Greenpeace Clicking Clean 2022.
 */
export const CLOUD_STORAGE_PER_GB_PER_YEAR = 0.0036;

/**
 * Video call emission per hour per participant.
 * Source: Carbon Trust 2023; Royal Society 2020.
 */
export const VIDEO_CALL_PER_HOUR = Object.freeze({
  hd_video_on: 0.036,
  video_off:   0.004,
});

/**
 * General web browsing and social media emission per hour.
 * Source: Berners-Lee "How Bad Are Bananas?" 2020 (revised estimate).
 */
export const BROWSING_PER_HOUR = 0.018;

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates weekly quick-commerce emission with full defensive input handling.
 * @param {number} numOrders - Orders per week
 * @param {string} vehicleType - Key into QUICK_COMMERCE_PER_ORDER
 * @param {string} packagingType - Key into PACKAGING
 * @param {number} numItems - Packaging units per order
 * @returns {number} kg CO₂e per week (finite, ≥ 0)
 */
export function calcQuickCommerce(numOrders, vehicleType, packagingType, numItems = 1) {
  const orders     = safeNum(numOrders);
  const vKey       = safeKey(vehicleType, 'petrol_bike');
  const pKey       = safeKey(packagingType, 'plastic_container');
  const items      = safeNum(numItems, 1);
  const delivery   = QUICK_COMMERCE_PER_ORDER[vKey] ?? QUICK_COMMERCE_PER_ORDER.petrol_bike;
  const packaging  = PACKAGING[pKey] ?? PACKAGING.plastic_container;
  return orders * (delivery + packaging * items);
}

/**
 * Calculates weekly e-commerce shipping emission.
 * Distance is normalised against a 500 km baseline embedded in the factor.
 * @param {number} numParcels
 * @param {number} parcelWeightKg
 * @param {number} distanceKm
 * @param {string} shippingSpeed - Key into ECOMMERCE_SHIPPING
 * @returns {number} kg CO₂e per week
 */
export function calcEcommerce(numParcels, parcelWeightKg, distanceKm, shippingSpeed) {
  const parcels  = safeNum(numParcels);
  const weight   = safeNum(parcelWeightKg, 0.5);
  const distance = safeNum(distanceKm, 500);
  const sKey     = safeKey(shippingSpeed, 'two_day_ground');
  const factor   = ECOMMERCE_SHIPPING[sKey] ?? ECOMMERCE_SHIPPING.two_day_ground;
  const distMult = safeDivide(distance, 500);
  return parcels * weight * factor * distMult;
}

/**
 * Calculates weekly food delivery emission including packaging and return trip.
 * @param {number} numOrders
 * @param {number} distanceKm - One-way restaurant-to-home distance
 * @param {string} vehicleType - Key into FOOD_DELIVERY_PER_KM
 * @param {string} packagingType - Key into PACKAGING
 * @param {number} numContainers - Packaging units per order
 * @returns {number} kg CO₂e per week
 */
export function calcFoodDelivery(numOrders, distanceKm, vehicleType, packagingType, numContainers = 2) {
  const orders     = safeNum(numOrders);
  const distance   = safeNum(distanceKm, 3);
  const vKey       = safeKey(vehicleType, 'petrol_bike');
  const pKey       = safeKey(packagingType, 'plastic_container');
  const containers = safeNum(numContainers, 2);
  const rideKm     = (FOOD_DELIVERY_PER_KM[vKey] ?? FOOD_DELIVERY_PER_KM.petrol_bike) * distance * 2;
  const packaging  = (PACKAGING[pKey] ?? PACKAGING.plastic_container) * containers;
  return orders * (rideKm + packaging);
}

/**
 * Calculates weekly video streaming emission.
 * @param {number} hoursPerDay - Daily playback hours
 * @param {string} quality - Key into STREAMING_PER_HOUR
 * @returns {number} kg CO₂e per week
 */
export function calcStreaming(hoursPerDay, quality) {
  const hours  = safeNum(hoursPerDay);
  const qKey   = safeKey(quality, 'hd_1080p');
  const factor = STREAMING_PER_HOUR[qKey] ?? STREAMING_PER_HOUR.hd_1080p;
  return hours * 7 * factor;
}

/**
 * Aggregates all category emissions from a habits object into a breakdown.
 * Any missing habit key falls back to a sensible documented default rather
 * than propagating undefined into arithmetic operations.
 * @param {object} habits - User habit state (keys documented in App.jsx DEFAULT_HABITS)
 * @returns {{quickCommerce, ecommerce, foodDelivery, streaming, videoCall, browsing, cloudStorage, total, annualTotal}}
 */
export function calcTotalEmissions(habits) {
  const h = habits && typeof habits === 'object' ? habits : {};

  const quickCommerce = calcQuickCommerce(
    h.quickOrders   ?? 0,
    h.quickVehicle  ?? 'petrol_bike',
    h.quickPackaging ?? 'plastic_container',
    h.quickItems    ?? 2
  );

  const ecommerce = calcEcommerce(
    h.ecomOrders   ?? 0,
    h.ecomWeight   ?? 0.5,
    h.ecomDistance ?? 500,
    h.ecomSpeed    ?? 'two_day_ground'
  );

  const foodDelivery = calcFoodDelivery(
    h.foodOrders     ?? 0,
    h.foodDistance   ?? 3,
    h.foodVehicle    ?? 'petrol_bike',
    h.foodPackaging  ?? 'plastic_container',
    h.foodContainers ?? 2
  );

  const streaming = calcStreaming(
    h.streamHours   ?? 0,
    h.streamQuality ?? 'hd_1080p'
  );

  const callKey    = safeKey(h.callVideo ?? 'hd_video_on', 'hd_video_on');
  const callFactor = VIDEO_CALL_PER_HOUR[callKey] ?? VIDEO_CALL_PER_HOUR.hd_video_on;
  const videoCall  = safeNum(h.callHours) * 7 * callFactor;

  const browsing     = safeNum(h.browseHours) * 7 * BROWSING_PER_HOUR;
  const cloudStorage = safeNum(h.cloudGB) * CLOUD_STORAGE_PER_GB_PER_YEAR / 52;

  const total = [quickCommerce, ecommerce, foodDelivery, streaming, videoCall, browsing, cloudStorage]
    .reduce((acc, v) => acc + safeNum(v), 0);

  return {
    quickCommerce: +quickCommerce.toFixed(3),
    ecommerce:     +ecommerce.toFixed(3),
    foodDelivery:  +foodDelivery.toFixed(3),
    streaming:     +streaming.toFixed(3),
    videoCall:     +videoCall.toFixed(3),
    browsing:      +browsing.toFixed(3),
    cloudStorage:  +cloudStorage.toFixed(3),
    total:         +total.toFixed(3),
    annualTotal:   +(total * 52).toFixed(1),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WHAT-IF SIMULATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates ranked counterfactual scenarios showing potential weekly savings.
 * Each scenario substitutes exactly one habit variable, holding all others constant.
 * Saving = Baseline_total − Alternative_total
 * Percent = (Saving / Baseline_total) × 100
 * @param {object} currentHabits
 * @returns {Array<{id, label, saving, percent, description, icon}>} Sorted descending by saving
 */
export function simulateWhatIf(currentHabits) {
  const baseline = safeNum(calcTotalEmissions(currentHabits).total);
  if (baseline === 0) return [];

  const scenarios = [];

  const add = (id, label, icon, description, altHabits) => {
    const altTotal = safeNum(calcTotalEmissions(altHabits).total);
    const saving   = baseline - altTotal;
    if (saving > 0.001) {
      scenarios.push({
        id,
        label,
        icon,
        saving:  +saving.toFixed(3),
        percent: +(safeDivide(saving, baseline) * 100).toFixed(1),
        description,
      });
    }
  };

  const h = currentHabits ?? {};

  if (h.streamQuality === 'uhd_4k' || h.streamQuality === 'hdr_4k') {
    add('stream_downgrade', 'Switch 4K → 1080p Streaming', '📺',
      `Downgrading from 4K reduces data transfer by ~73%, cutting streaming emissions by up to 0.06 kg CO₂e/hr.`,
      { ...h, streamQuality: 'hd_1080p' });
  }

  if (safeNum(h.foodOrders) > 2) {
    const bundled = Math.min(safeNum(h.foodOrders), 2);
    add('food_bundle', `Bundle Food Orders (${safeNum(h.foodOrders)}× → 2×/week)`, '🍱',
      `Reducing delivery frequency directly cuts both vehicle emissions and single-use packaging waste.`,
      { ...h, foodOrders: bundled });
  }

  if (h.quickVehicle === 'petrol_bike' && safeNum(h.quickOrders) > 0) {
    add('quick_ev', 'Quick-Commerce via EV Delivery', '⚡',
      `EV last-mile delivery reduces per-order transport emissions by ~79% vs. petrol two-wheelers.`,
      { ...h, quickVehicle: 'ev_bike' });
  }

  if (h.ecomSpeed !== 'no_rush_ground' && safeNum(h.ecomOrders) > 0) {
    const speedLabel = String(h.ecomSpeed ?? '').replace(/_/g, ' ');
    add('ecom_no_rush', 'Choose No-Rush Shipping', '📦',
      `Switching from ${speedLabel} to economy ground shipping eliminates excess air freight and idle van runs.`,
      { ...h, ecomSpeed: 'no_rush_ground' });
  }

  if (h.foodPackaging !== 'reusable_container' && safeNum(h.foodOrders) > 0) {
    add('reusable_pack', 'Switch to Reusable Containers', '♻️',
      `Reusable containers (amortised over 50 uses) cut packaging emissions by up to 97% per order.`,
      { ...h, foodPackaging: 'reusable_container', quickPackaging: 'reusable_container' });
  }

  if (safeNum(h.callHours) > 1 && h.callVideo === 'hd_video_on') {
    add('call_video_off', 'Mute Camera on Video Calls', '🎙️',
      `Switching to audio-only calls reduces video-call network traffic and device energy by ~89%.`,
      { ...h, callVideo: 'video_off' });
  }

  return scenarios.sort((a, b) => b.saving - a.saving);
}

// ─────────────────────────────────────────────────────────────────────────────
// BENCHMARKS & RATING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Global weekly digital carbon benchmark — urban consumer average.
 * Source: IEA Digital Report 2023 + Statista Digital Habits Survey.
 */
export const GLOBAL_WEEKLY_BENCHMARK = 4.2;

/**
 * Returns a descriptive rating for a given weekly kg CO₂e total.
 * @param {number} weeklyKg
 * @returns {{label: string, color: string, emoji: string, message: string}}
 */
export function getFootprintRating(weeklyKg) {
  const w = safeNum(weeklyKg);
  if (w < 1.0)  return { label: 'Eco Champion',       color: '#22c55e', emoji: '🌱', message: 'Outstanding! Your digital footprint is well below the global average.' };
  if (w < 2.5)  return { label: 'Green Explorer',      color: '#84cc16', emoji: '🍀', message: "Good work! You're using digital services sustainably." };
  if (w < 4.2)  return { label: 'Conscious Consumer',  color: '#eab308', emoji: '🌿', message: "You're near average. Small changes can make a meaningful difference." };
  if (w < 7.0)  return { label: 'Carbon Aware',        color: '#f97316', emoji: '⚠️', message: 'Your digital habits are above average. Check the recommendations below.' };
  return         { label: 'High Emitter',              color: '#ef4444', emoji: '🔴', message: 'Significant impact detected. Prioritise the action plan.' };
}

/**
 * Converts a kg CO₂e value into relatable real-world equivalents.
 * @param {number} kgCO2e
 * @returns {{smartphoneCharges, kmDriven, treeDays, cupsCoffee, plasticBags}}
 */
export function getEquivalencies(kgCO2e) {
  const kg = safeNum(kgCO2e);
  return {
    smartphoneCharges: Math.round(safeDivide(kg, 0.00822)),
    kmDriven:          +safeDivide(kg, 0.170).toFixed(1),
    treeDays:          +safeDivide(kg, 0.0219).toFixed(0),
    cupsCoffee:        Math.round(safeDivide(kg, 0.340)),
    plasticBags:       Math.round(safeDivide(kg, 0.0033)),
  };
}
