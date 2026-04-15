#include "dzx/serialization.hpp"

#include <sstream>

namespace dzx {

ConfigDocument parseKeyValueDocument(const std::string& text) {
  ConfigDocument doc;
  std::istringstream stream(text);
  std::string line;
  while (std::getline(stream, line)) {
    if (line.empty() || line[0] == '#') continue;
    const auto pos = line.find('=');
    if (pos == std::string::npos) continue;
    doc[line.substr(0, pos)] = line.substr(pos + 1);
  }
  return doc;
}

DynamicZeroExportSiteConfig loadConfigFromDocument(const ConfigDocument& doc) {
  DynamicZeroExportSiteConfig cfg = defaultConfig();
  if (auto it = doc.find("site.name"); it != doc.end()) cfg.site.name = it->second;
  if (auto it = doc.find("site.controllerId"); it != doc.end()) cfg.site.controllerId = it->second;
  if (auto it = doc.find("topology.type"); it != doc.end()) {
    if (it->second == "SINGLE_BUS") cfg.topology.type = TopologyType::SingleBus;
    else if (it->second == "SINGLE_BUS_MULTI_GEN") cfg.topology.type = TopologyType::SingleBusMultiGen;
    else if (it->second == "DUAL_BUS") cfg.topology.type = TopologyType::DualBus;
    else if (it->second == "DUAL_BUS_SEPARATE") cfg.topology.type = TopologyType::DualBusSeparate;
    else if (it->second == "DUAL_BUS_COMBINED") cfg.topology.type = TopologyType::DualBusCombined;
  }
  if (auto it = doc.find("topology.busCount"); it != doc.end()) cfg.topology.busCount = std::stoi(it->second);
  if (auto it = doc.find("topology.tieSignalPresent"); it != doc.end()) cfg.topology.tieSignalPresent = (it->second == "true");
  if (auto it = doc.find("meterInput.transport"); it != doc.end()) cfg.meterInput.transport = (it->second == "tcp" ? MeterTransport::Tcp : MeterTransport::Rtu);
  if (auto it = doc.find("meterInput.brand"); it != doc.end()) cfg.meterInput.brand = it->second;
  if (auto it = doc.find("meterInput.profileId"); it != doc.end()) cfg.meterInput.profileId = it->second;
  if (auto it = doc.find("virtualMeter.brand"); it != doc.end()) cfg.virtualMeter.brand = it->second;
  if (auto it = doc.find("virtualMeter.profileId"); it != doc.end()) cfg.virtualMeter.profileId = it->second;
  if (auto it = doc.find("virtualMeter.mode"); it != doc.end()) {
    if (it->second == "pass_through") cfg.virtualMeter.mode = VirtualMeterMode::PassThrough;
    else if (it->second == "safe_fallback") cfg.virtualMeter.mode = VirtualMeterMode::SafeFallback;
    else cfg.virtualMeter.mode = VirtualMeterMode::Adjusted;
  }
  if (auto it = doc.find("policy.gridMode"); it != doc.end()) {
    if (it->second == "full_production") cfg.policy.gridMode = GridMode::FullProduction;
    else if (it->second == "export_setpoint") cfg.policy.gridMode = GridMode::ExportSetpoint;
    else cfg.policy.gridMode = GridMode::ZeroExport;
  }
  if (auto it = doc.find("policy.netMeteringEnabled"); it != doc.end()) cfg.policy.netMeteringEnabled = (it->second == "true");
  if (auto it = doc.find("policy.exportSetpointKw"); it != doc.end()) cfg.policy.exportSetpointKw = std::stod(it->second);
  if (auto it = doc.find("policy.zeroExportDeadbandKw"); it != doc.end()) cfg.policy.zeroExportDeadbandKw = std::stod(it->second);
  if (auto it = doc.find("policy.dieselMinimumLoadPct"); it != doc.end()) cfg.policy.dieselMinimumLoadPct = std::stod(it->second);
  if (auto it = doc.find("policy.gasMinimumLoadPct"); it != doc.end()) cfg.policy.gasMinimumLoadPct = std::stod(it->second);
  if (auto it = doc.find("policy.reverseMarginKw"); it != doc.end()) cfg.policy.reverseMarginKw = std::stod(it->second);
  if (auto it = doc.find("policy.rampUpPct"); it != doc.end()) cfg.policy.rampUpPct = std::stod(it->second);
  if (auto it = doc.find("policy.rampDownPct"); it != doc.end()) cfg.policy.rampDownPct = std::stod(it->second);
  if (auto it = doc.find("policy.fastDropPct"); it != doc.end()) cfg.policy.fastDropPct = std::stod(it->second);
  if (auto it = doc.find("policy.fallbackMode"); it != doc.end()) {
    if (it->second == "hold_last_safe") cfg.policy.fallbackMode = FallbackMode::HoldLastSafe;
    else if (it->second == "manual_bypass") cfg.policy.fallbackMode = FallbackMode::ManualBypass;
    else cfg.policy.fallbackMode = FallbackMode::ReduceToSafeMin;
  }
  return cfg;
}

std::string dumpConfigShape(const DynamicZeroExportSiteConfig& cfg) {
  std::ostringstream out;
  out << "site.name=" << cfg.site.name << '\n';
  out << "site.controllerId=" << cfg.site.controllerId << '\n';
  out << "topology.type=" << static_cast<int>(cfg.topology.type) << '\n';
  out << "meterInput.transport=" << (cfg.meterInput.transport == MeterTransport::Tcp ? "tcp" : "rtu") << '\n';
  out << "virtualMeter.mode=" << static_cast<int>(cfg.virtualMeter.mode) << '\n';
  out << "policy.gridMode=" << static_cast<int>(cfg.policy.gridMode) << '\n';
  return out.str();
}

}  // namespace dzx

