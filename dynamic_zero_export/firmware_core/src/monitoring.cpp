#include "dzx/monitoring.hpp"

namespace dzx {

MonitoringSnapshot buildMonitoringSnapshot(
  const DynamicZeroExportSiteConfig&,
  const RealMeterSample& real,
  const VirtualMeterSample& virtualMeter,
  const ConnectivitySnapshot& connectivity,
  const AlarmState& alarms,
  const std::string& controllerStatus,
  const std::string& topologyState,
  const std::string& sourceState,
  const std::string& policyMode,
  double generatorMarginKw) {
  MonitoringSnapshot snapshot;
  snapshot.controllerStatus = controllerStatus;
  snapshot.topologyState = topologyState;
  snapshot.sourceState = sourceState;
  snapshot.policyMode = policyMode;
  snapshot.controllerOnline = connectivity.localApiReachable;
  snapshot.realMeter = real;
  snapshot.virtualMeter = virtualMeter;
  snapshot.connectivity = connectivity;
  snapshot.alarms = alarms.active;
  snapshot.generatorMarginKw = generatorMarginKw;
  snapshot.summaryLines = {
    "status=" + controllerStatus,
    "topology=" + topologyState,
    "source=" + sourceState,
    "policy=" + policyMode,
  };
  return snapshot;
}

}  // namespace dzx

