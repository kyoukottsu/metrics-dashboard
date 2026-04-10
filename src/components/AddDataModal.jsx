import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Send, User } from 'lucide-react';
import { translations } from '../translations';
import { RESULT_REQUIRED_BEHAVIORS, VALUE_REQUIRED_BEHAVIORS, BOTH_REQUIRED_BEHAVIORS } from '../utils/kpiLogic';

const EMPLOYEES = [
  'JUANITA MEDRANO TORRES',
  'ROSA ISELA LOPEZ CRUZ',
  'BRENDA XOCHITL VILLA BERNABE',
  'GRISELDA MENDEZ HERNANDEZ',
  'YOSSELIN YAHAIRA DIAZ HERNANDEZ',
  'GALDINO SAN JUAN ESCAMILLA'
];

const RPD_SHIFTS = ['Turno 1', 'Turno 2', 'Turno 3'];

const AddDataModal = ({ onClose, language, initialGoalId }) => {
  const t = translations[language];
  const goals = useLiveQuery(() => db.goals.toArray()) || [];
  const allTargets = useLiveQuery(() => db.goalTargets.toArray()) || [];
  
  const [selectedGoalId, setSelectedGoalId] = useState(initialGoalId || '');
  const [value, setValue] = useState('');
  const [resultValue, setResultValue] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // State for employee / shift performance
  const [employeeVals, setEmployeeVals] = useState(
    EMPLOYEES.reduce((acc, name) => ({ ...acc, [name]: '' }), {})
  );
  
  const [shiftVals, setShiftVals] = useState(
    RPD_SHIFTS.reduce((acc, name) => ({ ...acc, [name]: '' }), {})
  );
  const [shiftResultVals, setShiftResultVals] = useState(
    RPD_SHIFTS.reduce((acc, name) => ({ ...acc, [name]: '' }), {})
  );
  const [lastShiftVals, setLastShiftVals] = useState(null);

  const selectedGoal = goals.find(g => g.id === Number(selectedGoalId));
  const goalTargets = allTargets.filter(t => t.goalId === Number(selectedGoalId));
  
  const isVentaLealtad = selectedGoal?.name?.toLowerCase().includes('lealtad');
  const isRPD = selectedGoal?.name?.toUpperCase() === 'RPD';

  const rTarget = goalTargets.find(t => RESULT_REQUIRED_BEHAVIORS.includes(t.behavior));
  const vTarget = goalTargets.find(t => VALUE_REQUIRED_BEHAVIORS.includes(t.behavior)) || goalTargets[0];

  const hasResultTarget = !!rTarget;
  const hasValueTarget  = !!vTarget;

  const showResultField = (!!rTarget && !!vTarget && (rTarget.id !== vTarget.id)) || 
                          goalTargets.some(t => BOTH_REQUIRED_BEHAVIORS.includes(t.behavior));

  // The primary logic for fallbacks
  const primaryTarget = goalTargets[0] || { behavior: 'cumulative' };

  // Dynamic labels based on target configuration
  const resultLabel = rTarget?.name || (['calc_pct', 'progress'].includes(primaryTarget.behavior) ? 'Dato Real / Conteo' : 'Resultado');
  const valueLabel  = vTarget?.name || (['calc_pct', 'progress'].includes(primaryTarget.behavior) ? 'Meta / Base' : t.value);
  const resultUnit  = rTarget?.unit ? ` (${rTarget.unit})` : '';
  const valueUnit   = vTarget?.unit ? ` (${vTarget.unit})` : '';

  useEffect(() => {
    if (isRPD && selectedGoalId) {
      db.metrics
        .where('goalId')
        .equals(Number(selectedGoalId))
        .reverse()
        .sortBy('timestamp')
        .then(results => {
          const latest = results.find(m => m.shifts);
          if (latest) {
            setLastShiftVals(latest.shifts.reduce((acc, s) => ({ ...acc, [s.name]: s.value }), {}));
          } else {
            setLastShiftVals(null);
          }
        });
    } else {
      setLastShiftVals(null);
    }
  }, [isRPD, selectedGoalId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGoalId || (!value && !resultValue && !isRPD) || !date) return;

    const todayStr = new Date().toISOString().split('T')[0];
    let timestamp;
    if (date === todayStr) {
      timestamp = Date.now();
    } else {
      timestamp = new Date(`${date}T12:00:00`).getTime();
    }

    const metricData = {
      goalId: Number(selectedGoalId),
      value: isRPD ? 0 : Number(value || 0),
      result: Number(resultValue || 0),
      timestamp: timestamp,
      note: note
    };

    if (isVentaLealtad) {
      metricData.employees = EMPLOYEES.map(name => ({
        name,
        value: Number(employeeVals[name] || 0)
      }));
    }

    if (isRPD) {
      metricData.shifts = RPD_SHIFTS.map(name => ({
        name,
        value: Number(shiftVals[name] || 0),
        result: Number(shiftResultVals[name] || 0)
      }));
    }

    await db.metrics.add(metricData);
    onClose();
    setValue('');
    setResultValue('');
    setNote('');
  };

  const handleEmployeeValChange = (name, val) => {
    setEmployeeVals(prev => ({ ...prev, [name]: val }));
  };

  const handleShiftValChange = (name, val) => {
    setShiftVals(prev => ({ ...prev, [name]: val }));
  };

  const handleShiftResultChange = (name, val) => {
    setShiftResultVals(prev => ({ ...prev, [name]: val }));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="card" style={{ width: '450px', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem' }}>{t.recordMetric}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.selectGoal}</label>
            <select 
              value={selectedGoalId} 
              onChange={e => setSelectedGoalId(e.target.value)}
              required
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', padding: '0.75rem', borderRadius: '0.5rem' }}
            >
              <option value="">{t.selectGoal}...</option>
              {goals.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {!isRPD && (
            <div style={{ display: 'grid', gridTemplateColumns: showResultField ? '1fr 1fr' : '1fr', gap: '1rem' }}>
              {showResultField ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {resultLabel}{resultUnit}
                    </label>
                    <input 
                      type="number" 
                      step="any"
                      value={resultValue}
                      onChange={e => setResultValue(e.target.value)}
                      placeholder="0"
                      style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', padding: '0.75rem', borderRadius: '0.5rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {valueLabel}{valueUnit}
                    </label>
                    <input 
                      type="number" 
                      step="any"
                      value={value}
                      onChange={e => setValue(e.target.value)}
                      required
                      placeholder="0.00"
                      style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', padding: '0.75rem', borderRadius: '0.5rem' }}
                    />
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {(vTarget || rTarget)?.name || t.value}{(vTarget || rTarget)?.unit ? ` (${(vTarget || rTarget).unit})` : ''}
                  </label>
                  <input 
                    type="number" 
                    step="any"
                    value={value || resultValue}
                    onChange={e => {
                      const val = e.target.value;
                      if (hasResultTarget) {
                        setResultValue(val);
                        setValue(''); // Keep it clean
                      } else {
                        setValue(val);
                        setResultValue('');
                      }
                    }}
                    required
                    placeholder="0.00"
                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', padding: '0.75rem', borderRadius: '0.5rem' }}
                  />
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.date || 'Date'}</label>
            <input 
              type="date" 
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', padding: '0.75rem', borderRadius: '0.5rem', colorScheme: 'dark' }}
            />
          </div>

          {isVentaLealtad && (
            <div style={{ 
              marginTop: '0.5rem', 
              padding: '1rem', 
              background: 'rgba(255,255,255,0.05)', 
              borderRadius: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <User size={16} color="var(--accent-indigo)" />
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{t.employeePerformance}</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t.employeeName}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'right' }}>%</span>
              </div>

              {EMPLOYEES.map(name => (
                <div key={name} style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem' }}>{name}</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={employeeVals[name]}
                    onChange={e => handleEmployeeValChange(name, e.target.value)}
                    placeholder="0.00"
                    style={{ 
                      background: 'rgba(0,0,0,0.3)', 
                      border: '1px solid var(--border-color)', 
                      color: 'white', 
                      padding: '0.4rem', 
                      borderRadius: '0.4rem',
                      fontSize: '0.8rem',
                      textAlign: 'right'
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {isRPD && (
            <div style={{ 
              marginTop: '0.5rem', 
              padding: '1rem', 
              background: 'rgba(255,255,255,0.05)', 
              borderRadius: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <User size={16} color="var(--accent-indigo)" />
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Rendimiento por Turno (RPD)</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t.shift}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{t.lastValues}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{t.result}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{t.performancePct}</span>
              </div>

              {RPD_SHIFTS.map((name, i) => {
                const shiftColors = ['#3b82f6', '#f97316', '#a855f7'];
                const lastVal = lastShiftVals ? lastShiftVals[name] : null;
                
                return (
                  <div key={name} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem' }}>{t[`shift${i+1}`]}</span>
                    <div style={{ 
                      fontSize: '0.65rem', 
                      fontWeight: '700', 
                      color: shiftColors[i],
                      textAlign: 'center',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '0.2rem 0.1rem',
                      borderRadius: '0.3rem'
                    }}>
                      {lastVal !== null ? `${lastVal.toFixed(1)}%` : '--'}
                    </div>
                    
                    {/* Result Input */}
                    <input 
                      type="number" 
                      step="any"
                      value={shiftResultVals[name]}
                      onChange={e => handleShiftResultChange(name, e.target.value)}
                      placeholder="0.0"
                      style={{ 
                        background: 'rgba(0,0,0,0.3)', 
                        border: '1px solid var(--border-color)', 
                        color: 'white', 
                        padding: '0.4rem', 
                        borderRadius: '0.4rem',
                        fontSize: '0.75rem',
                        textAlign: 'right'
                      }}
                    />

                    {/* Performance (%) Input */}
                    <input 
                      type="number" 
                      step="0.01"
                      value={shiftVals[name]}
                      onChange={e => handleShiftValChange(name, e.target.value)}
                      placeholder="0.0"
                      style={{ 
                        background: 'rgba(59,130,246,0.1)', 
                        border: '1px solid var(--border-color)', 
                        color: 'white', 
                        padding: '0.4rem', 
                        borderRadius: '0.4rem',
                        fontSize: '0.75rem',
                        textAlign: 'right'
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.note}</label>
            <textarea 
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="..."
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', padding: '0.75rem', borderRadius: '0.5rem', minHeight: '80px', resize: 'vertical' }}
            />
          </div>

          <button 
            type="submit" 
            style={{ 
              marginTop: '1rem',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              background: 'var(--accent-indigo)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            <Send size={18} />
            <span>{t.submit}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddDataModal;

