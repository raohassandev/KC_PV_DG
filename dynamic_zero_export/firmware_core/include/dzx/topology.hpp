#pragma once

#include "config.hpp"

namespace dzx {

struct TopologyState {
  TopologyType type{TopologyType::SingleBus};
  std::string mode{"single"};
  int controlZones{1};
  bool dualBus{false};
  bool ambiguous{false};
};

TopologyState deriveTopology(const DynamicZeroExportSiteConfig& cfg);

}  // namespace dzx

