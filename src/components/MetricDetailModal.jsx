import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { X, Edit2, Trash2, Check, Save, User } from 'lucide-react';
import { db } from '../db';
import { translations } from '../translations';
import { format } from 'date-fns';
import { calculateKPIValue } from '../utils/kpiLogic';

const EMPLOYEE_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#8b5cf6', // Violet
  '#06b6d4'  // Cyan
];

const EMPLOYEES_NAMES = [
  'JUANITA MEDRANO TORRES',
  'ROSA ISELA LOPEZ CRUZ',
  'BRENDA XOCHITL VILLA BERNABE',
  'GRISELDA MENDEZ HERNANDEZ',
  'YOSSELIN YAHAIRA DIAZ HERNANDEZ',
  'GALDINO SAN JUAN ESCAMILLA'
];

/* ── Custom Tooltip ── */
const CustomTooltip = ({ active, payload, label, gUnit, unitTypes = [] }) => {
  if (!active || !payload?.length) return null;
  
  const resolveSymbol = (g) => {
    if (g?.unit) return g.unit;
    const ut = unitTypes.find(u => u.id?.toString() === g?.unitType?.toString());
    return ut ? ut.symbol : '';
  };

  return (
    <div style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', padding: '0.75rem 1rem', borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{label}</p>
      {payload.map((p, i) => {
        const symbol = resolveSymbol(gUnit || {});
        const num = Number(p.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        let display = num;
        if (symbol === '$') display = `${symbol}${num}`;
        else if (symbol === '%') display = `${num}${symbol}`;
        else if (symbol) display = `${num} ${symbol}`;

        return (
          <p key={i} style={{ fontSize: '0.8rem', color: p.color, fontWeight: '600', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <span>{p.name}:</span>
            <span>{display}</span>
          </p>
        );
      })}
    </div>
  );
};

const SHIFT_COLORS = ['#3b82f6', '#f97316', '#a855f7'];
const SHIFT_NAMES_RPD = ['Turno 1', 'Turno 2', 'Turno 3'];

const MetricDetailModal = ({ goal, targets = [], metrics, language, onClose, unitTypes = [] }) => {
  const t = translations[language];
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState({ value: '', note: '', shifts: [], employees: [] });

  const primaryTarget = targets[0] || { behavior: 'cumulative', color: '#6366f1', unitType: 'units' };
  const primaryColor = primaryTarget.color || '#6366f1';

  const isVentaLealtad = goal.name?.toLowerCase().includes('lealtad');
  const isRPD = goal.name?.toUpperCase() === 'RPD';

  const resolveSymbol = (targetUnitType) => {
    const ut = unitTypes.find(u => u.id?.toString() === (targetUnitType || 'units').toString());
    return ut ? ut.symbol : '';
  };

  const fmt = (v, targetUnitType) => {
    const s = resolveSymbol(targetUnitType);
    const isPrefix = s === '$';
    const isNoSpaceSuffix = s === '%';
    const num = Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (!s) return num;
    if (isPrefix) return `${s}${num}`;
    if (isNoSpaceSuffix) return `${num}${s}`;
    return `${num} ${s}`;
  };

  /* ── Build chart data: daily aggregations ── */
  const dayMap = {};
  [...metrics].forEach(m => {
    const key = format(new Date(m.timestamp), 'dd MMM');
    if (!dayMap[key]) {
      const d = new Date(m.timestamp);
      d.setHours(0,0,0,0);
      dayMap[key] = { date: key, start: d.getTime(), end: d.getTime() + 86399999, rawMetrics: [] };
    }
    dayMap[key].rawMetrics.push(m);
  });

  const chartData = Object.values(dayMap)
    .sort((a, b) => a.start - b.start)
    .map(day => {
      const val = calculateKPIValue(metrics, primaryTarget.behavior || 'cumulative', day.start, day.end, primaryTarget.target || 0);
      const entry = { date: day.date, total: typeof val === 'number' ? val : (val ? 1 : 0) };
      
      if (isVentaLealtad) {
        const latest = [...day.rawMetrics].sort((a,b) => b.timestamp - a.timestamp)[0];
        if (latest?.employees) latest.employees.forEach(emp => { entry[emp.name] = emp.value; });
      }
      if (isRPD) {
        const latest = [...day.rawMetrics].sort((a,b) => b.timestamp - a.timestamp)[0];
        if (latest?.shifts) latest.shifts.forEach(s => { entry[s.name] = s.value; });
      }
      return entry;
    })
    .slice(-30);

  /* ── Stats ── */
  const values = metrics.map(m => m.value);
  const total  = values.reduce((s, v) => s + v, 0);
  const maxV   = values.length ? Math.max(...values) : 0;
  const minV   = values.length ? Math.min(...values) : 0;
  const avgV   = values.length ? total / values.length : 0;

  const startEdit = (m) => { 
    setEditingId(m.id); 
    setEditVal({ 
      value: m.value, 
      result: m.result || '',
      note: m.note || '', 
      shifts: m.shifts ? JSON.parse(JSON.stringify(m.shifts)) : [],
      employees: m.employees ? JSON.parse(JSON.stringify(m.employees)) : []
    }); 
  };
  const saveEdit  = async (id) => { 
    const updateData = { value: Number(editVal.value), result: Number(editVal.result || 0), note: editVal.note };
    if (isRPD) updateData.shifts = editVal.shifts;
    if (isVentaLealtad) updateData.employees = editVal.employees;
    await db.metrics.update(id, updateData); 
    setEditingId(null); 
  };
  const deleteEntry = async (id) => { if (confirm('¿Eliminar este registro?')) await db.metrics.delete(id); };

  const inputS = { background: 'var(--bg-input)', border: '1px solid var(--input-border)', color: 'var(--text-input)', padding: '0.3rem 0.5rem', borderRadius: '0.3rem', fontSize: '0.8rem' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '1rem' }}>
      <div style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: '1rem', width: '100%', maxWidth: '900px', maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{goal.name} — Detalle</h2>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
              {targets.map(tg => (
                <span key={tg.id} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', background: `${tg.color || primaryColor}25`, color: tg.color || primaryColor, border: `1px solid ${tg.color || primaryColor}50`, fontWeight: '600' }}>
                  {tg.name || t[tg.period]}: {tg.target ? fmt(tg.target, tg.unitType) : '—'}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={22} /></button>
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>
          {!isRPD && (
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evolución General</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip gUnit={primaryTarget} unitTypes={unitTypes} />} />
                  <Line type="monotone" dataKey="total" name="Total diario" stroke={primaryColor} strokeWidth={3} dot={{ fill: primaryColor, r: 4 }} />
                  {targets.map(tg => (
                    <ReferenceLine key={tg.id} y={tg.target} label={{ value: `${tg.name || t[tg.period]}: ${fmt(tg.target, tg.unitType)}`, fill: tg.color || primaryColor, fontSize: 10, position: 'insideTopRight' }} stroke={tg.color || primaryColor} strokeDasharray="4 4" strokeOpacity={0.7} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}


          {/* RPD Shift Performance Chart */}
          {isRPD && (
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <User size={16} color="var(--accent-indigo)" />
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Rendimiento por Turnos</h4>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis unit="%" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip gUnit={{ unit: '%' }} />} />
                  <Legend wrapperStyle={{ fontSize: '0.7rem', marginTop: '10px' }} />
                  {SHIFT_NAMES_RPD.map((name, i) => (
                    <Line 
                      key={name}
                      type="monotone" 
                      dataKey={name} 
                      name={t[name.toLowerCase().replace(' ', '')]}
                      stroke={SHIFT_COLORS[i]} 
                      strokeWidth={2} 
                      dot={{ fill: SHIFT_COLORS[i], r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Employee Performance Chart (Conditional) */}
          {isVentaLealtad && (
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <User size={16} color="var(--accent-indigo)" />
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{t.employeePerformance}</h4>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis unit="%" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip gUnit={{ unit: '%' }} />} />
                  <Legend wrapperStyle={{ fontSize: '0.7rem', marginTop: '10px' }} />
                  {EMPLOYEES_NAMES.map((name, i) => (
                    <Line 
                      key={name}
                      type="monotone" 
                      dataKey={name} 
                      name={name.split(' ')[0]} // Short name for legend
                      stroke={EMPLOYEE_COLORS[i]} 
                      strokeWidth={2} 
                      dot={{ fill: EMPLOYEE_COLORS[i], r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0', borderBottom: '1px solid var(--border-color)' }}>
            {[['Total', fmt(total, primaryTarget.unitType)], ['Promedio', fmt(avgV, primaryTarget.unitType)], ['Máximo', fmt(maxV, primaryTarget.unitType)], ['Mínimo', fmt(minV, primaryTarget.unitType)]].map(([lbl, val]) => (
              <div key={lbl} style={{ padding: '1rem 1.25rem', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{lbl}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* History Table */}
          <div style={{ padding: '1.25rem 1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Historial de registros</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'var(--table-header-bg)' }}>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500' }}>Fecha</th>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: '500' }}>Valor</th>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500' }}>Nota</th>
                  <th style={{ padding: '0.6rem 0.75rem', width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {[...metrics].sort((a, b) => b.timestamp - a.timestamp).map(m => (
                  <tr key={m.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>{format(new Date(m.timestamp), 'dd MMM yyyy HH:mm')}</td>
                    {editingId === m.id ? (
                      <>
                        <td style={{ padding: '0.4rem 0.75rem', textAlign: 'right' }}>
                          {!isRPD && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <input type="number" value={editVal.value} onChange={e => setEditVal(v => ({...v, value: e.target.value}))} style={{ ...inputS, width: '80px', textAlign: 'right' }} placeholder="%" />
                              {(primaryTarget.behavior === 'calc_pct' || editVal.result) && (
                                <input type="number" value={editVal.result} onChange={e => setEditVal(v => ({...v, result: e.target.value}))} style={{ ...inputS, width: '80px', textAlign: 'right', fontSize: '0.7rem', color: 'var(--accent-indigo)' }} placeholder="Result" />
                              )}
                            </div>
                          )}
                          {isRPD && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Shift Based</span>}
                        </td>
                        <td style={{ padding: '0.4rem 0.75rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <input type="text" value={editVal.note} onChange={e => setEditVal(v => ({...v, note: e.target.value}))} style={{ ...inputS, width: '100%' }} placeholder={t.note} />
                            
                            {isRPD && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '0.4rem' }}>
                                {editVal.shifts.map((s, i) => (
                                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                    <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{t[s.name.toLowerCase().replace(' ', '')]}</label>
                                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                                      <input 
                                        type="number" 
                                        step="any" 
                                        value={s.result || 0} 
                                        placeholder="Val"
                                        onChange={e => {
                                          const newShifts = [...editVal.shifts];
                                          newShifts[i].result = Number(e.target.value);
                                          setEditVal(v => ({ ...v, shifts: newShifts }));
                                        }}
                                        style={{ ...inputS, width: '100%', fontSize: '0.7rem' }}
                                      />
                                      <input 
                                        type="number" 
                                        step="0.01" 
                                        value={s.value} 
                                        placeholder="%"
                                        onChange={e => {
                                          const newShifts = [...editVal.shifts];
                                          newShifts[i].value = Number(e.target.value);
                                          setEditVal(v => ({ ...v, shifts: newShifts }));
                                        }}
                                        style={{ ...inputS, width: '100%', fontSize: '0.7rem', background: 'rgba(59,130,246,0.1)' }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {isVentaLealtad && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '0.4rem' }}>
                                {editVal.employees.map((emp, i) => (
                                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                    <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{emp.name.split(' ')[0]}</label>
                                    <input 
                                      type="number" 
                                      step="0.01" 
                                      value={emp.value} 
                                      onChange={e => {
                                        const newEmps = [...editVal.employees];
                                        newEmps[i].value = Number(e.target.value);
                                        setEditVal(v => ({ ...v, employees: newEmps }));
                                      }}
                                      style={{ ...inputS, width: '100%', fontSize: '0.75rem' }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.4rem 0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.2rem' }}>
                            <button onClick={() => saveEdit(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-emerald)', padding: '0.25rem' }}><Check size={14} /></button>
                            <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem' }}><X size={14} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {(() => {
                            const isCalcPct = primaryTarget.behavior === 'calc_pct';
                            const isProgress = primaryTarget.behavior === 'progress';
                            
                            if (isCalcPct && m.value > 0) {
                              const pct = (m.result / m.value) * 100;
                              return (
                                <>
                                  {fmt(pct, { unit: '%' })}
                                  <div style={{ fontSize: '0.65rem', color: 'var(--accent-indigo)', fontWeight: '400' }}>
                                    ({m.result} / {m.value})
                                  </div>
                                </>
                              );
                            }

                            if (m.value === 0 && m.result !== 0) {
                              return fmt(m.result, primaryTarget.unitType);
                            }
                            
                            return (
                              <>
                                {fmt(m.value, primaryTarget.unitType)}
                                {m.result !== undefined && m.result !== 0 && (
                                  <div style={{ fontSize: '0.65rem', color: 'var(--accent-indigo)', fontWeight: '400' }}>
                                    ({m.result.toLocaleString()})
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </td>
                         <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                             {m.note && <span>{m.note}</span>}
                             {m.employees && (
                               <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                 {m.employees.map((emp, i) => (
                                   <span key={i} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.3rem', borderRadius: '0.2rem' }}>
                                     {emp.name.split(' ')[0]}: {emp.value}%
                                   </span>
                                 ))}
                               </div>
                             )}
                             {m.shifts && (
                               <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
                                 {m.shifts.map((s, i) => (
                                   <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                     <span style={{ fontSize: '0.65rem', background: 'rgba(59,130,246,0.1)', color: 'var(--accent-indigo)', padding: '0.1rem 0.3rem', borderRadius: '0.2rem' }}>
                                       {t[s.name.toLowerCase().replace(' ', '')]}: <strong>{s.result || 0}</strong> ({s.value.toFixed(1)}%)
                                     </span>
                                   </div>
                                 ))}
                               </div>
                             )}
                           </div>
                        </td>
                        <td style={{ padding: '0.5rem 0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.2rem' }}>
                            <button onClick={() => startEdit(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem' }}><Edit2 size={13} /></button>
                            <button onClick={() => deleteEntry(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)', padding: '0.25rem' }}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {metrics.length === 0 && (
                  <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Sin registros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricDetailModal;
