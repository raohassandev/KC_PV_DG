#pragma once

#include "config.hpp"
#include "interfaces.hpp"
#include "topology.hpp"
#include "virtual_meter.hpp"

namespace dzx {

enum class RuntimePolicyMode {
  PassThrough,
  ZeroExport,
  LimitedExport,
  GeneratorMinLoad,
  ReverseProtection,
  SafeFallback,
};

struct PolicyDecision {
  RuntimePolicyMode mode{RuntimePolicyMode::PassThrough};
  double targetKw{0.0};
  double clampPct{0.0};
  std::vector<std::string> notes;
};

struct RuntimeSiteModel {
  DynamicZeroExportSiteConfig config{};
  RuntimePolicyMode policyMode{RuntimePolicyMode::PassThrough};
  PolicyDecision lastDecision{};
  VirtualMeterState lastVirtualMeter{};
};

struct ControllerStepResult {
  PolicyDecision decision;
  VirtualMeterState virtualMeter;
  AlarmState alarms;
  TopologyState topology;
  MonitoringSnapshot monitoring;
};

}  // namespace dzx
