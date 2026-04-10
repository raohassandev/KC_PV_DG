export const boardEntityMap = {
  grid: {
    status: '/text_sensor/Grid%20Meter%20Status',
    frequency: '/sensor/Grid%20Frequency',
    totalActivePower: '/sensor/Grid%20Total%20Active%20Power',
    totalPowerFactor: '/sensor/Grid%20Total%20Power%20Factor',
    importEnergy: '/sensor/Grid%20Import%20Energy',
    l1Voltage: '/sensor/Grid%20L1%20Voltage',
    l2Voltage: '/sensor/Grid%20L2%20Voltage',
    l3Voltage: '/sensor/Grid%20L3%20Voltage',
    l1Current: '/sensor/Grid%20L1%20Current',
    l2Current: '/sensor/Grid%20L2%20Current',
    l3Current: '/sensor/Grid%20L3%20Current',
  },
  controller: {
    state: '/text_sensor/Controller%20State',
  },
  inverter: {
    status: '/text_sensor/Inverter%20Status',
    actualPower: '/sensor/Inverter%20Actual%20Power',
    pmax: '/sensor/Inverter%20Pmax',
  },
} as const;
