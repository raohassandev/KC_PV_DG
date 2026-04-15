import { type DynamicZeroExportSiteConfig, type GeneratorConfig } from '../schema/site-config.types';

export type SourceState = 'GRID' | 'GENERATOR' | 'NONE' | 'AMBIGUOUS';

export type RealMeterSample = {
  kw: number;
  stale: boolean;
  sourceHint?: SourceState;
};

export function detectSource(sample: RealMeterSample): SourceState {
  if (sample.stale) return 'AMBIGUOUS';
  if (sample.sourceHint) return sample.sourceHint;
  if (sample.kw > 0) return 'GENERATOR';
  if (sample.kw < 0) return 'GRID';
  return 'NONE';
}

export function generatorMinimumLoadKw(
  config: DynamicZeroExportSiteConfig,
  generators: GeneratorConfig[],
): number {
  return generators.reduce((sum, generator) => {
    const pct =
      generator.type === 'gas'
        ? config.policy.gasMinimumLoadPct
        : config.policy.dieselMinimumLoadPct;
    return sum + (generator.ratingKw * pct) / 100;
  }, 0);
}

export function normalizeMeterKw(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 1000) / 1000;
}
