/**
 * Validação do motor de agenda — standalone.
 */
import {
  formatDailySchedule,
  generateDailyTimesFromInterval,
  getNextScheduledDose,
} from '../lib/schedule-engine';

const errors: string[] = [];
const assert = (cond: boolean, msg: string) => {
  if (!cond) errors.push(msg);
};

const paracetamolSchedule = generateDailyTimesFromInterval('08:00', 8);
assert(
  formatDailySchedule(paracetamolSchedule) === '08:00 · 16:00 · 00:00',
  `Paracetamol 8h: esperado 08:00 · 16:00 · 00:00, recebido ${formatDailySchedule(paracetamolSchedule)}`,
);

const every12 = generateDailyTimesFromInterval('08:00', 12);
assert(every12.length === 2, '12h deve gerar 2 horários');
assert(every12.includes('08:00') && every12.includes('20:00'), '12h: 08:00 e 20:00');

const every24 = generateDailyTimesFromInterval('08:00', 24);
assert(every24.length === 1 && every24[0] === '08:00', '24h deve gerar 1 horário');

const next = getNextScheduledDose(
  { frequencyMode: 'interval', intervalHours: 8, firstDoseTime: '08:00' },
  new Date('2026-06-01T09:00:00'),
);
assert(next.getHours() === 16, 'Próxima dose após 09:00 deveria ser 16:00');

if (errors.length === 0) {
  console.log('✔ Testes de agenda passaram.');
  process.exit(0);
} else {
  console.error('✘ Falhas:');
  errors.forEach((e) => console.error('  -', e));
  process.exit(1);
}
