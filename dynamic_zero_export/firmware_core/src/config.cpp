#include "dzx/config.hpp"
#include "dzx/topology.hpp"

#include <sstream>

namespace dzx {

DynamicZeroExportSiteConfig defaultConfig() {
  return DynamicZeroExportSiteConfig{};
}

ConfigDiagnostics validateConfig(const DynamicZeroExportSiteConfig& cfg) {
  ConfigDiagnostics d;
  if (cfg.site.name.empty()) d.errors.push_back("site.name is required");
  if (cfg.site.controllerId.empty()) d.errors.push_back("site.controllerId is required");
  if (cfg.topology.busCount != 1 && cfg.topology.busCount != 2) d.errors.push_back("topology.busCount must be 1 or 2");
  if (cfg.meterInput.pollIntervalMs <= 0) d.errors.push_back("meterInput.pollIntervalMs must be positive");
  if (cfg.meterInput.timeoutMs <= 0) d.errors.push_back("meterInput.timeoutMs must be positive");
  if (cfg.virtualMeter.slaveId <= 0) d.errors.push_back("virtualMeter.slaveId must be positive");
  if (cfg.policy.dieselMinimumLoadPct < 0 || cfg.policy.dieselMinimumLoadPct > 100) d.errors.push_back("dieselMinimumLoadPct must be 0..100");
  if (cfg.policy.gasMinimumLoadPct < 0 || cfg.policy.gasMinimumLoadPct > 100) d.errors.push_back("gasMinimumLoadPct must be 0..100");
  if (cfg.policy.zeroExportDeadbandKw < 0) d.errors.push_back("zeroExportDeadbandKw must be >= 0");
  if (cfg.topology.type == TopologyType::DualBusCombined && !cfg.topology.tieSignalPresent) {
    d.errors.push_back("dual-bus combined requires tieSignalPresent");
  }
  if (cfg.topology.type == TopologyType::DualBusSeparate && cfg.topology.tieSignalPresent) {
    d.warnings.push_back("dual-bus separate with tie signal declared; ensure tie is open during separate operation");
  }
  if (cfg.generators.empty()) {
    d.warnings.push_back("no generators declared");
  }
  for (const auto& gen : cfg.generators) {
    if (gen.id.empty()) d.errors.push_back("generator id is required");
    if (gen.ratingKw <= 0) d.errors.push_back("generator ratingKw must be positive");
  }
  if (cfg.inverterGroups.empty()) {
    d.warnings.push_back("no inverter groups declared");
  }
  for (const auto& inv : cfg.inverterGroups) {
    if (inv.id.empty()) d.errors.push_back("inverter group id is required");
    if (inv.emulationProfileId.empty()) d.errors.push_back("inverter emulation profile is required");
    if (inv.slaveId <= 0) d.errors.push_back("inverter slaveId must be positive");
  }
  return d;
}

}  // namespace dzx

