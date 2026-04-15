#include "dzx/topology.hpp"

namespace dzx {

TopologyState deriveTopology(const DynamicZeroExportSiteConfig& cfg) {
  TopologyState state;
  state.type = cfg.topology.type;
  state.dualBus = cfg.topology.busCount == 2;
  state.ambiguous = false;

  if (cfg.topology.type == TopologyType::DualBusCombined) {
    state.mode = "dual-combined";
    state.controlZones = 1;
  } else if (cfg.topology.type == TopologyType::DualBusSeparate) {
    state.mode = "dual-separate";
    state.controlZones = 2;
  } else if (cfg.topology.type == TopologyType::SingleBusMultiGen) {
    state.mode = "single-multi-gen";
    state.controlZones = 1;
  } else if (cfg.topology.type == TopologyType::DualBus && cfg.topology.tieSignalPresent) {
    state.mode = "ambiguous";
    state.controlZones = 2;
    state.ambiguous = true;
  } else if (cfg.topology.type == TopologyType::DualBus) {
    state.mode = "dual";
    state.controlZones = 2;
  } else {
    state.mode = "single";
    state.controlZones = 1;
  }
  return state;
}

}  // namespace dzx

