#include "dzx/controller.hpp"

#include "dzx/policy_engine.hpp"

namespace dzx {

namespace {

VirtualMeterSample toSample(const VirtualMeterState& state) {
  VirtualMeterSample sample;
  sample.kw = state.kw;
  sample.exportLimitKw = state.exportLimitKw;
  sample.targetKw = state.targetKw;
  sample.mode = state.mode;
  sample.notes = state.notes;
  return sample;
}

}  // namespace

Controller::Controller(DynamicZeroExportSiteConfig cfg)
  : config_(std::move(cfg)) {
  model_ = RuntimeSiteModel{config_};
}

const DynamicZeroExportSiteConfig& Controller::config() const { return config_; }
const RuntimeSiteModel& Controller::model() const { return model_; }
const MonitoringSnapshot& Controller::monitoring() const { return monitoring_; }

ControllerStepResult Controller::step(IMeterInput& meter, IConnectivityProvider& connectivity, IVirtualMeterOutput& output) {
  const RealMeterSample real = meter.read();
  const auto evaluation = evaluatePolicy(config_, real);
  const auto virtualSample = toSample(evaluation.virtualMeter);
  output.publish(virtualSample);
  monitoring_ = buildMonitoringSnapshot(
    config_, real, virtualSample, connectivity.snapshot(), evaluation.alarms, evaluation.controllerStatus, evaluation.topology.mode, evaluation.sourceState, "policy", 0.0);

  model_.policyMode = evaluation.decision.mode;
  model_.lastVirtualMeter = evaluation.virtualMeter;
  model_.lastDecision = evaluation.decision;

  return {evaluation.decision, evaluation.virtualMeter, evaluation.alarms, evaluation.topology, monitoring_};
}

}  // namespace dzx
