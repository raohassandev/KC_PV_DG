import { builtinDrivers } from './builtinDrivers.js';

function fail(msg: string): never {
  console.error(`[validateBuiltinDrivers] ${msg}`);
  process.exit(1);
}

const drivers = builtinDrivers();
if (!Array.isArray(drivers) || drivers.length === 0) fail('No built-in drivers found');

for (const d of drivers) {
  if (!d.id) fail('Driver missing id');
  if (!Array.isArray(d.registers)) fail(`Driver ${d.id} missing registers array`);

  const seen = new Set<string>();
  for (const r of d.registers) {
    if (!r.paramKey) fail(`Driver ${d.id} has register with empty paramKey`);
    if (seen.has(r.paramKey)) fail(`Driver ${d.id} has duplicate paramKey: ${r.paramKey}`);
    seen.add(r.paramKey);

    if (typeof r.address !== 'number' || !Number.isFinite(r.address))
      fail(`Driver ${d.id} register ${r.paramKey} has invalid address`);

    if (r.scale !== undefined && (typeof r.scale !== 'number' || !Number.isFinite(r.scale)))
      fail(`Driver ${d.id} register ${r.paramKey} has invalid scale`);

    if (r.valueKind === 'STRING') {
      if (typeof r.stringLengthWords !== 'number' || !Number.isFinite(r.stringLengthWords) || r.stringLengthWords <= 0)
        fail(`Driver ${d.id} register ${r.paramKey} has invalid stringLengthWords`);
    }
  }
}

console.log(`[validateBuiltinDrivers] ok (${drivers.length} drivers)`);

