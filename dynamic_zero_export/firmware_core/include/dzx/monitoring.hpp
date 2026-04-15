#pragma once

#include "alarm.hpp"
#include "config.hpp"
#include "interfaces.hpp"

namespace dzx {

MonitoringSnapshot buildMonitoringSnapshot(
  const DynamicZeroExportSiteConfig& cfg,
  const RealMeterSample& real,
  const VirtualMeterSample& virtualMeter,
  const ConnectivitySnapshot& connectivity,
  const AlarmState& alarms,
  const std::string& controllerStatus,
  const std::string& topologyState,
  const std::string& sourceState,
  const std::string& policyMode,
  double generatorMarginKw);

}  // namespace dzx
