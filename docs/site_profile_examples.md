# Site Profile Examples

## 1. Single bus, one grid, one generator

```json
{
  "topologyType": "SINGLE_BUS",
  "netMeteringEnabled": true,
  "gridOperatingMode": "export_setpoint",
  "exportSetpointKw": 0,
  "tieSignalPresent": false,
  "slots": [
    { "id": "grid_1", "role": "grid_meter", "deviceType": "em500", "enabled": true },
    { "id": "gen_1", "role": "generator_meter", "deviceType": "none", "enabled": true },
    { "id": "inv_1", "role": "inverter", "deviceType": "huawei", "enabled": true }
  ]
}
```

## 2. Single bus, one grid, two generators

```json
{
  "topologyType": "SINGLE_BUS_MULTI_GEN",
  "netMeteringEnabled": false,
  "gridOperatingMode": "zero_export",
  "reverseMarginKw": 2,
  "slots": [
    { "id": "grid_1", "role": "grid_meter", "deviceType": "em500", "enabled": true },
    { "id": "gen_1", "role": "generator_meter", "deviceType": "em500_generator", "enabled": true },
    { "id": "gen_2", "role": "generator_meter", "deviceType": "em500_generator", "enabled": true },
    { "id": "inv_1", "role": "inverter", "deviceType": "generic_modbus", "enabled": true }
  ]
}
```

## 3. Single bus, one grid, three generators

```json
{
  "topologyType": "SINGLE_BUS_MULTI_GEN",
  "netMeteringEnabled": false,
  "gridOperatingMode": "zero_export",
  "fastDropPct": 25,
  "slots": [
    { "id": "grid_1", "role": "grid_meter", "deviceType": "em500", "enabled": true },
    { "id": "gen_1", "role": "generator_meter", "deviceType": "em500_generator", "enabled": true },
    { "id": "gen_2", "role": "generator_meter", "deviceType": "em500_generator", "enabled": true },
    { "id": "gen_3", "role": "generator_meter", "deviceType": "em500_generator", "enabled": true },
    { "id": "inv_1", "role": "inverter", "deviceType": "huawei_smartlogger", "enabled": true }
  ]
}
```

## 4. Dual network, separate or combined

```json
{
  "topologyType": "DUAL_BUS",
  "tieSignalPresent": true,
  "netMeteringEnabled": true,
  "gridOperatingMode": "full_production",
  "slots": [
    { "id": "grid_a", "role": "grid_meter", "deviceType": "em500", "enabled": true },
    { "id": "grid_b", "role": "grid_meter", "deviceType": "em500_v2", "enabled": true },
    { "id": "inv_a", "role": "inverter", "deviceType": "huawei", "enabled": true },
    { "id": "inv_b", "role": "inverter", "deviceType": "generic_modbus", "enabled": true }
  ]
}
```

