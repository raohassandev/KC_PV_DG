// export type EntityResponse = {
//   name_id?: string;
//   id?: string;
//   value?: string | number;
//   state?: string | number;
// };

// async function fetchEntity(
//   ip: string,
//   path: string,
// ): Promise<string | number | null> {
//   try {
//     const res = await fetch(`http://${ip}${path}`);
//     if (!res.ok) return null;

//     const data: EntityResponse = await res.json();

//     if (data.value !== undefined && data.value !== null) return data.value;
//     if (data.state !== undefined && data.state !== null) return data.state;

//     return null;
//   } catch {
//     return null;
//   }
// }

// export async function fetchBoardSnapshot(ip: string) {
//   const [
//     gridFrequency,
//     gridTotalActivePowerW,
//     gridL1Voltage,
//     gridL2Voltage,
//     gridL3Voltage,
//     gridStatus,
//     controllerState,
//     gridImportKwh,
//     gridPf,
//   ] = await Promise.all([
//     fetchEntity(ip, '/sensor/Grid%20Frequency'),
//     fetchEntity(ip, '/sensor/Grid%20Total%20Active%20Power'),
//     fetchEntity(ip, '/sensor/Grid%20L1%20Voltage'),
//     fetchEntity(ip, '/sensor/Grid%20L2%20Voltage'),
//     fetchEntity(ip, '/sensor/Grid%20L3%20Voltage'),
//     fetchEntity(ip, '/text_sensor/Grid%20Meter%20Status'),
//     fetchEntity(ip, '/text_sensor/Controller%20State'),
//     fetchEntity(ip, '/sensor/Grid%20Import%20Energy'),
//     fetchEntity(ip, '/sensor/Grid%20Total%20Power%20Factor'),
//   ]);

//   return {
//     gridFrequency: gridFrequency !== null ? Number(gridFrequency) : null,
//     gridTotalActivePowerW:
//       gridTotalActivePowerW !== null ? Number(gridTotalActivePowerW) : null,
//     gridL1Voltage: gridL1Voltage !== null ? Number(gridL1Voltage) : null,
//     gridL2Voltage: gridL2Voltage !== null ? Number(gridL2Voltage) : null,
//     gridL3Voltage: gridL3Voltage !== null ? Number(gridL3Voltage) : null,
//     gridStatus: gridStatus !== null ? String(gridStatus) : 'NA',
//     controllerState: controllerState !== null ? String(controllerState) : 'NA',
//     gridImportKwh: gridImportKwh !== null ? Number(gridImportKwh) : null,
//     gridPf: gridPf !== null ? Number(gridPf) : null,
//   };
// }

