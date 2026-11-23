export const sample = {
  stock: 240,
  rate: 90,
  delay: 2,
  wash: 80,
  demand: [70, 140, 95, 120, 80, 45]
};

export function parseDemand(text) {
  const values = text.trim().split(/[\s,]+/);
  if (values.length < 2 || values.length > 12 ||
      values.some(value => !/^\d{1,5}$/.test(value) || Number(value) > 10000) ||
      values.every(value => Number(value) === 0)) {
    throw new Error('Enter 2–12 whole numbers from 0 to 10,000, with at least one positive wave.');
  }
  return values.map(Number);
}

export function simulate({ stock, rate, delay, wash, demand }) {
  let clean = stock;
  let queue = 0;
  const waves = [];
  for (const [index, orders] of demand.entries()) {
    const arriving = index >= delay ? waves[index - delay].returnable : 0;
    queue += arriving;
    const washed = Math.min(wash, queue);
    queue -= washed;
    const available = clean + washed;
    const reusable = Math.min(available, orders);
    const fallback = orders - reusable;
    clean = available - reusable;
    waves.push({
      number: index + 1, orders, arriving, washed, available, reusable, fallback, clean, queue,
      returnable: Math.floor(reusable * rate / 100)
    });
  }
  const total = demand.reduce((sum, count) => sum + count, 0);
  const fallback = waves.reduce((sum, wave) => sum + wave.fallback, 0);
  return { waves, total, reusable: total - fallback, fallback };
}

export function minimumStock(settings) {
  let low = 0;
  let high = settings.demand.reduce((sum, count) => sum + count, 0);
  // Along any zero-fallback prefix, every issued cohort equals that wave's demand.
  // Extra initial stock can preserve that prefix, so the feasibility predicate is monotonic.
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (simulate({ ...settings, stock: middle }).fallback === 0) high = middle;
    else low = middle + 1;
  }
  return low;
}

export function stressSettings(settings) {
  return {
    ...settings,
    rate: Math.max(0, settings.rate - 10),
    delay: settings.delay + 1,
    wash: Math.floor(settings.wash * 0.75)
  };
}

export function compare(settings) {
  const expected = simulate(settings);
  const stress = stressSettings(settings);
  return {
    expected: { settings, ...expected, minimum: minimumStock(settings) },
    stress: { settings: stress, ...simulate(stress), minimum: minimumStock(stress) }
  };
}

export function toCsv(plans) {
  const records = [[
    'scenario', 'wave', 'demand', 'starting_stock', 'return_percent', 'return_delay_waves',
    'wash_capacity_per_wave', 'dirty_arrivals', 'washed', 'clean_before_service',
    'reusable_serves', 'single_use_fallback', 'clean_after_service', 'wash_backlog',
    'minimum_starting_stock'
  ]];
  for (const [label, plan] of Object.entries(plans)) {
    const { stock, rate, delay, wash } = plan.settings;
    for (const wave of plan.waves) {
      records.push([
        label, wave.number, wave.orders, stock, rate, delay, wash, wave.arriving, wave.washed,
        wave.available, wave.reusable, wave.fallback, wave.clean, wave.queue, plan.minimum
      ]);
    }
  }
  return records.map(record => record.join(',')).join('\r\n') + '\r\n';
}
