/**
 * carbonMath.test.js — EcoByte Emission Engine Test Suite
 *
 * Framework: Vitest (via `npm test`)
 * Covers:    All exported functions, defensive null/zero/unknown-key inputs,
 *            and exact known-value assertions based on published coefficients.
 */

import { describe, it, expect } from 'vitest';
import {
  calcQuickCommerce,
  calcEcommerce,
  calcFoodDelivery,
  calcStreaming,
  calcTotalEmissions,
  simulateWhatIf,
  getFootprintRating,
  getEquivalencies,
  GLOBAL_WEEKLY_BENCHMARK,
  QUICK_COMMERCE_PER_ORDER,
  PACKAGING,
} from './carbonMath';

// ─────────────────────────────────────────────────────────────────────────────
// DEFENSIVE INPUT TESTS — null / undefined / zero / unknown keys
// ─────────────────────────────────────────────────────────────────────────────

describe('Defensive inputs — no NaN or crash on bad data', () => {
  it('calcQuickCommerce returns 0 for null inputs', () => {
    expect(calcQuickCommerce(null, null, null, null)).toBe(0);
  });

  it('calcQuickCommerce returns 0 for undefined inputs', () => {
    expect(calcQuickCommerce(undefined, undefined, undefined, undefined)).toBe(0);
  });

  it('calcQuickCommerce falls back to default vehicle on unknown key', () => {
    // unknown vehicle key → falls back to petrol_bike
    const withPetrol  = calcQuickCommerce(1, 'petrol_bike', 'plastic_container', 1);
    const withUnknown = calcQuickCommerce(1, 'hover_board', 'plastic_container', 1);
    expect(withUnknown).toBe(withPetrol);
  });

  it('calcEcommerce returns 0 for 0 parcels', () => {
    expect(calcEcommerce(0, 0.5, 500, 'two_day_ground')).toBe(0);
  });

  it('calcFoodDelivery returns 0 for 0 orders', () => {
    expect(calcFoodDelivery(0, 3, 'petrol_bike', 'plastic_container', 2)).toBe(0);
  });

  it('calcStreaming returns 0 for 0 hours', () => {
    expect(calcStreaming(0, 'hd_1080p')).toBe(0);
  });

  it('calcTotalEmissions does not crash on empty object', () => {
    const result = calcTotalEmissions({});
    expect(typeof result.total).toBe('number');
    expect(Number.isFinite(result.total)).toBe(true);
  });

  it('calcTotalEmissions does not crash on null', () => {
    const result = calcTotalEmissions(null);
    expect(Number.isFinite(result.total)).toBe(true);
  });

  it('simulateWhatIf returns empty array for zero-emission habits', () => {
    const habits = {
      quickOrders: 0, ecomOrders: 0, foodOrders: 0,
      streamHours: 0, callHours: 0, browseHours: 0, cloudGB: 0,
    };
    expect(simulateWhatIf(habits)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KNOWN-VALUE ASSERTIONS — based on documented emission factors
// ─────────────────────────────────────────────────────────────────────────────

describe('calcQuickCommerce — known values', () => {
  it('1 petrol_bike order, 1 plastic_container item', () => {
    // 1 × (0.42 + 0.12 × 1) = 0.54
    expect(calcQuickCommerce(1, 'petrol_bike', 'plastic_container', 1)).toBeCloseTo(0.54, 3);
  });

  it('3 petrol_bike orders, 3 plastic_container items', () => {
    // 3 × (0.42 + 0.12 × 3) = 3 × 0.78 = 2.34
    expect(calcQuickCommerce(3, 'petrol_bike', 'plastic_container', 3)).toBeCloseTo(2.34, 2);
  });

  it('EV bike emits less than petrol bike per order', () => {
    const petrol = calcQuickCommerce(5, 'petrol_bike', 'paper_bag', 1);
    const ev     = calcQuickCommerce(5, 'ev_bike', 'paper_bag', 1);
    expect(ev).toBeLessThan(petrol);
  });

  it('reusable containers emit less than plastic containers', () => {
    const plastic   = calcQuickCommerce(3, 'petrol_bike', 'plastic_container', 3);
    const reusable  = calcQuickCommerce(3, 'petrol_bike', 'reusable_container', 3);
    expect(reusable).toBeLessThan(plastic);
  });
});

describe('calcEcommerce — known values', () => {
  it('1 parcel, 0.5 kg, 500 km, two_day_ground', () => {
    // 1 × 0.5 × 0.21 × (500/500) = 0.105
    expect(calcEcommerce(1, 0.5, 500, 'two_day_ground')).toBeCloseTo(0.105, 3);
  });

  it('next_day_air emits more than no_rush_ground for same params', () => {
    const air   = calcEcommerce(2, 1, 500, 'next_day_air');
    const noRush = calcEcommerce(2, 1, 500, 'no_rush_ground');
    expect(air).toBeGreaterThan(noRush);
  });

  it('longer distance scales emission proportionally', () => {
    const d500  = calcEcommerce(1, 1, 500, 'two_day_ground');
    const d1000 = calcEcommerce(1, 1, 1000, 'two_day_ground');
    expect(d1000).toBeCloseTo(d500 * 2, 3);
  });
});

describe('calcFoodDelivery — known values', () => {
  it('cycle vehicle produces zero ride emission', () => {
    // Only packaging emission survives
    const result = calcFoodDelivery(1, 5, 'cycle', 'paper_bag', 1);
    // ride = 0.000 × 5 × 2 = 0; packaging = 0.0028 × 1 = 0.0028
    expect(result).toBeCloseTo(0.0028, 4);
  });

  it('electric bike emits less than petrol bike at same distance', () => {
    const petrol   = calcFoodDelivery(4, 3, 'petrol_bike', 'plastic_container', 2);
    const electric = calcFoodDelivery(4, 3, 'electric_bike', 'plastic_container', 2);
    expect(electric).toBeLessThan(petrol);
  });
});

describe('calcStreaming — known values', () => {
  it('2 hrs/day HD 1080p: 2 × 7 × 0.028 = 0.392 kg/week', () => {
    expect(calcStreaming(2, 'hd_1080p')).toBeCloseTo(0.392, 3);
  });

  it('4K HDR emits more than SD mobile', () => {
    const sd  = calcStreaming(2, 'sd_mobile');
    const hdr = calcStreaming(2, 'hdr_4k');
    expect(hdr).toBeGreaterThan(sd);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AGGREGATE & RATING TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('calcTotalEmissions — aggregation', () => {
  const habits = {
    quickOrders: 3,   quickVehicle: 'petrol_bike', quickPackaging: 'plastic_container', quickItems: 3,
    ecomOrders: 2,    ecomSpeed: 'two_day_ground', ecomWeight: 0.5, ecomDistance: 500,
    foodOrders: 4,    foodDistance: 3, foodVehicle: 'petrol_bike', foodPackaging: 'plastic_container', foodContainers: 2,
    streamHours: 2,   streamQuality: 'hd_1080p',
    callHours: 1,     callVideo: 'hd_video_on',
    cloudGB: 50,      browseHours: 2,
  };

  it('total is sum of all categories', () => {
    const result = calcTotalEmissions(habits);
    const catSum = result.quickCommerce + result.ecommerce + result.foodDelivery
      + result.streaming + result.videoCall + result.browsing + result.cloudStorage;
    expect(result.total).toBeCloseTo(catSum, 2);
  });

  it('annualTotal is weekly × 52', () => {
    const result = calcTotalEmissions(habits);
    expect(result.annualTotal).toBeCloseTo(result.total * 52, 0);
  });

  it('all category values are non-negative finite numbers', () => {
    const result = calcTotalEmissions(habits);
    ['quickCommerce','ecommerce','foodDelivery','streaming','videoCall','browsing','cloudStorage','total','annualTotal']
      .forEach(key => {
        expect(Number.isFinite(result[key])).toBe(true);
        expect(result[key]).toBeGreaterThanOrEqual(0);
      });
  });
});

describe('getFootprintRating', () => {
  it('returns Eco Champion for very low footprint', () => {
    expect(getFootprintRating(0.5).label).toBe('Eco Champion');
  });

  it('returns High Emitter for large footprint', () => {
    expect(getFootprintRating(10).label).toBe('High Emitter');
  });

  it('returns a valid color string for all rating tiers', () => {
    [0.5, 1.5, 3.0, 5.0, 8.0].forEach(kg => {
      const r = getFootprintRating(kg);
      expect(r.color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it('handles zero gracefully', () => {
    const r = getFootprintRating(0);
    expect(r.label).toBe('Eco Champion');
  });
});

describe('getEquivalencies', () => {
  it('returns finite non-negative numbers for all equivalencies', () => {
    const eq = getEquivalencies(5);
    ['smartphoneCharges','kmDriven','treeDays','cupsCoffee','plasticBags'].forEach(key => {
      expect(Number.isFinite(eq[key])).toBe(true);
      expect(eq[key]).toBeGreaterThanOrEqual(0);
    });
  });

  it('returns 0 for all equivalencies when input is 0', () => {
    const eq = getEquivalencies(0);
    expect(eq.smartphoneCharges).toBe(0);
    expect(eq.kmDriven).toBe(0);
  });
});

describe('simulateWhatIf', () => {
  const habits = {
    quickOrders: 5,   quickVehicle: 'petrol_bike', quickPackaging: 'plastic_container', quickItems: 3,
    ecomOrders: 3,    ecomSpeed: 'next_day_air',   ecomWeight: 1,   ecomDistance: 1000,
    foodOrders: 7,    foodDistance: 5, foodVehicle: 'petrol_bike', foodPackaging: 'plastic_container', foodContainers: 3,
    streamHours: 4,   streamQuality: 'uhd_4k',
    callHours: 3,     callVideo: 'hd_video_on',
    cloudGB: 200,     browseHours: 4,
  };

  it('returns an array of scenarios', () => {
    const scenarios = simulateWhatIf(habits);
    expect(Array.isArray(scenarios)).toBe(true);
    expect(scenarios.length).toBeGreaterThan(0);
  });

  it('scenarios are sorted descending by saving', () => {
    const scenarios = simulateWhatIf(habits);
    for (let i = 0; i < scenarios.length - 1; i++) {
      expect(scenarios[i].saving).toBeGreaterThanOrEqual(scenarios[i + 1].saving);
    }
  });

  it('each scenario saving is a positive finite number', () => {
    simulateWhatIf(habits).forEach(s => {
      expect(Number.isFinite(s.saving)).toBe(true);
      expect(s.saving).toBeGreaterThan(0);
    });
  });

  it('each scenario percent is between 0 and 100', () => {
    simulateWhatIf(habits).forEach(s => {
      expect(s.percent).toBeGreaterThan(0);
      expect(s.percent).toBeLessThanOrEqual(100);
    });
  });
});

describe('Constants — immutability', () => {
  it('QUICK_COMMERCE_PER_ORDER is frozen', () => {
    expect(Object.isFrozen(QUICK_COMMERCE_PER_ORDER)).toBe(true);
  });

  it('PACKAGING is frozen', () => {
    expect(Object.isFrozen(PACKAGING)).toBe(true);
  });

  it('GLOBAL_WEEKLY_BENCHMARK is a positive number', () => {
    expect(GLOBAL_WEEKLY_BENCHMARK).toBeGreaterThan(0);
  });
});
