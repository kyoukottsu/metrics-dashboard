import React, { useState } from 'react';
import {
  ComposedChart, Line, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { X, Edit2, Trash2, Check, ClipboardList } from 'lucide-react';
import { db } from '../db';
import { translations } from '../translations';
import { format } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const color = p.value >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
  const pct = payload[1]?.value; // percentage line
  return (
    <div style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '700', marginBottom: '0.25rem' }}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <p style={{ fontSize: '0.9rem', color: color, fontWeight: '800' }}>
          Balance: {p.value >= 0 ? '+$' : '-$'}{Math.abs(p.value).toLocaleString()}
        </p>
        {pct !== undefined && (
          <p style={{ fontSize: '0.75rem', color: 'var(--accent-indigo)', fontWeight: '600' }}>
            Impacto Acumulado: {pct.toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  );
};

const InventoryDetailModal = ({ allLogs = [], resets = [], language, onClose }) => {
  const t = translations[language];
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState({ templateName: '', value: '', type: '' });

  const lastResetTimestamp = resets.length > 0 ? resets[0].timestamp : 0;
  const activeLogs = allLogs.filter(l => l.timestamp > lastResetTimestamp);
  
  /* ── Stats ── */
  const totalExcess   = activeLogs.filter(l => l.type === 'excess').reduce((a, l) => a + l.value, 0);
  const totalShortage = activeLogs.filter(l => l.type === 'shortage').reduce((a, l) => a + l.value, 0);
  const netBalance    = totalExcess - totalShortage;

  /* ── Chart Data: Pareto (80/20) Logic ── */
  const templateTotals = activeLogs.reduce((acc, log) => {
    const name = log.templateName || 'S/N';
    if (!acc[name]) acc[name] = 0;
    if (log.type === 'excess') acc[name] += log.value;
    else if (log.type === 'shortage') acc[name] -= log.value;
    return acc;
  }, {});

  // 1. Filter non-zeros and calculate absolute impact
  const filteredData = Object.entries(templateTotals)
    .map(([name, total]) => ({ name, total, abs: Math.abs(total) }))
    .filter(item => item.abs > 0)
    .sort((a, b) => b.abs - a.abs);

  const totalAbsDiscrepancy = filteredData.reduce((sum, item) => sum + item.abs, 0);

  // 2. Calculate cumulative percentage
  let runningAbsSum = 0;
  const chartData = filteredData.map(item => {
    runningAbsSum += item.abs;
    return {
      ...item,
      percentage: (runningAbsSum / totalAbsDiscrepancy) * 100
    };
  });

  const startEdit = (l) => {
    setEditingId(l.id);
    setEditVal({ templateName: l.templateName, value: l.value, type: l.type });
  };
  const saveEdit = async (id) => {
    await db.inventory.update(id, { ...editVal, value: Number(editVal.value) });
    setEditingId(null);
  };
  const deleteEntry = async (id) => {
    if (confirm(t.confirmDeleteLog)) await db.inventory.delete(id);
  };

  const fmt = (v) => {
    const s = v >= 0 ? '+$' : '-$';
    return `${s}${Math.abs(v).toLocaleString()}`;
  };

  const inputS = { background: 'var(--bg-input)', border: '1px solid var(--input-border)', color: 'var(--text-input)', padding: '0.3rem 0.5rem', borderRadius: '0.3rem', fontSize: '0.8rem', width: '100%' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '1rem' }}>
      <div style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: '1rem', width: '100%', maxWidth: '860px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ClipboardList size={22} color="var(--accent-indigo)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{t.inventoryTracker} — Análisis 80/20</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={22} /></button>
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>
          {/* Pareto Chart */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Áreas de oportunidad (Pareto de discrepancias)</h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)', fontWeight: '600' }}>Impacto acumulado (%)</span>
            </div>
            <div style={{ height: '280px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} 
                    interval={0} 
                    angle={-35} 
                    textAnchor="end"
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                    width={40}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fill: 'var(--accent-indigo)', fontSize: 10 }}
                    width={40}
                  />
                  <Tooltip 
                    content={<CustomTooltip />} 
                    cursor={{ fill: 'var(--bg-card)', opacity: 0.1 }} 
                  />
                  <Bar 
                    yAxisId="left" 
                    dataKey="total" 
                    name="Balance" 
                    radius={[4, 4, 0, 0]} 
                    barSize={Math.max(10, 600 / chartData.length)}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.total >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'} />
                    ))}
                  </Bar>
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="percentage" 
                    name="Acumulado %" 
                    stroke="var(--accent-indigo)" 
                    strokeWidth={3} 
                    dot={{ fill: 'var(--accent-indigo)', r: 3 }} 
                  />
                  <ReferenceLine yAxisId="right" y={80} stroke="var(--accent-indigo)" strokeDasharray="5 5" label={{ value: '80%', position: 'left', fill: 'var(--accent-indigo)', fontSize: 10 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ padding: '1.25rem', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{t.excess} Total</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--accent-emerald)' }}>+${totalExcess.toLocaleString()}</div>
            </div>
            <div style={{ padding: '1.25rem', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{t.shortage} Total</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--accent-rose)' }}>-${totalShortage.toLocaleString()}</div>
            </div>
            <div style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Balance General</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', color: netBalance >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                {fmt(netBalance)}
              </div>
            </div>
          </div>

          {/* History List */}
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '1rem' }}>Historial del ciclo actual</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ background: 'var(--table-header-bg)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500' }}>Plantilla</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500' }}>Tipo</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: '500' }}>Valor</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: '500' }}>Fecha</th>
                  <th style={{ padding: '0.75rem', width: '70px' }}></th>
                </tr>
              </thead>
              <tbody>
                {[...activeLogs].sort((a,b) => b.timestamp - a.timestamp).map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {editingId === log.id ? (
                      <>
                        <td style={{ padding: '0.5rem' }}><input type="text" value={editVal.templateName} onChange={e => setEditVal({...editVal, templateName: e.target.value})} style={inputS} /></td>
                        <td style={{ padding: '0.5rem' }}>
                          <select value={editVal.type} onChange={e => setEditVal({...editVal, type: e.target.value})} style={inputS}>
                            <option value="excess">{t.excess}</option>
                            <option value="shortage">{t.shortage}</option>
                            <option value="exact">{t.exact}</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.5rem' }}><input type="number" value={editVal.value} onChange={e => setEditVal({...editVal, value: e.target.value})} style={{...inputS, textAlign: 'right'}} /></td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Hoy</td>
                        <td style={{ padding: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button onClick={() => saveEdit(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-emerald)' }}><Check size={16} /></button>
                            <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={16} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontWeight: '500' }}>{log.templateName}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ fontSize: '0.7rem', color: log.type === 'excess' ? 'var(--accent-emerald)' : log.type === 'shortage' ? 'var(--accent-rose)' : 'var(--text-secondary)', fontWeight: '700' }}>
                            {t[log.type]}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {log.type === 'shortage' ? '-' : log.type === 'excess' ? '+' : ''}{log.value.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{format(new Date(log.timestamp), 'dd MMM HH:mm')}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => startEdit(log)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><Edit2 size={14} /></button>
                            <button onClick={() => deleteEntry(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)' }}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryDetailModal;
