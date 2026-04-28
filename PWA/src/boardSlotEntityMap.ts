import { boardEntityMap } from './boardEntityMap';

export type BoardSourceId =
  | 'grid_1'
  | 'gen_1'
  | 'gen_2'
  | 'inv_1'
  | 'inv_2'
  | 'inv_3'
  | 'inv_4'
  | 'inv_5'
  | 'inv_6'
  | 'inv_7'
  | 'inv_8'
  | 'inv_9'
  | 'inv_10';

export type BoardSourceEntities = {
  status?: string;
  metrics: string[];
};

export function entitiesForSourceId(id: BoardSourceId): BoardSourceEntities {
  switch (id) {
    case 'grid_1':
      return {
        status: boardEntityMap.grid.status,
        metrics: [
          boardEntityMap.grid.frequency,
          boardEntityMap.grid.totalActivePower,
          boardEntityMap.grid.totalReactivePower,
          boardEntityMap.grid.totalApparentPower,
          boardEntityMap.grid.totalPowerFactor,
          boardEntityMap.grid.importEnergy,
          boardEntityMap.grid.exportEnergy,
          boardEntityMap.grid.importEnergyTariff1,
          boardEntityMap.grid.exportEnergyTariff1,
          boardEntityMap.grid.importEnergyTariff2,
          boardEntityMap.grid.exportEnergyTariff2,
          boardEntityMap.grid.l1Voltage,
          boardEntityMap.grid.l2Voltage,
          boardEntityMap.grid.l3Voltage,
          boardEntityMap.grid.l1Current,
          boardEntityMap.grid.l2Current,
          boardEntityMap.grid.l3Current,
          boardEntityMap.grid.eqvVoltage,
          boardEntityMap.grid.eqvCurrent,
          boardEntityMap.grid.l1ActivePower,
          boardEntityMap.grid.l2ActivePower,
          boardEntityMap.grid.l3ActivePower,
          boardEntityMap.grid.l1ReactivePower,
          boardEntityMap.grid.l2ReactivePower,
          boardEntityMap.grid.l3ReactivePower,
          boardEntityMap.grid.l1ApparentPower,
          boardEntityMap.grid.l2ApparentPower,
          boardEntityMap.grid.l3ApparentPower,
          boardEntityMap.grid.l1PowerFactor,
          boardEntityMap.grid.l2PowerFactor,
          boardEntityMap.grid.l3PowerFactor,
        ],
      };
    case 'gen_1':
      return {
        status: boardEntityMap.generator1.status,
        metrics: [boardEntityMap.generator1.totalActivePower],
      };
    case 'gen_2':
      return {
        status: boardEntityMap.generator2.status,
        metrics: [boardEntityMap.generator2.totalActivePower],
      };
    case 'inv_1':
      return {
        status: boardEntityMap.inverter.status,
        metrics: [boardEntityMap.inverter.actualPower, boardEntityMap.inverter.pmax],
      };
    case 'inv_2':
      return {
        status: boardEntityMap.inverter2.status,
        metrics: [boardEntityMap.inverter2.actualPower, boardEntityMap.inverter2.pmax],
      };
    case 'inv_3':
      return {
        status: boardEntityMap.inverter3.status,
        metrics: [boardEntityMap.inverter3.actualPower, boardEntityMap.inverter3.pmax],
      };
    case 'inv_4':
      return {
        status: boardEntityMap.inverter4.status,
        metrics: [boardEntityMap.inverter4.actualPower, boardEntityMap.inverter4.pmax],
      };
    case 'inv_5':
      return {
        status: boardEntityMap.inverter5.status,
        metrics: [boardEntityMap.inverter5.actualPower, boardEntityMap.inverter5.pmax],
      };
    case 'inv_6':
      return {
        status: boardEntityMap.inverter6.status,
        metrics: [boardEntityMap.inverter6.actualPower, boardEntityMap.inverter6.pmax],
      };
    case 'inv_7':
      return {
        status: boardEntityMap.inverter7.status,
        metrics: [boardEntityMap.inverter7.actualPower, boardEntityMap.inverter7.pmax],
      };
    case 'inv_8':
      return {
        status: boardEntityMap.inverter8.status,
        metrics: [boardEntityMap.inverter8.actualPower, boardEntityMap.inverter8.pmax],
      };
    case 'inv_9':
      return {
        status: boardEntityMap.inverter9.status,
        metrics: [boardEntityMap.inverter9.actualPower, boardEntityMap.inverter9.pmax],
      };
    case 'inv_10':
      return {
        status: boardEntityMap.inverter10.status,
        metrics: [boardEntityMap.inverter10.actualPower, boardEntityMap.inverter10.pmax],
      };
  }
}

