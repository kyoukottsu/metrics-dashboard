/**
 * kpiLogic.js
 * Centralized logic for calculating KPI behaviors using the Strategy Pattern.
 */

// ── AGGREGATORS (Pure and Testable Logic) ───────────────────────────────────

const Aggregators = {
  /** Sums up values/results */
  SUM: (data) => data.reduce((a, b) => a + (b || 0), 0),
  
  /** Calculates average of values */
  AVG: (data) => data.length ? data.reduce((a, b) => a + (b || 0), 0) / data.length : 0,
  
  /** Returns the most recent value in the array (already sorted desc) */
  LATEST: (data) => (data && data.length > 0 ? data[0] : 0),
  
  /** Simple count of occurrences */
  COUNT: (data) => data.length,
};

// ── STRATEGIES ─────────────────────────────────────────────────────────────

const KPI_STRATEGIES = {
    // Sum-based strategies (Use result if available, else value)
    cumulative:   { extract: 'any', aggregate: Aggregators.SUM },
    weighted:     { extract: 'any', aggregate: Aggregators.SUM },
    period_val:   { extract: 'any', aggregate: Aggregators.SUM },
    duration:     { extract: 'any', aggregate: Aggregators.SUM },
    auto_reset:   { extract: 'any', aggregate: Aggregators.SUM },
    composite:    { extract: 'any', aggregate: Aggregators.SUM },
    formula:      { extract: 'any', aggregate: Aggregators.SUM },

    // Average-based strategies (Usually percentages or rates)
    average:      { extract: 'value', aggregate: Aggregators.AVG },
    hybrid:       { extract: 'value', aggregate: Aggregators.AVG },

    // Latest value strategies
    snapshot:      { extract: 'any', aggregate: Aggregators.LATEST },
    state:         { extract: 'any', aggregate: Aggregators.LATEST, transform: (v) => v > 0 },
    min_threshold: { extract: 'any', aggregate: Aggregators.LATEST, transform: (v, target) => v >= target },
    max_control:   { extract: 'any', aggregate: Aggregators.LATEST, transform: (v, target) => v <= target },

    // Comparison strategies (Require at least 2 points)
    differential: {
        custom: (metrics) => {
            if (metrics.length < 2) return 0;
            const v1 = metrics[0].result || metrics[0].value;
            const v2 = metrics[1].result || metrics[1].value;
            return v1 - v2;
        }
    },
    tendency: {
        custom: (metrics) => {
            if (metrics.length < 2) return 0;
            const v1 = metrics[0].result || metrics[0].value;
            const v2 = metrics[1].result || metrics[1].value;
            const d = v1 - v2;
            return d > 0 ? 1 : d < 0 ? -1 : 0;
        }
    },

    // Special logics
    count:    { aggregate: (data, metrics) => metrics.length },
    progress: { 
        extract: 'any', 
        aggregate: (data, metrics, target) => (target > 0 ? (Aggregators.SUM(data) / target) * 100 : 0) 
    },
    
    // Corrected calc_pct: Sum(result) / Sum(value) if performance is percentage-based
    calc_pct: {
      custom: (metrics) => {
        const totalResult = metrics.reduce((s, m) => s + (m.result || 0), 0);
        const totalValue  = metrics.reduce((s, m) => s + (m.value || 0), 0);
        return totalValue > 0 ? (totalResult / totalValue) * 100 : 0;
      }
    }
};

// ── CATEGORIZATION METADATA (For UI Context) ────────────────────────────────

/** Behaviors that primary use the Result (Count/Raw) field */
export const RESULT_REQUIRED_BEHAVIORS = Object.keys(KPI_STRATEGIES).filter(k => 
    KPI_STRATEGIES[k].extract === 'any' || 
    ['cumulative', 'count', 'progress', 'weighted', 'calc_pct'].includes(k)
);

/** Behaviors that primary use the Value (Percentage/Performance) field */
export const VALUE_REQUIRED_BEHAVIORS = Object.keys(KPI_STRATEGIES).filter(k => 
    KPI_STRATEGIES[k].extract === 'value' || 
    ['average', 'hybrid', 'calc_pct'].includes(k)
);

/** Behaviors that specifically benefit from showing both fields concurrently */
export const BOTH_REQUIRED_BEHAVIORS = ['calc_pct', 'progress', 'weighted'];

// ── ENGINE ──────────────────────────────────────────────────────────────────

/**
 * Calculates the KPI value based on its behavior type using Strategy Pattern.
 */
export const calculateKPIValue = (metrics, behavior, startDate, endDate, targetValue = 0) => {
  const periodMetrics = metrics
    .filter(m => m.timestamp >= startDate && m.timestamp <= endDate)
    .sort((a, b) => b.timestamp - a.timestamp); // Latest first
  
  if (periodMetrics.length === 0) {
      if (['state', 'min_threshold', 'max_control'].includes(behavior)) return false;
      return 0;
  }

  const strategy = KPI_STRATEGIES[behavior] || { extract: 'any', aggregate: Aggregators.SUM };

  if (strategy.custom) return strategy.custom(periodMetrics, targetValue);

  const data = periodMetrics.map(m => {
      if (strategy.extract === 'any') return m.result !== undefined && m.result !== 0 ? m.result : m.value;
      return m[strategy.extract || 'value'];
  });

  const result = strategy.aggregate(data, periodMetrics, targetValue);
  return strategy.transform ? strategy.transform(result, targetValue) : result;
};
