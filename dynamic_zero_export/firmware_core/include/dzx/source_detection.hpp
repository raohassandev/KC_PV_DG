#pragma once

#include "config.hpp"
#include "interfaces.hpp"

namespace dzx {

enum class ActiveSource {
  Grid,
  Generator,
  None,
  Ambiguous,
};

ActiveSource detectSource(const RealMeterSample& sample);
double generatorMinimumLoadKw(const DynamicZeroExportSiteConfig& cfg, const std::vector<GeneratorConfig>& generators);

}  // namespace dzx

