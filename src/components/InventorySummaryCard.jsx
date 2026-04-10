import React, { useState } from 'react';
import { 
  BarChart, Bar, Cell, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, TrendingDown, ClipboardList } from 'lucide-react';
import { translations } from '../translations';
import InventoryDetailModal from './InventoryDetailModal';

const InventorySummaryCard = ({ allLogs = [], resets = [], language }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const t = translations[language];
  
  const lastResetTimestamp = resets.length > 0 ? resets[0].timestamp : 0;
  const activeLogs = allLogs.filter(l => l.timestamp > lastResetTimestamp);
  
  const runningTotal = activeLogs.reduce((a, l) => 
    l.type === 'excess' ? a + l.value : l.type === 'shortage' ? a - l.value : a, 0
  );

  const color = runningTotal >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';

  /* ── Build sparkline data: Top contributors (80/20 style) ── */
  const templateTotals = activeLogs.reduce((acc, log) => {
    const name = log.templateName || 'S/N';
    if (!acc[name]) acc[name] = 0;
    if (log.type === 'excess') acc[name] += log.value;
    else if (log.type === 'shortage') acc[name] -= log.value;
    return acc;
  }, {});

  const chartData = Object.entries(templateTotals)
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 7); // Show top 7 for the small card

  // Trend indicator based on overall sum vs 0
  const trend = runningTotal >= 0 ? 'up' : 'down';

  const fmt = (v) => {
    const abs = Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 });
    return v >= 0 ? `+$${abs}` : `-$${abs}`;
  };

  return (
    <>
      <div 
        className="card" 
        onClick={() => setIsDetailOpen(true)}
        style={{ justifyContent: 'space-between', gap: '0', cursor: 'pointer' }}
      >
        {/* Header */}
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: `${color}20`, padding: '0.4rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardList size={18} color={color} />
            </div>
            <div className="card-title">{t.inventoryTracker}</div>
          </div>
          <div className={`card-trend ${trend === 'up' ? 'trend-up' : 'trend-down'}`}>
            {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{trend === 'up' ? 'Positivo' : 'Negativo'}</span>
          </div>
        </div>

        {/* Main value */}
        <div className="card-value" style={{ color: color }}>
          {fmt(runningTotal)}
        </div>
        
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '-0.5rem', marginBottom: '1rem' }}>
          {t.runningTotal} (desde reinicio)
        </div>

        {/* Sparkline (BarChart) */}
        <div style={{ height: '60px', width: '100%', marginTop: 'auto' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.value >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {isDetailOpen && (
        <InventoryDetailModal 
          allLogs={allLogs}
          resets={resets}
          language={language}
          onClose={() => setIsDetailOpen(false)}
        />
      )}
    </>
  );
};

export default InventorySummaryCard;
