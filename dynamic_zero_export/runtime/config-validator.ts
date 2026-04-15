import { type DynamicZeroExportSiteConfig } from '../schema/site-config.types';
import { type ValidationResult } from './site-config';
import { getBrandProfile } from '../adapters/registry';

function invalidRange(name: string, min: number, max: number, value: number, errors: string[]) {
  if (value < min || value > max) errors.push(`${name} must be between ${min} and ${max}`);
}

export function validateNormalizedConfig(config: DynamicZeroExportSiteConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const topologyType = typeof config.topology.type === 'string' ? config.topology.type : '';
  const meterTransport = typeof config.meterInput.transport === 'string' ? config.meterInput.transport : '';
  const virtualMeterMode = typeof config.virtualMeter.mode === 'string' ? config.virtualMeter.mode : '';
  const gridMode = typeof config.policy.gridMode === 'string' ? config.policy.gridMode : '';
  const fallbackMode = typeof config.policy.fallbackMode === 'string' ? config.policy.fallbackMode : '';
  const topologyTypes = [
    'SINGLE_BUS',
    'SINGLE_BUS_MULTI_GEN',
    'DUAL_BUS',
    'DUAL_BUS_SEPARATE',
    'DUAL_BUS_COMBINED',
  ] as const;
  const transports = ['rtu', 'tcp'] as const;
  const gridModes = ['full_production', 'export_setpoint', 'zero_export'] as const;
  const fallbackModes = ['hold_last_safe', 'reduce_to_safe_min', 'manual_bypass'] as const;
  const virtualMeterModes = ['pass_through', 'adjusted', 'safe_fallback'] as const;

  if (!config.site.name.trim()) errors.push('site.name is required');
  if (!config.site.controllerId.trim()) errors.push('site.controllerId is required');

  if (!topologyTypes.includes(topologyType as never)) {
    errors.push(`topology.type "${config.topology.type}" is not supported`);
  }
  if (config.topology.busCount !== 1 && config.topology.busCount !== 2) {
    errors.push('topology.busCount must be 1 or 2');
  }
  if (topologyType.startsWith('SINGLE_BUS') && config.topology.busCount !== 1) {
    errors.push(`${config.topology.type} topology requires busCount = 1`);
  }
  if (topologyType === 'DUAL_BUS' && config.topology.busCount !== 2) {
    errors.push('DUAL_BUS topology requires busCount = 2');
  }
  if (topologyType.startsWith('DUAL_BUS') && !config.topology.tieSignalPresent) {
    errors.push('dual-bus topology requires a tie/breaker signal');
  }

  if (!transports.includes(meterTransport as never)) {
    errors.push(`meterInput.transport "${config.meterInput.transport}" is not supported`);
  }
  if (meterTransport === 'rtu') {
    const addr = config.meterInput.addressing;
    if (!('slaveId' in addr)) errors.push('RTU meterInput.addressing.slaveId is required');
    if ('ip' in addr) errors.push('RTU addressing cannot include ip');
    if ('slaveId' in addr && typeof addr.slaveId === 'number' && addr.slaveId <= 0) {
      errors.push('RTU meterInput.addressing.slaveId must be greater than 0');
    }
  }
  if (meterTransport === 'tcp') {
    const addr = config.meterInput.addressing;
    if (!('ip' in addr) || !addr.ip) errors.push('TCP meterInput.addressing.ip is required');
    if ('slaveId' in addr && addr.slaveId == null) warnings.push('TCP addressing may use a slaveId proxy');
    if ('port' in addr && typeof addr.port === 'number' && addr.port <= 0) {
      errors.push('TCP meterInput.addressing.port must be greater than 0');
    }
  }
  if (!config.meterInput.profileId.trim()) errors.push('meterInput.profileId is required');

  if (!virtualMeterModes.includes(virtualMeterMode as never)) {
    errors.push(`virtualMeter.mode "${config.virtualMeter.mode}" is not supported`);
  }
  if (!config.virtualMeter.profileId.trim()) errors.push('virtualMeter.profileId is required');
  if (!config.virtualMeter.brand.trim()) errors.push('virtualMeter.brand is required');
  if (typeof config.virtualMeter.slaveId !== 'number' || config.virtualMeter.slaveId <= 0) {
    errors.push('virtualMeter.slaveId must be greater than 0');
  }
  if (!getBrandProfile(config.virtualMeter.profileId)) {
    errors.push(`virtualMeter.profileId "${config.virtualMeter.profileId}" is not registered`);
  }
  if (!gridModes.includes(gridMode as never)) {
    errors.push(`policy.gridMode "${config.policy.gridMode}" is not supported`);
  }
  if (!fallbackModes.includes(fallbackMode as never)) {
    errors.push(`policy.fallbackMode "${config.policy.fallbackMode}" is not supported`);
  }

  if (config.generators.length === 0) warnings.push('No generators configured');
  config.generators.forEach((generator, index) => {
    if (!generator.id.trim()) errors.push(`generators[${index}].id is required`);
    if (!generator.label.trim()) errors.push(`generators[${index}].label is required`);
    if (generator.ratingKw <= 0) errors.push(`generators[${index}].ratingKw must be greater than 0`);
    if (generator.type !== 'diesel' && generator.type !== 'gas') {
      errors.push(`generators[${index}].type must be diesel or gas`);
    }
    if (!generator.networkId?.trim()) {
      if (topologyType.startsWith('DUAL_BUS')) {
        errors.push(`generators[${index}].networkId is required for dual-bus sites`);
      } else {
        warnings.push(`generators[${index}].networkId is missing`);
      }
    }
  });

  if (config.inverterGroups.length === 0) warnings.push('No inverter groups configured');
  config.inverterGroups.forEach((group, index) => {
    if (!group.id.trim()) errors.push(`inverterGroups[${index}].id is required`);
    if (!group.emulationProfileId.trim()) {
      errors.push(`inverterGroups[${index}].emulationProfileId is required`);
    }
    if (!getBrandProfile(group.emulationProfileId)) {
      errors.push(`inverterGroups[${index}].emulationProfileId "${group.emulationProfileId}" is not registered`);
    }
    if (!group.brand.trim()) errors.push(`inverterGroups[${index}].brand is required`);
    if (group.slaveId <= 0) errors.push(`inverterGroups[${index}].slaveId must be greater than 0`);
    if (!group.networkId?.trim()) {
      if (topologyType.startsWith('DUAL_BUS')) {
        errors.push(`inverterGroups[${index}].networkId is required for dual-bus sites`);
      } else {
        warnings.push(`inverterGroups[${index}].networkId is missing`);
      }
    }
  });

  invalidRange('policy.dieselMinimumLoadPct', 0, 100, config.policy.dieselMinimumLoadPct, errors);
  invalidRange('policy.gasMinimumLoadPct', 0, 100, config.policy.gasMinimumLoadPct, errors);
  invalidRange('policy.zeroExportDeadbandKw', 0, 100000, config.policy.zeroExportDeadbandKw, errors);
  invalidRange('policy.reverseMarginKw', 0, 100000, config.policy.reverseMarginKw, errors);
  invalidRange('policy.fastDropPct', 0, 100, config.policy.fastDropPct, errors);
  invalidRange('policy.rampUpPct', 0, 100, config.policy.rampUpPct, errors);
  invalidRange('policy.rampDownPct', 0, 100, config.policy.rampDownPct, errors);

  if (config.policy.gridMode === 'export_setpoint' && config.policy.exportSetpointKw < 0) {
    errors.push('policy.exportSetpointKw cannot be negative');
  }

  if (config.safety.meterTimeoutSec <= 0) errors.push('safety.meterTimeoutSec must be greater than 0');

  return { ok: errors.length === 0, errors, warnings };
}
