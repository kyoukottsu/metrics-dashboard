import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { translations } from '../translations';
import { Edit2, Trash2, X, Save } from 'lucide-react';

const RecordsList = ({ language }) => {
  const t = translations[language];
  const [editingId, setEditingId] = useState(null);
  
  const [editDate, setEditDate] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editNote, setEditNote] = useState('');

  const goals = useLiveQuery(() => db.goals.toArray()) || [];
  // Sort by timestamp descending
  const metrics = useLiveQuery(() => db.metrics.orderBy('timestamp').reverse().toArray()) || [];

  const getGoalName = (goalId) => {
    const goal = goals.find(g => g.id === goalId);
    return goal ? goal.name : 'Unknown';
  };

  const handleDelete = async (id) => {
    if (window.confirm(t.confirmDeleteRecord || '¿Estás seguro de que deseas eliminar este registro?')) {
      await db.metrics.delete(id);
    }
  };

  const startEdit = (metric) => {
    setEditingId(metric.id);
    setEditValue(metric.value);
    setEditNote(metric.note || '');
    
    const dateObj = new Date(metric.timestamp);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    setEditDate(`${year}-${month}-${day}`);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = async (id, originalTimestamp) => {
    const origDateObj = new Date(originalTimestamp);
    const origDateStr = `${origDateObj.getFullYear()}-${String(origDateObj.getMonth() + 1).padStart(2, '0')}-${String(origDateObj.getDate()).padStart(2, '0')}`;
    
    let newTimestamp = originalTimestamp;
    if (editDate !== origDateStr) {
      newTimestamp = new Date(`${editDate}T12:00:00`).getTime();
    }

    await db.metrics.update(id, {
      value: Number(editValue),
      note: editNote,
      timestamp: newTimestamp
    });

    setEditingId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{t.recordsTitle || 'Gestión de Registros'}</h2>
        
        {metrics.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>{t.noRecords || 'No se encontraron registros.'}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>{t.date || 'Fecha'}</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>{t.selectGoal || 'Meta'}</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>{t.value || 'Valor'}</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>{t.note || 'Nota'}</th>
                  <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'right' }}>{t.actions || 'Acciones'}</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map(metric => {
                  const isEditing = editingId === metric.id;
                  
                  const displayDate = new Date(metric.timestamp).toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  if (isEditing) {
                    return (
                      <tr key={metric.id} style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem' }}>
                          <input 
                            type="date" 
                            value={editDate}
                            onChange={e => setEditDate(e.target.value)}
                            style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem', borderRadius: '0.3rem', width: '130px', colorScheme: 'dark' }}
                          />
                        </td>
                        <td style={{ padding: '1rem', fontWeight: '500', color: 'white' }}>{getGoalName(metric.goalId)}</td>
                        <td style={{ padding: '1rem' }}>
                          <input 
                            type="number" 
                            step="any"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem', borderRadius: '0.3rem', width: '100px' }}
                          />
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <input 
                            type="text"
                            value={editNote}
                            onChange={e => setEditNote(e.target.value)}
                            style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem', borderRadius: '0.3rem', width: '100%' }}
                          />
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleUpdate(metric.id, metric.timestamp)} style={{ background: 'var(--accent-indigo)', color: 'white', border: 'none', padding: '0.4rem', borderRadius: '0.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title={t.save || 'Guardar'}>
                              <Save size={16} />
                            </button>
                            <button onClick={cancelEdit} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '0.4rem', borderRadius: '0.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title={t.cancel || 'Cancelar'}>
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={metric.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>{displayDate}</td>
                      <td style={{ padding: '1rem', fontWeight: '500' }}>{getGoalName(metric.goalId)}</td>
                      <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '1.05rem' }}>{metric.value}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{metric.note || '-'}</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => startEdit(metric)} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '0.4rem', borderRadius: '0.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title={t.edit || 'Editar'}>
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(metric.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.4rem', borderRadius: '0.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title={t.delete || 'Eliminar'}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordsList;
