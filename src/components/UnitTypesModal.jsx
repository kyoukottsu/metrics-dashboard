import React, { useState } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { translations } from '../translations';

const UnitTypesModal = ({ onClose, language }) => {
  const t = translations[language];
  const unitTypes = useLiveQuery(() => db.unitTypes.toArray()) || [];
  
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', symbol: '' });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingId) {
      await db.unitTypes.update(editingId, { name: form.name, symbol: form.symbol });
    } else {
      await db.unitTypes.add({ name: form.name, symbol: form.symbol });
    }
    setForm({ name: '', symbol: '' });
    setEditingId(null);
  };

  const startEdit = (unit) => {
    setEditingId(unit.id);
    setForm({ name: unit.name || (unit.label ? t[unit.label] : ''), symbol: unit.symbol || '' });
  };

  const handleDelete = async (id) => {
    if (confirm(t.confirmDelete)) {
      await db.unitTypes.delete(id);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1100,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="card" style={{ width: '450px', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{t.manageUnits}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t.unitName}</label>
            <input 
              type="text" 
              value={form.name} 
              onChange={e => setForm({ ...form, name: e.target.value })} 
              required
              placeholder="Ej: Kilos"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--input-border)', color: 'var(--text-input)', padding: '0.6rem', borderRadius: '0.4rem', fontSize: '0.875rem' }}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t.unitSymbol}</label>
            <input 
              type="text" 
              value={form.symbol} 
              onChange={e => setForm({ ...form, symbol: e.target.value })} 
              placeholder="kg"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--input-border)', color: 'var(--text-input)', padding: '0.6rem', borderRadius: '0.4rem', fontSize: '0.875rem' }}
            />
          </div>
          <button type="submit" style={{ padding: '0.6rem', borderRadius: '0.4rem', border: 'none', background: 'var(--accent-indigo)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px' }}>
            {editingId ? <Check size={20} /> : <Plus size={20} />}
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {unitTypes.map(u => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--nav-hover-bg)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{u.label ? t[u.label] : u.name}</span>
                {u.symbol && <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem', fontSize: '0.85rem' }}>({u.symbol})</span>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => startEdit(u)} title={t.edit} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem' }}><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(u.id)} title={t.delete} style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: '0.2rem' }}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UnitTypesModal;
