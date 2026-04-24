/**
 * Quick RS485 meter validation helper.
 *
 * Usage:
 *   npx tsx Testing/pwa_board_probe.ts 192.168.0.111
 *
 * This script reads the same endpoints the PWA dashboard uses.
 */

const ip = process.argv[2];
if (!ip) {
  // eslint-disable-next-line no-console
  console.error('Usage: npx tsx Testing/pwa_board_probe.ts <board-ip>');
  process.exit(2);
}

async function getJson(path: string) {
  const url = `http://${ip}${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return (await res.json()) as { state?: string | number; value?: string | number };
}

function val(x: { state?: string | number; value?: string | number }) {
  return x.state ?? x.value ?? 'NA';
}

const paths = {
  gridFrequency: '/sensor/Grid%20Frequency',
  gridTotalActivePower: '/sensor/Grid%20Total%20Active%20Power',
  gridL1Voltage: '/sensor/Grid%20L1%20Voltage',
  gridL2Voltage: '/sensor/Grid%20L2%20Voltage',
  gridL3Voltage: '/sensor/Grid%20L3%20Voltage',
  gridL1Current: '/sensor/Grid%20L1%20Current',
  gridL2Current: '/sensor/Grid%20L2%20Current',
  gridL3Current: '/sensor/Grid%20L3%20Current',
  gridStatus: '/text_sensor/Grid%20Meter%20Status',
  controllerState: '/text_sensor/Controller%20State',
  gridImportEnergy: '/sensor/Grid%20Import%20Energy',
  gridPf: '/sensor/Grid%20Total%20Power%20Factor',
};

async function main() {
  const data = await Promise.all(
    Object.entries(paths).map(async ([k, p]) => {
      try {
        return [k, val(await getJson(p))] as const;
      } catch (err) {
        return [k, `ERR(${(err as Error).message})`] as const;
      }
    }),
  );

  // eslint-disable-next-line no-console
  console.log(Object.fromEntries(data));
}

void main();

