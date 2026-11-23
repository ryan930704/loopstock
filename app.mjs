import { compare, parseDemand, sample, toCsv } from './model.mjs';

const byId = id => document.getElementById(id);
const form = byId('settings');
const demand = byId('demand');
const message = byId('form-message');
const format = new Intl.NumberFormat('en');
let plans;
let scenario = 'expected';

function messageText(text, error = false) {
  message.textContent = text;
  message.classList.toggle('error', error);
}

function setInputs(settings) {
  for (const id of ['stock', 'rate', 'delay', 'wash']) byId(id).value = settings[id];
  demand.value = settings.demand.join(', ');
  demand.removeAttribute('aria-invalid');
}

function render() {
  const plan = plans[scenario];
  const { settings, waves } = plan;
  const max = Math.max(...settings.demand);
  const firstGap = waves.find(wave => wave.fallback > 0);
  byId('total').textContent = format.format(plan.total);
  byId('reused').textContent = format.format(plan.reusable);
  byId('coverage').textContent = format.format(Math.round(plan.reusable / plan.total * 100)) + '% of drink orders';
  byId('fallback').textContent = format.format(plan.fallback);
  byId('gap-card').classList.toggle('caution', Boolean(firstGap));
  byId('gap-note').textContent = firstGap ? 'First shortfall in wave ' + firstGap.number : 'Every order has a cup';
  byId('scenario-note').textContent = settings.rate + '% returns · ' + settings.delay + '-wave lag · ' + format.format(settings.wash) + ' washes per wave';
  byId('expected').setAttribute('aria-pressed', scenario === 'expected');
  byId('stress').setAttribute('aria-pressed', scenario === 'stress');

  byId('chart').innerHTML = waves.map(wave => `
    <div class="wave">
      <span class="wave-label">Wave ${wave.number}</span>
      <div class="track">
        <span class="bar-reuse" style="width:${wave.reusable / max * 100}%"></span>
        <span class="bar-fallback" style="width:${wave.fallback / max * 100}%"></span>
      </div>
      <span class="wave-number ${wave.fallback ? 'has-gap' : ''}">${format.format(wave.orders)}</span>
    </div>`).join('');
  byId('table-body').innerHTML = waves.map(wave => `
    <tr class="${wave.fallback ? 'with-gap' : ''}">
      <th scope="row">${wave.number}</th>
      <td>${format.format(wave.orders)}</td>
      <td>${format.format(wave.arriving)}</td>
      <td>${format.format(wave.washed)}</td>
      <td>${format.format(wave.reusable)}</td>
      <td>${format.format(wave.fallback)}</td>
      <td>${format.format(wave.queue)}</td>
    </tr>`).join('');

  const delta = plan.minimum - settings.stock;
  byId('minimum').textContent = format.format(plan.minimum);
  byId('recommend-note').textContent = delta > 0
    ? 'Add ' + format.format(delta) + ' starting cups to cover every wave under these assumptions.'
    : 'Starting stock covers every wave under these assumptions.';
  byId('apply-minimum').disabled = delta === 0 || form.dataset.dirty === 'true';
  byId('outcome').textContent = (scenario === 'expected' ? 'Expected' : 'Stress test') +
    ': ' + plan.reusable + ' reusable serves, ' + plan.fallback + ' single-use fallback, ' +
    plan.minimum + ' minimum starting cups.';
  document.querySelector('.metrics').setAttribute('aria-label',
    (scenario === 'expected' ? 'Expected' : 'Stress test') + ' scenario summary');
}

function run(settings, demo = false) {
  plans = compare(settings);
  form.dataset.dirty = 'false';
  byId('export').disabled = false;
  byId('plan-context').textContent = (demo ? 'Campus festival demo' : 'Current plan') +
    ' · ' + settings.demand.length + ' service waves';
  render();
}

byId('demo').addEventListener('click', () => {
  setInputs(sample);
  scenario = 'expected';
  run(sample, true);
  messageText('Campus festival demo loaded.');
});

form.addEventListener('input', () => {
  demand.removeAttribute('aria-invalid');
  form.dataset.dirty = 'true';
  messageText('Run the plan to apply your edits.');
  byId('apply-minimum').disabled = true;
  byId('export').disabled = true;
});

form.addEventListener('submit', event => {
  event.preventDefault();
  let waves;
  try {
    waves = parseDemand(demand.value);
  } catch (error) {
    demand.setAttribute('aria-invalid', 'true');
    messageText(error.message, true);
    demand.focus();
    return;
  }
  const { stock, rate, delay, wash } = form.elements;
  run({ stock: stock.valueAsNumber, rate: rate.valueAsNumber,
    delay: delay.valueAsNumber, wash: wash.valueAsNumber, demand: waves });
  messageText('Plan updated.');
});

for (const buttonId of ['expected', 'stress']) {
  byId(buttonId).addEventListener('click', () => {
    scenario = buttonId;
    render();
  });
}

byId('apply-minimum').addEventListener('click', () => {
  const settings = { ...plans.expected.settings, stock: plans[scenario].minimum };
  setInputs(settings);
  run(settings);
  messageText('Recommended stock applied.');
});

byId('export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([toCsv(plans)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'loopstock-plan.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

setInputs(sample);
run(sample, true);
