#pragma once

#include "alarm.hpp"
#include "config.hpp"
#include "interfaces.hpp"
#include "policy_types.hpp"
#include "topology.hpp"
#include "virtual_meter.hpp"

namespace dzx {

struct PolicyEvaluation {
  PolicyDecision decision;
  VirtualMeterState virtualMeter;
  AlarmState alarms;
  TopologyState topology;
  std::string sourceState;
  std::string controllerStatus;
};

PolicyEvaluation evaluatePolicy(const DynamicZeroExportSiteConfig& cfg, const RealMeterSample& real);

}  // namespace dzx