import { boardEntityMap } from './boardEntityMap';

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
    gridTotalReactivePowerVar,
    gridTotalApparentPowerVa,
    gridL1Voltage,
    gridL2Voltage,
    gridL3Voltage,
    gridL1Current,
    gridL2Current,
    gridL3Current,
    gridL1ActivePowerW,
    gridL2ActivePowerW,
    gridL3ActivePowerW,
    gridL1ReactivePowerVar,
    gridL2ReactivePowerVar,
    gridL3ReactivePowerVar,
    gridL1ApparentPowerVa,
    gridL2ApparentPowerVa,
    gridL3ApparentPowerVa,
    gridL1Pf,
    gridL2Pf,
    gridL3Pf,
    gridStatus,
    controllerState,
    gridImportKwh,
    gridExportKwh,
    gridImportKwhT1,
    gridExportKwhT1,
    gridImportKwhT2,
    gridPf,
    inverterStatus,
    inverterActualPower,
    inverterPmax,
  ] = await Promise.all([
    fetchEntity(ip, boardEntityMap.grid.frequency),
    fetchEntity(ip, boardEntityMap.grid.totalActivePower),
    fetchEntity(ip, boardEntityMap.grid.totalReactivePower),
    fetchEntity(ip, boardEntityMap.grid.totalApparentPower),
    fetchEntity(ip, boardEntityMap.grid.l1Voltage),
    fetchEntity(ip, boardEntityMap.grid.l2Voltage),
    fetchEntity(ip, boardEntityMap.grid.l3Voltage),
    fetchEntity(ip, boardEntityMap.grid.l1Current),
    fetchEntity(ip, boardEntityMap.grid.l2Current),
    fetchEntity(ip, boardEntityMap.grid.l3Current),
    fetchEntity(ip, boardEntityMap.grid.l1ActivePower),
    fetchEntity(ip, boardEntityMap.grid.l2ActivePower),
    fetchEntity(ip, boardEntityMap.grid.l3ActivePower),
    fetchEntity(ip, boardEntityMap.grid.l1ReactivePower),
    fetchEntity(ip, boardEntityMap.grid.l2ReactivePower),
    fetchEntity(ip, boardEntityMap.grid.l3ReactivePower),
    fetchEntity(ip, boardEntityMap.grid.l1ApparentPower),
    fetchEntity(ip, boardEntityMap.grid.l2ApparentPower),
    fetchEntity(ip, boardEntityMap.grid.l3ApparentPower),
    fetchEntity(ip, boardEntityMap.grid.l1PowerFactor),
    fetchEntity(ip, boardEntityMap.grid.l2PowerFactor),
    fetchEntity(ip, boardEntityMap.grid.l3PowerFactor),
    fetchEntity(ip, boardEntityMap.grid.status),
    fetchEntity(ip, boardEntityMap.controller.state),
    fetchEntity(ip, boardEntityMap.grid.importEnergy),
    fetchEntity(ip, boardEntityMap.grid.exportEnergy),
    fetchEntity(ip, boardEntityMap.grid.importEnergyTariff1),
    fetchEntity(ip, boardEntityMap.grid.exportEnergyTariff1),
    fetchEntity(ip, boardEntityMap.grid.importEnergyTariff2),
    fetchEntity(ip, boardEntityMap.grid.totalPowerFactor),
    fetchEntity(ip, boardEntityMap.inverter.status),
    fetchEntity(ip, boardEntityMap.inverter.actualPower),
    fetchEntity(ip, boardEntityMap.inverter.pmax),
  ]);

  return {
    gridFrequency: gridFrequency !== null ? Number(gridFrequency) : null,
    gridTotalActivePowerW:
      gridTotalActivePowerW !== null ? Number(gridTotalActivePowerW) : null,
    gridTotalReactivePowerVar:
      gridTotalReactivePowerVar !== null ? Number(gridTotalReactivePowerVar) : null,
    gridTotalApparentPowerVa:
      gridTotalApparentPowerVa !== null ? Number(gridTotalApparentPowerVa) : null,
    gridL1Voltage: gridL1Voltage !== null ? Number(gridL1Voltage) : null,
    gridL2Voltage: gridL2Voltage !== null ? Number(gridL2Voltage) : null,
    gridL3Voltage: gridL3Voltage !== null ? Number(gridL3Voltage) : null,
    gridL1Current: gridL1Current !== null ? Number(gridL1Current) : null,
    gridL2Current: gridL2Current !== null ? Number(gridL2Current) : null,
    gridL3Current: gridL3Current !== null ? Number(gridL3Current) : null,
    gridL1ActivePowerW: gridL1ActivePowerW !== null ? Number(gridL1ActivePowerW) : null,
    gridL2ActivePowerW: gridL2ActivePowerW !== null ? Number(gridL2ActivePowerW) : null,
    gridL3ActivePowerW: gridL3ActivePowerW !== null ? Number(gridL3ActivePowerW) : null,
    gridL1ReactivePowerVar: gridL1ReactivePowerVar !== null ? Number(gridL1ReactivePowerVar) : null,
    gridL2ReactivePowerVar: gridL2ReactivePowerVar !== null ? Number(gridL2ReactivePowerVar) : null,
    gridL3ReactivePowerVar: gridL3ReactivePowerVar !== null ? Number(gridL3ReactivePowerVar) : null,
    gridL1ApparentPowerVa: gridL1ApparentPowerVa !== null ? Number(gridL1ApparentPowerVa) : null,
    gridL2ApparentPowerVa: gridL2ApparentPowerVa !== null ? Number(gridL2ApparentPowerVa) : null,
    gridL3ApparentPowerVa: gridL3ApparentPowerVa !== null ? Number(gridL3ApparentPowerVa) : null,
    gridL1Pf: gridL1Pf !== null ? Number(gridL1Pf) : null,
    gridL2Pf: gridL2Pf !== null ? Number(gridL2Pf) : null,
    gridL3Pf: gridL3Pf !== null ? Number(gridL3Pf) : null,
    gridStatus: gridStatus !== null ? String(gridStatus) : 'NA',
    controllerState: controllerState !== null ? String(controllerState) : 'NA',
    gridImportKwh: gridImportKwh !== null ? Number(gridImportKwh) : null,
    gridExportKwh: gridExportKwh !== null ? Number(gridExportKwh) : null,
    gridImportKwhT1: gridImportKwhT1 !== null ? Number(gridImportKwhT1) : null,
    gridExportKwhT1: gridExportKwhT1 !== null ? Number(gridExportKwhT1) : null,
    gridImportKwhT2: gridImportKwhT2 !== null ? Number(gridImportKwhT2) : null,
    gridPf: gridPf !== null ? Number(gridPf) : null,
    inverterStatus: inverterStatus !== null ? String(inverterStatus) : 'NA',
    inverterActualPower:
      inverterActualPower !== null ? Number(inverterActualPower) : null,
    inverterPmax: inverterPmax !== null ? Number(inverterPmax) : null,
  };
}