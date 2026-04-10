export type EntityResponse = {
  name_id?: string;
  id?: string;
  value?: string | number;
  state?: string | number;
};

async function fetchEntity(
  ip: string,
  path: string,
): Promise<string | number | null> {
  try {
    const res = await fetch(`http://${ip}${path}`);
    if (!res.ok) return null;

    const data: EntityResponse = await res.json();

    if (data.value !== undefined && data.value !== null) return data.value;
    if (data.state !== undefined && data.state !== null) return data.state;

    return null;
  } catch {
    return null;
  }
}

export async function fetchBoardSnapshot(ip: string) {
  const [
    gridFrequency,
    gridTotalActivePowerW,
    gridL1Voltage,
    gridL2Voltage,
    gridL3Voltage,
    gridStatus,
    controllerState,
    gridImportKwh,
    gridPf,
  ] = await Promise.all([
    fetchEntity(ip, '/sensor/Grid%20Frequency'),
    fetchEntity(ip, '/sensor/Grid%20Total%20Active%20Power'),
    fetchEntity(ip, '/sensor/Grid%20L1%20Voltage'),
    fetchEntity(ip, '/sensor/Grid%20L2%20Voltage'),
    fetchEntity(ip, '/sensor/Grid%20L3%20Voltage'),
    fetchEntity(ip, '/text_sensor/Grid%20Meter%20Status'),
    fetchEntity(ip, '/text_sensor/Controller%20State'),
    fetchEntity(ip, '/sensor/Grid%20Import%20Energy'),
    fetchEntity(ip, '/sensor/Grid%20Total%20Power%20Factor'),
  ]);

  return {
    gridFrequency: gridFrequency !== null ? Number(gridFrequency) : null,
    gridTotalActivePowerW:
      gridTotalActivePowerW !== null ? Number(gridTotalActivePowerW) : null,
    gridL1Voltage: gridL1Voltage !== null ? Number(gridL1Voltage) : null,
    gridL2Voltage: gridL2Voltage !== null ? Number(gridL2Voltage) : null,
    gridL3Voltage: gridL3Voltage !== null ? Number(gridL3Voltage) : null,
    gridStatus: gridStatus !== null ? String(gridStatus) : 'NA',
    controllerState: controllerState !== null ? String(controllerState) : 'NA',
    gridImportKwh: gridImportKwh !== null ? Number(gridImportKwh) : null,
    gridPf: gridPf !== null ? Number(gridPf) : null,
  };
}
