import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Plus, Trash2, Edit2, X, ChevronRight, Settings } from 'lucide-react';
import { translations } from '../translations';
import UnitTypesModal from './UnitTypesModal';

const PERIODS = ['hour','shift','daily','yesterday','weekly','monthly', 'custom'];

const toDateInput = (ts) => ts ? new Date(ts).toISOString().split('T')[0] : '';
const fromDateInput = (s) => s ? new Date(s).getTime() : null;

const nowMonth = new Date();
const defaultStart = new Date(nowMonth.getFullYear(), nowMonth.getMonth(), 1).toISOString().split('T')[0];
const defaultEnd   = new Date(nowMonth.getFullYear(), nowMonth.getMonth() + 1, 0).toISOString().split('T')[0];

const emptyGoal = { name: '', method: 'manual' };
const emptyTarget = { 
  period: 'daily', 
  target: '', 
  name: '', 
  unitType: 'units', 
  unit: '', 
  behavior: 'cumulative', 
  color: '#6366f1', 
  startDate: '', 
  endDate: '' 
};

const GoalsConfig = ({ language }) => {
  const t = translations[language];
  const goals = useLiveQuery(() => db.goals.toArray()) || [];
  const allTargets = useLiveQuery(() => db.goalTargets.toArray()) || [];
  const unitTypes = useLiveQuery(() => db.unitTypes.toArray()) || [];

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showUnitTypes, setShowUnitTypes] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [goalForm, setGoalForm] = useState(emptyGoal);

  // Extra targets editor within goal form
  const [targetRows, setTargetRows] = useState([{ ...emptyTarget }]);

  const inputStyle = {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--input-border)',
    color: 'var(--text-input)',
    padding: '0.6rem 0.75rem',
    borderRadius: '0.4rem',
    fontSize: '0.875rem'
  };

  const handleUnitTypeChangeRow = (i, unitTypeId) => {
    const found = unitTypes.find(u => u.id === unitTypeId);
    setTargetRows(r => r.map((row, idx) => idx === i ? { ...row, unitType: unitTypeId, unit: found ? found.symbol : '' } : row));
  };

  const openAdd = () => {
    setGoalForm({ ...emptyGoal });
    setTargetRows([{ ...emptyTarget }]);
    setEditingGoalId(null);
    setShowGoalForm(true);
  };

  const openEdit = (goal) => {
    setGoalForm({ name: goal.name, method: goal.method || 'manual' });
    const existing = allTargets.filter(t => t.goalId === goal.id).map(t => ({ 
      period: t.period, 
      target: t.target, 
      id: t.id,
      name: t.name || '',
      unitType: t.unitType || 'units',
      unit: t.unit || '',
      behavior: t.behavior || 'cumulative',
      color: t.color || '#6366f1',
      startDate: toDateInput(t.startDate),
      endDate: toDateInput(t.endDate)
    }));
    setTargetRows(existing.length > 0 ? existing : [{ ...emptyTarget }]);
    setEditingGoalId(goal.id);
    setShowGoalForm(true);
  };

  const cancelForm = () => { setShowGoalForm(false); setEditingGoalId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validTargets = targetRows.filter(r => r.period && r.target !== '');
    const gid = editingGoalId;
    const payload = { 
      name: validTargets[0]?.name || 'Nueva Meta', 
      method: 'manual' 
    };

    if (editingGoalId) {
      await db.goals.update(editingGoalId, payload);
      await db.goalTargets.where('goalId').equals(editingGoalId).delete();
    } else {
      gid = await db.goals.add(payload);
    }

    await db.goalTargets.bulkAdd(validTargets.map(r => ({ 
      goalId: gid, 
      period: r.period, 
      target: Number(r.target),
      name: r.name,
      unitType: r.unitType,
      unit: r.unit,
      behavior: r.behavior,
      color: r.color,
      startDate: fromDateInput(r.startDate),
      endDate: fromDateInput(r.endDate)
    })));
    
    cancelForm();
  };

  const deleteGoal = async (id) => {
    if (confirm(t.confirmDelete)) {
      await db.goals.delete(id);
      await db.goalTargets.where('goalId').equals(id).delete();
      await db.metrics.where('goalId').equals(id).delete();
    }
  };

  const addTargetRow = () => setTargetRows(r => [...r, { ...emptyTarget }]);
  const removeTargetRow = (i) => setTargetRows(r => r.filter((_, idx) => idx !== i));
  const updateTargetRow = (i, field, val) => setTargetRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{t.goals}</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setShowUnitTypes(true)} title={t.manageUnits} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderRadius: '0.5rem', background: 'var(--nav-hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
            <Settings size={20} />
          </button>
          <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', borderRadius: '0.5rem', background: 'var(--accent-indigo)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
            <Plus size={16} /><span>{t.newGoal}</span>
          </button>
        </div>
      </div>

      {showUnitTypes && <UnitTypesModal language={language} onClose={() => setShowUnitTypes(false)} />}

      {/* ── Form ── */}
      {showGoalForm && (
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: '1.5rem', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{editingGoalId ? t.editGoal : t.newGoal}</h3>

          {/* Goal base info */}
          {/* Goal base info (Slim) */}
          {/* Goals logic and basic info moved to rows, removing redundant top fields */}

          {/* Targets by period */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                Objetivos por periodo
              </label>
              <button type="button" onClick={addTargetRow} style={{ fontSize: '0.75rem', background: 'var(--nav-hover-bg)', color: 'var(--accent-indigo)', border: '1px solid var(--accent-indigo)', borderRadius: '0.3rem', padding: '0.25rem 0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Plus size={12} /> Agregar periodo
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {targetRows.map((row, i) => (
                <div key={i} style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', background: 'var(--bg-body)', position: 'relative' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t.goalPeriodName}</label>
                      <input type="text" value={row.name} onChange={e => updateTargetRow(i, 'name', e.target.value)} placeholder="Ej: Conteos" style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t.period}</label>
                      <select value={row.period} onChange={e => updateTargetRow(i, 'period', e.target.value)} style={inputStyle}>
                        {PERIODS.map(p => <option key={p} value={p}>{t[p]}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t.unitType}</label>
                      <select value={row.unitType} onChange={e => handleUnitTypeChangeRow(i, e.target.value)} style={inputStyle}>
                        {unitTypes.map(u => (
                          <option key={u.id} value={u.id}>{u.label ? t[u.label] : u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t.targetValue}</label>
                      <input type="number" value={row.target} onChange={e => updateTargetRow(i, 'target', e.target.value)} style={inputStyle} required />
                    </div>
                    
                    {/* Logic and Color added here */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Logica</label>
                      <select value={row.behavior} onChange={e => updateTargetRow(i, 'behavior', e.target.value)} style={inputStyle}>
                        <option value="cumulative">{t.cumulative || '📈 Total acumulado'}</option>
                        <option value="snapshot">{t.snapshot || '📊 Valor actual'}</option>
                        <option value="count">{t.count || '🔢 Cantidad de registros'}</option>
                        <option value="weighted">{t.weighted || '➕ Suma ponderada'}</option>
                        <option value="average">{t.average || '📉 Promedio'}</option>
                        <option value="calc_pct">{t.calc_pct || '⚖️ Porcentaje (%)'}</option>
                        <option value="progress">{t.progress || '🎯 Avance a meta'}</option>
                        <option value="differential">{t.differential || '🔄 Diferencia vs meta'}</option>
                        <option value="period_val">{t.period_val || '📆 Valor por periodo'}</option>
                        <option value="duration">{t.duration || '⏱️ Tiempo acumulado'}</option>
                        <option value="state">{t.state || '🚦 Cumple / No cumple'}</option>
                        <option value="min_threshold">{t.min_threshold || '📌 Mínimo requerido'}</option>
                        <option value="max_control">{t.max_control || '📉 Límite máximo'}</option>
                        <option value="composite">{t.composite || '🔗 Meta combinada'}</option>
                        <option value="formula">{t.formula || '🧮 Fórmula personalizada'}</option>
                        <option value="tendency">{t.tendency || '📊 Tendencia'}</option>
                        <option value="auto_reset">{t.auto_reset || '🔁 Reinicio automático'}</option>
                        <option value="hybrid">{t.hybrid || '🧩 Modo avanzado'}</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Color</label>
                      <input type="color" value={row.color} onChange={e => updateTargetRow(i, 'color', e.target.value)} style={{ ...inputStyle, padding: '0.2rem', height: '40px' }} />
                    </div>
                  </div>
                  
                  {/* Validity for all targets if desired */}
                  {/* Validity for custom targets */}
                  {row.period === 'custom' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t.startDate}</label>
                        <input type="date" value={row.startDate} onChange={e => updateTargetRow(i, 'startDate', e.target.value)} style={inputStyle} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t.endDate}</label>
                        <input type="date" value={row.endDate} onChange={e => updateTargetRow(i, 'endDate', e.target.value)} style={inputStyle} />
                      </div>
                    </div>
                  )}

                  {targetRows.length > 1 && (
                    <button type="button" onClick={() => removeTargetRow(i)} style={{ position: 'absolute', top: '-0.5rem', right: '-0.5rem', background: 'var(--bg-card)', border: '1px solid var(--accent-rose)', borderRadius: '50%', cursor: 'pointer', color: 'var(--accent-rose)', padding: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={cancelForm} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '0.5rem 1.25rem', borderRadius: '0.4rem', cursor: 'pointer' }}>{t.cancel}</button>
            <button type="submit" style={{ background: 'var(--accent-indigo)', color: 'white', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: '600' }}>{t.save}</button>
          </div>
        </form>
      )}

      {/* ── Goal List ── */}
      <div className="dashboard-grid">
        {goals.map(goal => {
          const targets = allTargets.filter(tg => tg.goalId === goal.id);
          return (
            <div key={goal.id} className="card" style={{ gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{goal.name}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button type="button" onClick={() => openEdit(goal)} title={t.edit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.4rem', borderRadius: '0.3rem' }}><Edit2 size={15} /></button>
                  <button type="button" onClick={() => deleteGoal(goal.id)} title={t.delete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)', padding: '0.4rem', borderRadius: '0.3rem' }}><Trash2 size={15} /></button>
                </div>
              </div>

              {/* Targets sub-list */}
              {targets.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingLeft: '0rem' }}>
                  {targets.map(tg => (
                    <span key={tg.id} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', background: `${tg.color || '#6366f1'}25`, color: tg.color || '#6366f1', border: `1px solid ${tg.color || '#6366f1'}50`, fontWeight: '500' }}>
                      {tg.name || t[tg.period]}: {(() => {
                        const symbol = tg.unit || unitTypes.find(u => u.id?.toString() === tg.unitType?.toString())?.symbol || '';
                        const num = tg.target.toLocaleString();
                        if (symbol === '$') return `$${num}`;
                        if (symbol === '%') return `${num}${symbol}`;
                        return `${num}${symbol ? ` ${symbol}` : ''}`;
                      })()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {goals.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No hay metas. Crea la primera con el botón de arriba.
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalsConfig;
