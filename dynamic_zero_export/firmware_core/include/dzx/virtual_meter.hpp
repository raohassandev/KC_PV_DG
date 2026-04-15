#pragma once

#include "config.hpp"
#include "interfaces.hpp"

namespace dzx {

struct VirtualMeterState {
  double kw{0.0};
  double exportLimitKw{0.0};
  double targetKw{0.0};
  std::string mode{"pass_through"};
  std::vector<std::string> notes;
};

VirtualMeterState computeVirtualMeterState(const DynamicZeroExportSiteConfig& cfg, const RealMeterSample& real);

}  // namespace dzx

