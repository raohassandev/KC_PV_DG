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

    if (data.state !== undefined) return data.state;
    if (data.value !== undefined) return data.value;

    return null;
  } catch {
    return null;
  }
}

export async function fetchBoardSnapshot(ip: string) {
  const [gridFrequency, gridTotalKw, gridImportKwh, controllerState] =
    await Promise.all([
      fetchEntity(ip, '/sensor/Grid%20Frequency'),
      fetchEntity(ip, '/sensor/Grid%20Total%20kW'),
      fetchEntity(ip, '/sensor/Grid%20Import%20Energy'),
      fetchEntity(ip, '/text_sensor/Controller%20State'),
    ]);

  return {
    gridFrequency: gridFrequency !== null ? Number(gridFrequency) : null,
    gridTotalKw: gridTotalKw !== null ? Number(gridTotalKw) : null,
    gridImportKwh: gridImportKwh !== null ? Number(gridImportKwh) : null,
    controllerState: controllerState !== null ? String(controllerState) : 'NA',
  };
}
