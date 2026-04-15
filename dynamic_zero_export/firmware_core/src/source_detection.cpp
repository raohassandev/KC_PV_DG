#include "dzx/source_detection.hpp"

namespace dzx {

ActiveSource detectSource(const RealMeterSample& sample) {
  if (sample.stale) return ActiveSource::Ambiguous;
  if (!sample.sourceKnown) return ActiveSource::Ambiguous;
  if (sample.source == "GRID") return ActiveSource::Grid;
  if (sample.source == "GENERATOR") return ActiveSource::Generator;
  if (sample.source == "NONE") return ActiveSource::None;
  return ActiveSource::Ambiguous;
}

double generatorMinimumLoadKw(const DynamicZeroExportSiteConfig& cfg, const std::vector<GeneratorConfig>& generators) {
  double total = 0.0;
  for (const auto& gen : generators) {
    const double pct = gen.type == GeneratorType::Diesel
      ? cfg.policy.dieselMinimumLoadPct
      : cfg.policy.gasMinimumLoadPct;
    total += gen.ratingKw * (pct / 100.0);
  }
  return total;
}

}  // namespace dzx

