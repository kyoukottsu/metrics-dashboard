import React, { useState } from 'react';
import {
  ComposedChart, LineChart, Line, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, PlusCircle } from 'lucide-react';
import MetricDetailModal from './MetricDetailModal';
import { translations } from '../translations';
import { format } from 'date-fns';
import { calculateKPIValue } from '../utils/kpiLogic';

// Generate distinct complementary colors based on goal color
const PERIOD_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

const MetricCard = ({ goal, targets = [], metrics, allMetrics, language, unitTypes = [], selectedMonth, selectedYear, onAddData }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const t = translations[language];

  const primaryTarget = targets[0] || { behavior: 'cumulative', color: '#6366f1', unitType: 'units' };
  const primaryColor = primaryTarget.color || '#6366f1';

  const resolveSymbol = (targetUnitType) => {
    const ut = unitTypes.find(u => u.id?.toString() === (targetUnitType || 'units').toString());
    return ut ? ut.symbol : '';
  };

  const fmt = (v, targetUnitType) => {
    const s = resolveSymbol(targetUnitType);
    const isPref = s === '$';
    const isNoSpace = s === '%';
    const num = Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (!s) return num;
    if (isPref) return `${s}${num}`;
    if (isNoSpace) return `${num}${s}`;
    return `${num} ${s}`;
  };

  /* ── Build sparkline data grouped by day ── */
  const dayMap = {};
  [...allMetrics].forEach(m => {
    const key = format(new Date(m.timestamp), 'dd/MM');
    if (!dayMap[key]) {
      const d = new Date(m.timestamp);
      d.setHours(0,0,0,0);
      dayMap[key] = { date: key, start: d.getTime(), end: d.getTime() + 86399999 };
    }
  });
  const chartData = Object.values(dayMap)
    .sort((a, b) => a.start - b.start)
    .map(day => {
      const val = calculateKPIValue(allMetrics, primaryTarget.behavior || 'cumulative', day.start, day.end, primaryTarget.target || 0);
      return { date: day.date, value: typeof val === 'number' ? val : (val ? 1 : 0) };
    })
    .slice(-15);

  /* ── Latest value and trend ── */
  const sorted = [...allMetrics].sort((a, b) => b.timestamp - a.timestamp);
  const latest   = sorted[0]?.value ?? 0;
  const previous = sorted[1]?.value ?? latest;
  const trend    = latest >= previous ? 'up' : 'down';
  const pctChg   = previous !== 0 ? ((latest - previous) / previous * 100).toFixed(1) : '0.0';

  /* ── Current value per period ── */
  const getWindowTotal = (target, targetValue = 0) => {
    const period = target.period;
    const now = new Date();
    const baseDate = (selectedYear !== undefined && selectedMonth !== undefined) 
      ? new Date(selectedYear, selectedMonth, now.getDate()) 
      : now;
    
    let start = 0;
    let end = baseDate.getTime();

    if (period === 'hour')    { const d = new Date(baseDate); d.setMinutes(0,0,0); start = d.getTime(); }
    if (period === 'shift')   { const d = new Date(baseDate); d.setHours(baseDate.getHours() < 16 ? 8 : 16, 0, 0, 0); start = d.getTime(); }
    if (period === 'daily')   { const d = new Date(baseDate); d.setHours(0,0,0,0); start = d.getTime(); end = new Date(baseDate).setHours(23,59,59,999); }
    if (period === 'yesterday') { 
      const dStart = new Date(baseDate);
      dStart.setDate(dStart.getDate() - 1); dStart.setHours(0,0,0,0); start = dStart.getTime();
      const dEnd = new Date(baseDate);
      dEnd.setDate(dEnd.getDate() - 1); dEnd.setHours(23,59,59,999); end = dEnd.getTime();
    }
    if (period === 'weekly')  { 
      const d = new Date(baseDate); d.setDate(baseDate.getDate() - baseDate.getDay()); d.setHours(0,0,0,0); start = d.getTime(); 
      const dEnd = new Date(d); dEnd.setDate(d.getDate() + 6); dEnd.setHours(23,59,59,999); end = dEnd.getTime();
    }
    if (period === 'monthly') { 
      start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1).getTime(); 
      end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    }
    if (period === 'custom') {
      start = target.startDate || 0;
      end = target.endDate || Date.now();
    }
    
    const val = calculateKPIValue(allMetrics, target.behavior || 'cumulative', start, end, targetValue);
    return typeof val === 'number' ? val : (val ? 1 : 0);
  };

  const primaryValue  = primaryTarget ? getWindowTotal(primaryTarget, primaryTarget.target) : 0;
  const primaryPct    = primaryTarget?.target > 0 ? Math.min((primaryValue / primaryTarget.target) * 100, 100) : 0;

  /* ── Special for RPD: Shift Sparklines ── */
  const isRPD = goal.name?.toUpperCase() === 'RPD';
  const SHIFT_NAMES = ['Turno 1', 'Turno 2', 'Turno 3'];
  const SHIFT_COLORS = ['#3b82f6', '#f97316', '#a855f7'];

  const shiftChartData = isRPD ? Object.values(dayMap)
    .sort((a, b) => a.start - b.start)
    .map(day => {
      const dayMetrics = allMetrics.filter(m => m.timestamp >= day.start && m.timestamp <= day.end);
      const dayMetricsWithShifts = dayMetrics.filter(m => m.shifts);
      const entry = { date: day.date };
      if (dayMetricsWithShifts.length > 0) {
        SHIFT_NAMES.forEach(name => {
          const vals = dayMetricsWithShifts.map(m => m.shifts.find(s => s.name === name)?.value).filter(v => typeof v === 'number');
          if (vals.length > 0) entry[name] = vals.reduce((a, b) => a + b, 0) / vals.length;
        });
      }
      return entry;
    })
    .slice(-15) : [];

  const getShiftAverages = (target) => {
    const period = target?.period || 'daily';
    const now = new Date();
    const baseDate = (selectedYear !== undefined && selectedMonth !== undefined) ? new Date(selectedYear, selectedMonth, now.getDate()) : now;
    let start = 0, end = baseDate.getTime();
    if (period === 'hour')    { const d = new Date(baseDate); d.setMinutes(0,0,0); start = d.getTime(); }
    if (period === 'shift')   { const d = new Date(baseDate); d.setHours(baseDate.getHours() < 16 ? 8 : 16, 0, 0, 0); start = d.getTime(); }
    if (period === 'daily')   { const d = new Date(baseDate); d.setHours(0,0,0,0); start = d.getTime(); end = new Date(baseDate).setHours(23,59,59,999); }
    if (period === 'yesterday') { 
      const dStart = new Date(baseDate); dStart.setDate(dStart.getDate() - 1); dStart.setHours(0,0,0,0); start = dStart.getTime();
      const dEnd = new Date(baseDate); dEnd.setDate(dEnd.getDate() - 1); dEnd.setHours(23,59,59,999); end = dEnd.getTime();
    }
    if (period === 'weekly')  { 
      const d = new Date(baseDate); d.setDate(baseDate.getDate() - baseDate.getDay()); d.setHours(0,0,0,0); start = d.getTime(); 
      const dEnd = new Date(d); dEnd.setDate(d.getDate() + 6); dEnd.setHours(23,59,59,999); end = dEnd.getTime();
    }
    if (period === 'monthly') { 
      start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1).getTime(); 
      end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    }
    if (period === 'custom') { start = target.startDate || 0; end = target.endDate || Date.now(); }
    const periodMetrics = allMetrics.filter(m => m.timestamp >= start && m.timestamp <= end && m.shifts);
    if (periodMetrics.length === 0) return null;
    const averages = {};
    SHIFT_NAMES.forEach(name => {
      const vals = periodMetrics.map(m => m.shifts.find(s => s.name === name)?.value).filter(v => typeof v === 'number');
      averages[name] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });
    return averages;
  };

  const primaryShiftAverages = isRPD ? getShiftAverages(primaryTarget) : null;
  const latestMetricWithShifts = isRPD ? [...allMetrics].sort((a,b) => b.timestamp - a.timestamp).find(m => m.shifts) : null;
  const displayShiftData = primaryShiftAverages || (latestMetricWithShifts?.shifts?.reduce((acc, s) => ({ ...acc, [s.name]: s.value }), {}) || {});

  return (
    <>
      <div
        className="card"
        onClick={() => setIsDetailOpen(true)}
        style={{ cursor: 'pointer', justifyContent: 'space-between', gap: '0', minHeight: isRPD ? '280px' : 'auto' }}
      >
        <div className="card-header">
          <div>
            <div className="card-title">{goal.name}</div>
            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
              {targets.map(tg => (
                <span key={tg.id} style={{ fontSize: '0.6rem', padding: '0.1rem 0.45rem', borderRadius: '1rem', background: `${tg.color || primaryColor}20`, color: tg.color || primaryColor, border: `1px solid ${tg.color || primaryColor}40`, fontWeight: '600', textTransform: 'uppercase' }}>
                  {t[tg.period]}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className={`card-trend ${trend === 'up' ? 'trend-up' : 'trend-down'}`}>
              {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{pctChg}%</span>
            </div>
            {onAddData && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddData(goal.id);
                }}
                title={t.addData}
                style={{
                  background: 'none',
                  border: 'none',
                  color: primaryColor,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px',
                  borderRadius: '50%',
                  transition: 'transform 0.2s, background-color 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = `${primaryColor}15`;
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <PlusCircle size={22} />
              </button>
            )}
          </div>
        </div>

        {!isRPD && <div className="card-value">{fmt(primaryValue, primaryTarget?.unitType)}</div>}

        {isRPD && (
          <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
              {SHIFT_NAMES.map((name, i) => {
                const shiftVal = displayShiftData[name] || 0;
                const shiftLabelKey = i === 0 ? 'morning' : i === 1 ? 'afternoon' : 'night';
                return (
                  <div key={name} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>{t[shiftLabelKey]}</div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: SHIFT_COLORS[i] }}>{shiftVal.toFixed(2)}%</div>
                  </div>
                );
              })}
            </div>
            
            <div style={{ height: '60px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%"><LineChart data={shiftChartData}>
                {SHIFT_NAMES.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={SHIFT_COLORS[i]} strokeWidth={2} dot={false} connectNulls />
                ))}
              </LineChart></ResponsiveContainer>
            </div>
          </div>
        )}

        {targets.length > 0 && !isRPD && (
          <div style={{ marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {targets.map((tg, i) => {
              const val = getWindowTotal(tg, tg.target);
              const pct = tg.target > 0 ? Math.min((val / tg.target) * 100, 100) : 0;
              const col = tg.color || primaryColor;
              return (
                <div key={tg.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: '600', color: col }}>{tg.name || t[tg.period]}</span>
                    <span>{fmt(val, tg.unitType)} / {fmt(tg.target, tg.unitType)} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="progress-container" style={{ height: '5px' }}>
                    <div className="progress-bar" style={{ width: `${pct}%`, backgroundColor: col }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isRPD && (
          <div style={{ height: '60px', width: '100%', marginTop: 'auto' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id={`grad-${goal.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={primaryColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke={primaryColor} fill={`url(#grad-${goal.id})`} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {isDetailOpen && (
        <MetricDetailModal
          goal={goal}
          targets={targets}
          metrics={allMetrics}
          language={language}
          onClose={() => setIsDetailOpen(false)}
          unitTypes={unitTypes}
        />
      )}
    </>
  );
};

export default MetricCard;
