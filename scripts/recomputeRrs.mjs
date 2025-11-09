import fs from 'fs';
import path from 'path';
import process from 'process';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_EFFECT_WINDOW = 9;
const MIN_GAP_DAYS = 3;
const SIGMOID_K = 2;
const SIGMOID_X0 = 0.5;
const COEFFICIENTS_V1 = {
  mas: 1.2,
  plateau: 0.8,
  deficit: 0.5,
  training: 0.3,
};
const COEFFICIENTS_V2 = {
  mas: 1.0,
  plateau: 0.7,
  deficit: 0.3,
  training: 0.2,
  cooldown: 1.6,
  response: 0.6,
};
const NORMALISERS = {
  temp: 0.3,
  rhr: 0.5,
};
const WEIGHTS = {
  temp: 0.6,
  rhr: 0.4,
};
const THRESHOLDS = {
  on: 0.71,
  off: 0.65,
  delta: 0.03,
};
const LOCK_PENALTY = 2.5;

function loadEnv() {
  const candidates = ['.env.local', '.env'];
  for (const filename of candidates) {
    const filepath = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(filepath)) continue;
    const contents = fs.readFileSync(filepath, 'utf8');
    for (const line of contents.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim().replace(/^"|"$/g, '');
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-SIGMOID_K * (x - SIGMOID_X0)));
}

function computeBaseline(values) {
  if (!values.length) return null;
  if (values.length === 1) {
    const v = values[0];
    return { mean: v, sd: Math.max(Math.abs(v) * 0.05, 1e-6) };
  }
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return { mean, sd: Math.sqrt(Math.max(variance, 1e-6)) };
}

function removeOutliers(values) {
  if (values.length < 4) return values;
  const stats = computeBaseline(values);
  if (!stats) return values;
  const threshold = 3 * stats.sd;
  return values.filter((value) => Math.abs(value - stats.mean) <= threshold);
}

function calculateZ(value, stats) {
  if (value === null || value === undefined || !stats) return 0;
  const sd = stats.sd || 1;
  return (value - stats.mean) / sd;
}

