import Dexie from 'dexie';

export const db = new Dexie('MetricsDashboardDB');

db.version(2).stores({
  goals: '++id, name, target, period, method, color, unit',
  metrics: '++id, goalId, value, timestamp, note',
  settings: 'key, value',
  inventory: '++id, templateName, type, value, timestamp'
});

db.version(3).stores({
  goals: '++id, name, target, period, method, color, unit',
  metrics: '++id, goalId, value, timestamp, note',
  settings: 'key, value',
  inventory: '++id, templateName, type, value, timestamp',
  resets: '++id, timestamp'
});

db.version(4).stores({
  goals: '++id, name, target, period, method, color, unit, unitType, parentId',
  metrics: '++id, goalId, value, timestamp, note',
  settings: 'key, value',
  inventory: '++id, templateName, type, value, timestamp',
  resets: '++id, timestamp',
  inventoryTemplates: '++id, name'
});

db.version(5).stores({
  goals: '++id, name, color, unit, unitType, method',
  goalTargets: '++id, goalId, period, target',
  metrics: '++id, goalId, value, timestamp, note',
  settings: 'key, value',
  inventory: '++id, templateName, type, value, timestamp',
  resets: '++id, timestamp',
  inventoryTemplates: '++id, name'
});

// v6: Add startDate, endDate (vigencia) to goals + goalCycles for history
db.version(6).stores({
  goals: '++id, name, color, unit, unitType, method, startDate, endDate',
  goalTargets: '++id, goalId, period, target',
  goalCycles: '++id, goalId, startDate, endDate',
  metrics: '++id, goalId, value, timestamp, note',
  settings: 'key, value',
  inventory: '++id, templateName, type, value, timestamp',
  resets: '++id, timestamp',
  inventoryTemplates: '++id, name'
});

// v7: Add unitTypes store
db.version(7).stores({
  goals: '++id, name, color, unit, unitType, method, startDate, endDate',
  goalTargets: '++id, goalId, period, target',
  goalCycles: '++id, goalId, startDate, endDate',
  metrics: '++id, goalId, value, timestamp, note',
  settings: 'key, value',
  inventory: '++id, templateName, type, value, timestamp',
  resets: '++id, timestamp',
  inventoryTemplates: '++id, name',
  unitTypes: '++id, name, symbol, label'
});

// v8: Add behavior to goals
db.version(8).stores({
  goals: '++id, name, color, unit, unitType, method, behavior, startDate, endDate',
  goalTargets: '++id, goalId, period, target',
  goalCycles: '++id, goalId, startDate, endDate',
  metrics: '++id, goalId, value, timestamp, note',
  settings: 'key, value',
  inventory: '++id, templateName, type, value, timestamp',
  resets: '++id, timestamp',
  inventoryTemplates: '++id, name',
  unitTypes: '++id, name, symbol, label'
});

// v9: Enhanced goalTargets with name, unitType, and custom dates
db.version(9).stores({
  goals: '++id, name, color, unit, unitType, method, behavior, startDate, endDate',
  goalTargets: '++id, goalId, period, target, name, unitType, startDate, endDate',
  goalCycles: '++id, goalId, startDate, endDate',
  metrics: '++id, goalId, value, timestamp, note',
  settings: 'key, value',
  inventory: '++id, templateName, type, value, timestamp',
  resets: '++id, timestamp',
  inventoryTemplates: '++id, name',
  unitTypes: '++id, name, symbol, label'
});

// v10: Move configuration fields (color, logic, unit, validity) to targets
db.version(10).stores({
  goals: '++id, name, method',
  goalTargets: '++id, goalId, period, target, name, unitType, startDate, endDate'
}).upgrade(tx => tx.db.tasks || tx.table('goals').toArray().then(async goals => {
  const targets = await tx.table('goalTargets').toArray();
  for (const goal of goals) {
    const goalTargets = targets.filter(t => t.goalId === goal.id);
    for (const target of goalTargets) {
      await tx.table('goalTargets').update(target.id, {
        color: target.color || goal.color || '#6366f1',
        behavior: target.behavior || goal.behavior || 'cumulative',
        unit: target.unit || goal.unit || '',
        unitType: target.unitType || goal.unitType || 'units',
        startDate: target.startDate || goal.startDate || null,
        endDate: target.endDate || goal.endDate || null,
        name: target.name || goal.name || ''
      });
    }
  }
}));

// v11: Add 'result' field to metrics to store raw data (e.g. daily count vs percentage)
db.version(11).stores({
  metrics: '++id, goalId, value, result, timestamp, note'
});


export async function seedDatabase() {
  const goalsCount = await db.goals.count();
  const unitTypesCount = await db.unitTypes.count();

  if (unitTypesCount === 0) {
    await db.unitTypes.bulkAdd([
      { id: 'units',   label: 'unitUnits',  symbol: '' },
      { id: 'money',   label: 'unitMXN',    symbol: '$' },
      { id: 'pieces',  label: 'unitPieces', symbol: 'pz' },
      { id: 'persons', label: 'unitPersons',symbol: '' },
      { id: 'surveys', label: 'unitSurveys',symbol: '' },
    ]);
  }

  if (goalsCount === 0) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    const goalIds = await db.goals.bulkAdd([
      { name: 'Redondeo',  method: 'manual',    color: '#10b981', unit: '$',  unitType: 'money',   startDate: monthStart, endDate: monthEnd },
      { name: 'Clientes',  method: 'manual',    color: '#6366f1', unit: '',   unitType: 'persons', startDate: monthStart, endDate: monthEnd },
      { name: 'Activos',   method: 'automatic', color: '#f59e0b', unit: '',   unitType: 'persons', startDate: monthStart, endDate: monthEnd },
    ], { allKeys: true });

    await db.goalTargets.bulkAdd([
      { goalId: goalIds[0], period: 'daily',   target: 24  },
      { goalId: goalIds[0], period: 'monthly', target: 744 },
      { goalId: goalIds[1], period: 'daily',   target: 5   },
      { goalId: goalIds[2], period: 'daily',   target: 150 },
      { goalId: goalIds[2], period: 'monthly', target: 4500},
    ]);

    const metrics = [];
    const goalBases = [22, 4, 140];
    goalIds.forEach((goalId, i) => {
      for (let d = 0; d < 22; d++) {
        const date = new Date(now); date.setDate(date.getDate() - d);
        metrics.push({ goalId, value: goalBases[i] * (0.85 + Math.random() * 0.3), timestamp: date.getTime(), note: 'Seed' });
      }
    });
    await db.metrics.bulkAdd(metrics);
  }
}
