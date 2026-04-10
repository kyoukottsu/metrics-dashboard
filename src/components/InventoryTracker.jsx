import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Save, RotateCcw, Filter, X, History, Edit2, Trash2, ChevronDown, ChevronUp, BookOpen, Plus, Check } from 'lucide-react';
import { translations } from '../translations';

const InventoryTracker = ({ language }) => {
  const t = translations[language];
  const allLogs = useLiveQuery(() => db.inventory.orderBy('timestamp').reverse().toArray()) || [];
  const resets = useLiveQuery(() => db.resets.orderBy('timestamp').reverse().toArray()) || [];
  const templates = useLiveQuery(() => db.inventoryTemplates.orderBy('name').toArray()) || [];

  const lastResetTimestamp = resets.length > 0 ? resets[0].timestamp : 0;

  const [form, setForm] = useState({ templateName: '', type: 'exact', value: '' });
  const [editingLogId, setEditingLogId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [editTemplateName, setEditTemplateName] = useState('');
  const datalistRef = useRef();

  /* ── Submit new log ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    await db.inventory.add({ ...form, value: Number(form.value), timestamp: Date.now() });
    setForm({ templateName: '', type: 'exact', value: '' });
  };

  /* ── Delete log ── */
  const deleteLog = async (id) => {
    if (confirm(t.confirmDeleteLog)) await db.inventory.delete(id);
  };

  /* ── Start edit log ── */
  const startEditLog = (log) => {
    setEditingLogId(log.id);
    setEditForm({ templateName: log.templateName, type: log.type, value: log.value });
  };

  /* ── Save edit log ── */
  const saveEditLog = async (id) => {
    await db.inventory.update(id, { ...editForm, value: Number(editForm.value) });
    setEditingLogId(null);
  };

  /* ── Soft reset ── */
  const handleReset = async () => {
    if (confirm(t.confirmReset)) await db.resets.add({ timestamp: Date.now() });
  };

  /* ── Templates CRUD ── */
  const addTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    await db.inventoryTemplates.add({ name: newTemplateName.trim() });
    setNewTemplateName('');
  };

  const saveTemplateEdit = async (id) => {
    if (!editTemplateName.trim()) return;
    await db.inventoryTemplates.update(id, { name: editTemplateName.trim() });
    setEditingTemplateId(null);
  };

  const deleteTemplate = async (id) => {
    await db.inventoryTemplates.delete(id);
  };

  /* ── Filtered logs for table ── */
  const logsForTable = allLogs.filter(log => {
    if (!dateFilter.start && !dateFilter.end) return true;
    const d = new Date(log.timestamp);
    d.setHours(0, 0, 0, 0);
    const s = dateFilter.start ? new Date(dateFilter.start) : null;
    const en = dateFilter.end ? new Date(dateFilter.end) : null;
    if (en) en.setHours(23, 59, 59, 999);
    if (s && d < s) return false;
    if (en && d > en) return false;
    return true;
  });

  const activeLogs = allLogs.filter(l => l.timestamp > lastResetTimestamp);
  const runningTotal = activeLogs.reduce((a, l) => l.type === 'excess' ? a + l.value : l.type === 'shortage' ? a - l.value : a, 0);
  const filteredTotal = logsForTable.reduce((a, l) => l.type === 'excess' ? a + l.value : l.type === 'shortage' ? a - l.value : a, 0);
  const hasFilter = dateFilter.start || dateFilter.end;

  const inputStyle = {
    background: 'var(--bg-input)',
    border: '1px solid var(--input-border)',
    color: 'var(--text-input)',
    padding: '0.55rem 0.75rem',
    borderRadius: '0.4rem',
    fontSize: '0.875rem',
    width: '100%'
  };

  const badgeStyle = (type) => ({
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '700',
    background: type === 'excess' ? 'rgba(16,185,129,0.15)' : type === 'shortage' ? 'rgba(244,63,94,0.15)' : 'rgba(234,179,8,0.15)',
    color: type === 'excess' ? 'var(--accent-emerald)' : type === 'shortage' ? 'var(--accent-rose)' : '#eab308' // yellow for exact
  });

  const getTemplateTotal = (templateName) => {
    const templateLogs = activeLogs.filter(l => l.templateName === templateName);
    if (templateLogs.length === 0) return null; // No logs configured basically

    const net = templateLogs.reduce((a, l) => l.type === 'excess' ? a + l.value : l.type === 'shortage' ? a - l.value : a, 0);
    if (net > 0) return { type: 'excess', value: net, label: t.excess || 'Sobrante', term: t.excess || 'Sobrante' };
    if (net < 0) return { type: 'shortage', value: Math.abs(net), label: t.shortage || 'Faltante', term: t.shortage || 'Faltante' };
    return { type: 'exact', value: 0, label: t.exact || 'Exacto', term: t.exact || 'Exacto' };
  };

  return (
    <div>
      {/* ── Top Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{t.inventoryTracker}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(244,63,94,0.12)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.25)', padding: '0.35rem 0.85rem', borderRadius: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}>
              <RotateCcw size={13} />{t.reset}
            </button>
            {lastResetTimestamp > 0 && (
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <History size={11} />Last reset: {new Date(lastResetTimestamp).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Big Running Total */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1rem 2rem', textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>{t.runningTotal}</div>
          <div style={{ fontSize: '4rem', fontWeight: '800', lineHeight: 1, color: runningTotal >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
            {runningTotal >= 0 ? '+$' : '-$'}{Math.abs(runningTotal).toLocaleString()}
          </div>
          {lastResetTimestamp > 0 && <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>desde último reinicio</div>}
        </div>
      </div>

      {/* ── Add Entry Form ── */}
      <form onSubmit={handleSubmit} className="card" style={{ marginBottom: '1rem' }}>
        <datalist id="template-list">
          {templates.map(tp => <option key={tp.id} value={tp.name} />)}
        </datalist>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t.templateName}</label>
            <input list="template-list" type="text" value={form.templateName} onChange={e => setForm({...form, templateName: e.target.value})} required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t.type}</label>
            <select 
              value={form.type} 
              onChange={e => {
                const newType = e.target.value;
                setForm({...form, type: newType, value: newType === 'exact' ? 0 : form.value});
              }} 
              style={{
                ...inputStyle, 
                fontWeight: '600',
                color: form.type === 'excess' ? 'var(--accent-emerald)' : form.type === 'shortage' ? 'var(--accent-rose)' : '#eab308'
              }}
            >
              <option value="excess" style={{ color: 'var(--accent-emerald)' }}>{t.excess}</option>
              <option value="shortage" style={{ color: 'var(--accent-rose)' }}>{t.shortage}</option>
              <option value="exact" style={{ color: '#eab308' }}>{t.exact}</option>
            </select>
          </div>
          {form.type !== 'exact' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t.value}</label>
              <input type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})} required style={inputStyle} />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" style={{ width: '100%', padding: '0.55rem', borderRadius: '0.4rem', background: 'var(--accent-indigo)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
              <Save size={16} />{t.addLog}
            </button>
          </div>
        </div>
      </form>

      {/* ── Templates Panel ── */}
      <div className="card" style={{ marginBottom: '1rem', padding: '0' }}>
        <button onClick={() => setShowTemplates(s => !s)} style={{ background: 'none', border: 'none', width: '100%', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '500', fontSize: '0.875rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpen size={15} />{t.templates}</span>
          {showTemplates ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        {showTemplates && (
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <form onSubmit={addTemplate} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input type="text" placeholder={t.newTemplate} value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <button type="submit" style={{ padding: '0.5rem 1rem', background: 'var(--accent-indigo)', color: 'white', border: 'none', borderRadius: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                <Plus size={14} />{t.save}
              </button>
            </form>
            {templates.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t.noTemplates}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', columnGap: '1rem', rowGap: '0.2rem' }}>
            {templates.map(tp => {
              const totalObj = getTemplateTotal(tp.name);
              const tpBg = totalObj 
                ? (totalObj.type === 'excess' ? 'rgba(16,185,129,0.1)' : totalObj.type === 'shortage' ? 'rgba(244,63,94,0.1)' : 'rgba(234,179,8,0.1)') 
                : 'transparent';

              return (
                <div key={tp.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.5rem', borderBottom: '1px solid var(--border-color)', background: tpBg, borderRadius: '0.3rem' }}>
                  {editingTemplateId === tp.id ? (
                    <>
                      <input type="text" value={editTemplateName} onChange={e => setEditTemplateName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                      <button onClick={() => saveTemplateEdit(tp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-emerald)', padding: '0.3rem' }}><Check size={15} /></button>
                      <button onClick={() => setEditingTemplateId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.3rem' }}><X size={15} /></button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: '500' }}>{tp.name}</span>
                      
                      {totalObj && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginRight: '0.5rem' }}>
                          <span style={{ ...badgeStyle(totalObj.type), minWidth: '70px', textAlign: 'center' }}>{totalObj.label}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: totalObj.type === 'excess' ? 'var(--accent-emerald)' : totalObj.type === 'shortage' ? 'var(--accent-rose)' : '#eab308', minWidth: '55px', textAlign: 'right' }}>
                            {totalObj.type === 'shortage' ? '-$' : (totalObj.value > 0 ? '$' : '$')}{totalObj.value > 0 ? totalObj.value.toLocaleString() : '0'}
                          </span>
                        </div>
                      )}

                      <button onClick={() => { setEditingTemplateId(tp.id); setEditTemplateName(tp.name); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.3rem' }}><Edit2 size={13} /></button>
                      <button onClick={() => deleteTemplate(tp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)', padding: '0.3rem' }}><Trash2 size={13} /></button>
                    </>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        )}
      </div>

      {/* ── Date Filter ── */}
      <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1.25rem', flexDirection: 'row', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}><Filter size={13} />Filtrar:</span>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t.startDate}</span>
            <input type="date" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} style={{ ...inputStyle, width: 'auto', padding: '0.3rem 0.5rem' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t.endDate}</span>
            <input type="date" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} style={{ ...inputStyle, width: 'auto', padding: '0.3rem 0.5rem' }} />
          </div>
          {hasFilter && <button onClick={() => setDateFilter({start:'',end:''})} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><X size={13} />{t.clearFilter}</button>}
        </div>
        {hasFilter && <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total periodo: <strong style={{ color: filteredTotal >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>{filteredTotal >= 0 ? '+' : ''}{filteredTotal.toLocaleString()}</strong></span>}
      </div>

      {/* ── Logs Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--table-header-bg)' }}>{t.templateName}</th>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--table-header-bg)' }}>{t.type}</th>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--table-header-bg)' }}>{t.value}</th>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--table-header-bg)' }}>Fecha</th>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--table-header-bg)' }}></th>
            </tr>
          </thead>
          <tbody>
            {logsForTable.map(log => {
              const isBefore = lastResetTimestamp > 0 && log.timestamp <= lastResetTimestamp;
              return (
                <tr key={log.id} style={{ borderTop: '1px solid var(--border-color)', opacity: isBefore ? 0.45 : 1 }}>
                  {editingLogId === log.id ? (
                    <>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <input list="template-list" type="text" value={editForm.templateName} onChange={e => setEditForm({...editForm, templateName: e.target.value})} style={{ ...inputStyle, width: '100%' }} />
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <select value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})} style={inputStyle}>
                          <option value="excess">{t.excess}</option>
                          <option value="shortage">{t.shortage}</option>
                          <option value="exact">{t.exact}</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <input type="number" value={editForm.value} onChange={e => setEditForm({...editForm, value: e.target.value})} style={{ ...inputStyle, width: '100%' }} />
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{new Date(log.timestamp).toLocaleString()}</td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button onClick={() => saveEditLog(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-emerald)', padding: '0.3rem' }}><Check size={15} /></button>
                          <button onClick={() => setEditingLogId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.3rem' }}><X size={15} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                        {log.templateName}
                        {isBefore && <span style={{ marginLeft: '0.4rem', fontSize: '0.62rem', color: 'var(--text-secondary)', background: 'var(--table-header-bg)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>pre-reset</span>}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}><span style={badgeStyle(log.type)}>{t[log.type]}</span></td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {log.type === 'excess' ? '+' : log.type === 'shortage' ? '-' : ''}{log.value.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{new Date(log.timestamp).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                          <button onClick={() => startEditLog(log)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.3rem' }}><Edit2 size={14} /></button>
                          <button onClick={() => deleteLog(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)', padding: '0.3rem' }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {logsForTable.length === 0 && (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {hasFilter ? 'No hay registros para este periodo.' : 'No hay registros aún.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTracker;