function sortedMetrics(metrics) {
  return metrics
    .slice()
    .filter((metric) => metric.date)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function computeSevenDaySlope(points) {
  const n = points.length;
  const sumX = points.reduce((acc, point) => acc + point.x, 0);
  const sumY = points.reduce((acc, point) => acc + point.y, 0);
  const sumXY = points.reduce((acc, point) => acc + point.x * point.y, 0);
  const sumX2 = points.reduce((acc, point) => acc + point.x ** 2, 0);
  const denominator = n * sumX2 - sumX ** 2;
  if (denominator === 0) return 0;
  return (n * sumXY - sumX * sumY) / denominator;
}

function calculatePlateauFlag(metrics) {
  const weightMetrics = metrics
    .filter((metric) => metric.weight_kg !== null && metric.weight_kg !== undefined)
    .map((metric) => ({ date: metric.date, weight: metric.weight_kg }));
  if (weightMetrics.length < 7) {
    return false;
  }
  const lastSeven = weightMetrics.slice(-7);
  const slopePoints = lastSeven.map((metric, index) => ({ x: index, y: metric.weight }));
  const slope = computeSevenDaySlope(slopePoints);
  const avgWeight = lastSeven.reduce((sum, metric) => sum + metric.weight, 0) / lastSeven.length;
  const slopePercentPerDay = avgWeight > 0 ? slope / avgWeight : 0;

  let weeklyDropPercent = -Infinity;
  if (weightMetrics.length >= 14) {
    const previous = weightMetrics.slice(-14, -7);
    const prevAvg = previous.reduce((sum, metric) => sum + metric.weight, 0) / previous.length;
    const currentAvg = avgWeight;
    weeklyDropPercent = prevAvg > 0 ? ((prevAvg - currentAvg) / prevAvg) * 100 : -Infinity;
  }
  const slopeCondition = slopePercentPerDay >= -0.0002;
  const weeklyDropCondition = weeklyDropPercent > -0.5;
  return slopeCondition && weeklyDropCondition;
}

function computeDeficitStreak(metrics) {
  let streak = 0;
  const reversed = metrics.slice().reverse();
  for (const metric of reversed) {
    const target = metric.energy_expenditure_kcal;
    const intake = metric.calorie_intake_kcal;
    if (!target || !intake) {
      break;
    }
    const deficit = target - intake;
    if (deficit > 300) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

function computeTrainingLoadFactor(metrics) {
  const lastSeven = metrics
    .slice()
    .reverse()
    .filter((metric) => metric.training_load !== null && metric.training_load !== undefined)
    .slice(0, 7);
  if (lastSeven.length === 0) return 0;
  const averageLoad =
    lastSeven.reduce((sum, metric) => sum + (metric.training_load ?? 0), 0) / lastSeven.length;
  return Math.min(averageLoad / 500, 1);
}

function calculateScores(metrics) {
  const orderedMetrics = sortedMetrics(metrics);
  const metricKeys = ['temp_c', 'rhr_bpm', 'hrv_ms', 'sleep_min', 'fatigue_1_5'];
  const zScores = {};
  for (const key of metricKeys) {
    const values = orderedMetrics
      .map((metric) => metric[key])
      .filter((value) => value !== null && value !== undefined);
    if (values.length === 0) {
      zScores[key] = 0;
      continue;
    }
    const trimmed = removeOutliers(values).slice(-28);
    const baseline = computeBaseline(trimmed) ?? computeBaseline(values);
    const latest = orderedMetrics[orderedMetrics.length - 1]?.[key] ?? null;
    const zScore = calculateZ(latest, baseline);
    zScores[key] = Number.isFinite(zScore) ? zScore : 0;
  }
  const mas =
    0.35 * (-(zScores.temp_c ?? 0)) +
    0.25 * (zScores.rhr_bpm ?? 0) +
    0.15 * (-(zScores.hrv_ms ?? 0)) +
    0.15 * (-(zScores.sleep_min ?? 0)) +
    0.1 * (zScores.fatigue_1_5 ?? 0);
  const plateauFlag = calculatePlateauFlag(orderedMetrics);
  const deficitStreak = computeDeficitStreak(orderedMetrics);
  const trainingLoadFactor = computeTrainingLoadFactor(orderedMetrics);
  const normalizedDeficit = Math.min(deficitStreak / 14, 1);
  const scoreInput =
    COEFFICIENTS_V1.mas * mas +
    COEFFICIENTS_V1.plateau * (plateauFlag ? 1 : 0) +
    COEFFICIENTS_V1.deficit * normalizedDeficit +
    COEFFICIENTS_V1.training * trainingLoadFactor;
  const rrs = sigmoid(scoreInput);
  return {
    mas,
    rrs,
    plateauFlag,
    deficitStreak,
    trainingLoadFactor,
  };
}

function daysBetween(a, b) {
  const start = new Date(a + 'T00:00:00');
  const end = new Date(b + 'T00:00:00');
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function dateWithOffset(base, offset) {
  const date = new Date(base + 'T00:00:00');
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function sortMetrics(metrics) {
  return metrics.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function computeBaselineFromSeries(metrics, key) {
  const sorted = sortMetrics(metrics);
  const series = [];
  const values = sorted
    .map((item) => item[key])
    .filter((value) => value !== null && value !== undefined);
  const windowed = values.slice(-28);
  const baseline = computeBaseline(windowed.length ? windowed : values);
  if (!baseline) {
    return series;
  }
  const { mean, sd } = baseline;
  sorted.forEach((metric) => {
    const raw = metric[key];
    if (raw === null || raw === undefined) return;
    const z = (raw - mean) / (sd || 1);
    series.push({ date: metric.date, z });
  });
  return series;
}

function buildZSeries(metrics, existing) {
  const result = {
    temp_c: [],
    rhr_bpm: [],
  };
  if (existing?.temp_c?.length) {
    result.temp_c = existing.temp_c;
  } else if (metrics) {
    result.temp_c = computeBaselineFromSeries(metrics, 'temp_c');
  }
  if (existing?.rhr_bpm?.length) {
    result.rhr_bpm = existing.rhr_bpm;
  } else if (metrics) {
    result.rhr_bpm = computeBaselineFromSeries(metrics, 'rhr_bpm');
  }
  return result;
}

function average(series, start, end) {
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  const filtered = series.filter((point) => {
    const pointDate = new Date(point.date + 'T00:00:00');
    return pointDate >= startDate && pointDate <= endDate;
  });
  if (!filtered.length) {
    return { value: null, count: 0 };
  }
  const value = filtered.reduce((sum, point) => sum + point.z, 0) / Math.max(filtered.length, 1);
  return { value, count: filtered.length };
}

function computeRefeedResponse(series, refeedDate) {
  const preStart = dateWithOffset(refeedDate, -2);
  const preEnd = refeedDate;
  const postStart = dateWithOffset(refeedDate, 1);
  const postEnd = dateWithOffset(refeedDate, 3);
  const tempSeries = series.temp_c ?? [];
  const rhrSeries = series.rhr_bpm ?? [];
  const preTemp = average(tempSeries, preStart, preEnd);
  const postTemp = average(tempSeries, postStart, postEnd);
  const preRhr = average(rhrSeries, preStart, preEnd);
  const postRhr = average(rhrSeries, postStart, postEnd);
  const observedDays = Math.max(postTemp.count, postRhr.count);
  if (observedDays < 2) {
    return { response: 0, observedDays, extendedWindow: 2 };
  }
  const deltaTemp =
    postTemp.value !== null && preTemp.value !== null ? postTemp.value - preTemp.value : 0;
  const deltaRhr =
    postRhr.value !== null && preRhr.value !== null ? postRhr.value - preRhr.value : 0;
  const gTemp = Math.max(-2, Math.min(2, deltaTemp / NORMALISERS.temp));
  const gRhr = Math.max(-2, Math.min(2, -deltaRhr / NORMALISERS.rhr));
  const weighted = (WEIGHTS.temp * gTemp + WEIGHTS.rhr * gRhr) / (WEIGHTS.temp + WEIGHTS.rhr);
  const response = Math.max(-0.5, Math.min(0.5, weighted));
  return { response, observedDays, extendedWindow: 0 };
}

function computeRRSv2(input) {
  const {
    today,
    mas,
    plateauFlag,
    deficitStreak,
    trainingLoadFactor,
    lastRefeedDate,
    refeedEffectWindow,
    metrics,
    zSeries,
  } = input;
  const series = buildZSeries(metrics, zSeries);
  const hasRefeed = Boolean(lastRefeedDate);
  const baseWindow = refeedEffectWindow ?? DEFAULT_EFFECT_WINDOW;
  let effectiveWindow = baseWindow;
  let daysSinceRefeed = Infinity;
  if (lastRefeedDate) {
    daysSinceRefeed = Math.max(daysBetween(lastRefeedDate, today), 0);
  }
  const hardLocked = hasRefeed && daysSinceRefeed < MIN_GAP_DAYS;
  const cooldown = hasRefeed ? Math.max(0, Math.min(1, 1 - daysSinceRefeed / effectiveWindow)) : 0;
  let response = 0;
  let observedDays = 0;
  if (hasRefeed && lastRefeedDate) {
    const { response: computed, observedDays: observed, extendedWindow } = computeRefeedResponse(
      series,
      lastRefeedDate,
    );
    response = computed;
    observedDays = observed;
    if (extendedWindow > 0) {
      effectiveWindow += extendedWindow;
    }
  }
  let deficitUsed = deficitStreak;
  if (hasRefeed && daysSinceRefeed >= 0 && daysSinceRefeed < 3) {
    deficitUsed *= 0.5;
  }
  const normalizedDeficit = Math.max(0, Math.min(1, deficitUsed / 14));
  const baseInput =
    COEFFICIENTS_V2.mas * mas +
    COEFFICIENTS_V2.plateau * (plateauFlag ? 1 : 0) +
    COEFFICIENTS_V2.deficit * normalizedDeficit +
    COEFFICIENTS_V2.training * trainingLoadFactor;
  const adjusted =
    baseInput - COEFFICIENTS_V2.cooldown * cooldown + COEFFICIENTS_V2.response * response;
  const rrs = hardLocked ? 0 : sigmoid(adjusted);
  const inCooldown = cooldown > 0;
  const displayRrs = inCooldown ? Math.min(rrs, THRESHOLDS.on - 0.01) : rrs;
  const effectiveInput = inCooldown ? adjusted - LOCK_PENALTY : adjusted;
  const effectiveRrs = hardLocked ? 0 : sigmoid(effectiveInput);
  return {
    rrs,
    rrsInput: adjusted,
    cooldown,
    response,
    hardLocked,
    effectiveWindow,
    observedDays,
    displayRrs,
    effectiveRrs,
    thresholdOn: THRESHOLDS.on,
    thresholdOff: THRESHOLDS.off,
    thresholdDelta: THRESHOLDS.delta,
  };
}

function toNumberOrNull(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください。');
  }
  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('メトリクスを取得中...');
  const { data: metricsData, error: metricsError } = await supabase
    .from('metrics_daily')
    .select('*')
    .order('user_id', { ascending: true })
    .order('date', { ascending: true });
  if (metricsError) {
    throw metricsError;
  }

  console.log('リフィード実施履歴を取得中...');
  const { data: executions, error: execError } = await supabase
    .from('recommendations')
    .select('user_id, date, executed, executed_at, refeed_effect_window')
    .eq('executed', true)
    .order('user_id', { ascending: true })
    .order('date', { ascending: true });
  if (execError) {
    throw execError;
  }

  const metricsByUser = new Map();
  for (const row of metricsData ?? []) {
    if (!metricsByUser.has(row.user_id)) {
      metricsByUser.set(row.user_id, []);
    }
    const list = metricsByUser.get(row.user_id);
    list.push({
      date: row.date,
      weight_kg: toNumberOrNull(row.weight_kg),
      rhr_bpm: toNumberOrNull(row.rhr_bpm),
      temp_c: toNumberOrNull(row.temp_c),
      hrv_ms: toNumberOrNull(row.hrv_ms),
      sleep_min: toNumberOrNull(row.sleep_min),
      fatigue_1_5: toNumberOrNull(row.fatigue_1_5),
      training_load: toNumberOrNull(row.training_load),
      calorie_intake_kcal: toNumberOrNull(row.calorie_intake_kcal),
      energy_expenditure_kcal: toNumberOrNull(row.energy_expenditure_kcal),
    });
  }

  const executedByUser = new Map();
  for (const row of executions ?? []) {
    if (!executedByUser.has(row.user_id)) {
      executedByUser.set(row.user_id, []);
    }
    const list = executedByUser.get(row.user_id);
    const executedDate = row.executed_at ? row.executed_at.slice(0, 10) : row.date;
    list.push({
      date: row.date,
      executedDate,
      window: row.refeed_effect_window ?? DEFAULT_EFFECT_WINDOW,
    });
  }

  console.log('スコアを再計算しています...');
  const upserts = [];
  for (const [userId, metricList] of metricsByUser.entries()) {
    metricList.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const accumulator = [];
    const executedList = (executedByUser.get(userId) ?? []).sort((a, b) =>
      a.executedDate < b.executedDate ? -1 : a.executedDate > b.executedDate ? 1 : 0,
    );
    for (const metric of metricList) {
      accumulator.push(metric);
      const { mas, rrs, plateauFlag, deficitStreak, trainingLoadFactor } = calculateScores(
        accumulator,
      );
      const lastExecuted = [...executedList]
        .filter((item) => item.executedDate <= metric.date)
        .slice(-1)[0];
      const rrsResult = computeRRSv2({
        today: metric.date,
        mas,
        plateauFlag,
        deficitStreak,
        trainingLoadFactor,
        lastRefeedDate: lastExecuted ? lastExecuted.executedDate : null,
        refeedEffectWindow: lastExecuted ? lastExecuted.window : undefined,
        metrics: accumulator,
      });
      upserts.push({
        user_id: userId,
        date: metric.date,
        plateau_flag: plateauFlag,
        mas: Number.isFinite(mas) ? Number(mas.toFixed(6)) : null,
        rrs: Number.isFinite(rrs) ? Number(rrs.toFixed(6)) : null,
        rrs_v2: Number.isFinite(rrsResult.rrs) ? Number(rrsResult.rrs.toFixed(6)) : null,
        refeed_cooldown: Number.isFinite(rrsResult.cooldown)
          ? Number(rrsResult.cooldown.toFixed(6))
          : null,
        refeed_response: Number.isFinite(rrsResult.response)
          ? Number(rrsResult.response.toFixed(6))
          : null,
      });
    }
  }

  console.log(`計算完了。${upserts.length} 件のスコアを更新します...`);
  const batchSize = 500;
  for (let i = 0; i < upserts.length; i += batchSize) {
    const chunk = upserts.slice(i, i + batchSize);
    const { error } = await supabase.from('scores').upsert(chunk, { onConflict: 'user_id,date' });
    if (error) {
      console.error('Upsert error:', error);
      throw error;
    }
    console.log(`  -> ${i + chunk.length}/${upserts.length} 件 更新`);
  }

  console.log('再計算が完了しました。');
}

main().catch((error) => {
  console.error('再計算に失敗しました:', error);
  process.exit(1);
});
