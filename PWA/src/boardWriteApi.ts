export type WriteResult = {
  ok: boolean;
  message: string;
};

async function postBoard(ip: string, path: string): Promise<WriteResult> {
  try {
    const res = await fetch(`http://${ip}${path}`, {
      method: 'POST',
    });

    if (!res.ok) {
      return {
        ok: false,
        message: `HTTP ${res.status}`,
      };
    }

    return {
      ok: true,
      message: 'OK',
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

async function postBoardWithQuery(
  ip: string,
  path: string,
  params: Record<string, string | number>,
): Promise<WriteResult> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    query.set(key, String(value));
  });

  return postBoard(ip, `${path}?${query.toString()}`);
}

export async function setControllerEnable(
  ip: string,
  enabled: boolean,
): Promise<WriteResult> {
  return postBoard(
    ip,
    enabled
      ? '/switch/Controller%20Enable/turn_on'
      : '/switch/Controller%20Enable/turn_off',
  );
}

export async function setGridMeterEnable(
  ip: string,
  enabled: boolean,
): Promise<WriteResult> {
  return postBoard(
    ip,
    enabled
      ? '/switch/Enable%20Grid%20Meter/turn_on'
      : '/switch/Enable%20Grid%20Meter/turn_off',
  );
}

export async function setInverterEnable(
  ip: string,
  enabled: boolean,
): Promise<WriteResult> {
  return postBoard(
    ip,
    enabled
      ? '/switch/Enable%20Inverter/turn_on'
      : '/switch/Enable%20Inverter/turn_off',
  );
}

export async function setControlMode(
  ip: string,
  option: string,
): Promise<WriteResult> {
  return postBoardWithQuery(ip, '/select/Control%20Mode/set', { option });
}

export async function setTemplateNumber(
  ip: string,
  entityName: string,
  value: number,
): Promise<WriteResult> {
  return postBoardWithQuery(
    ip,
    `/number/${encodeURIComponent(entityName)}/set`,
    { value },
  );
}

export async function applyControllerSettings(
  ip: string,
  settings: {
    exportLimitKw: number;
    importLimitKw: number;
    pvRatedKw: number;
    deadbandKw: number;
    controlGain: number;
    rampPctStep: number;
    minPvPercent: number;
    maxPvPercent: number;
  },
): Promise<WriteResult[]> {
  return Promise.all([
    setTemplateNumber(ip, 'Export Limit kW', settings.exportLimitKw),
    setTemplateNumber(ip, 'Import Limit kW', settings.importLimitKw),
    setTemplateNumber(ip, 'PV Rated kW', settings.pvRatedKw),
    setTemplateNumber(ip, 'Deadband kW', settings.deadbandKw),
    setTemplateNumber(ip, 'Control Gain', settings.controlGain),
    setTemplateNumber(ip, 'Ramp pct Step', settings.rampPctStep),
    setTemplateNumber(ip, 'Min PV Percent', settings.minPvPercent),
    setTemplateNumber(ip, 'Max PV Percent', settings.maxPvPercent),
  ]);
}
