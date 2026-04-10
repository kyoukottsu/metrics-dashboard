import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import MetricCard from './MetricCard';
import InventorySummaryCard from './InventorySummaryCard';
import { translations } from '../translations';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Dashboard = ({ language, onAddData }) => {
  const t = translations[language];
  const now = new Date();

  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed

  const goals      = useLiveQuery(() => db.goals.toArray())      || [];
  const allTargets = useLiveQuery(() => db.goalTargets.toArray()) || [];
  const allMetrics = useLiveQuery(() => db.metrics.orderBy('timestamp').reverse().toArray()) || [];
  const unitTypes  = useLiveQuery(() => db.unitTypes.toArray())  || [];
  const allInvLogs = useLiveQuery(() => db.inventory.toArray()) || [];
  const allResets  = useLiveQuery(() => db.resets.orderBy('timestamp').reverse().toArray()) || [];

  /* ── Month window ── */
  const monthStart = new Date(selectedYear, selectedMonth, 1).getTime();
  const monthEnd   = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).getTime();

  const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTHS = language === 'es' ? MONTHS_ES : MONTHS_EN;

  const prevMonth = () => { if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); } else { setSelectedMonth(m => m - 1); } };
  const nextMonth = () => { if (selectedMonth === 11) { setSelectedMonth(0);  setSelectedYear(y => y + 1); } else { setSelectedMonth(m => m + 1); } };
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  /* ── One card per goal (all targets on same card) ── */
  const cards = goals.map(goal => {
    const targets     = allTargets.filter(tg => tg.goalId === goal.id);
    const goalMetrics = allMetrics.filter(m => m.goalId === goal.id && m.timestamp >= monthStart && m.timestamp <= monthEnd);
    const allGoalMetrics = allMetrics.filter(m => m.goalId === goal.id);
    return { goal, targets, metrics: goalMetrics, allMetrics: allGoalMetrics };
  });

  return (
    <div>
      {/* ── Month Picker ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.6rem', padding: '0.4rem 0.75rem' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0.1rem' }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)', minWidth: '140px', textAlign: 'center' }}>
            {MONTHS[selectedMonth]} {selectedYear}
          </span>
          <button onClick={nextMonth} disabled={isCurrentMonth} style={{ background: 'none', border: 'none', cursor: isCurrentMonth ? 'not-allowed' : 'pointer', color: isCurrentMonth ? 'var(--border-color)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0.1rem' }}>
            <ChevronRight size={18} />
          </button>
        </div>

        {!isCurrentMonth && (
          <button onClick={() => { setSelectedMonth(now.getMonth()); setSelectedYear(now.getFullYear()); }}
            style={{ fontSize: '0.75rem', color: 'var(--accent-indigo)', background: 'none', border: '1px solid var(--accent-indigo)', borderRadius: '0.4rem', padding: '0.3rem 0.75rem', cursor: 'pointer' }}>
            {language === 'es' ? 'Volver al mes actual' : 'Back to current month'}
          </button>
        )}
      </div>

      {/* ── Cards Grid ── */}
      <div className="dashboard-grid">
        <InventorySummaryCard 
          allLogs={allInvLogs} 
          resets={allResets} 
          language={language} 
        />
        {cards.map(({ goal, targets, metrics, allMetrics }) => (
          <MetricCard
            key={goal.id}
            goal={goal}
            targets={targets}
            metrics={metrics}
            allMetrics={allMetrics}
            language={language}
            unitTypes={unitTypes}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onAddData={onAddData}
          />
        ))}
        {cards.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No hay metas. Ve a la sección de Metas para crear una.
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
