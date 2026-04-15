#include "dzx/virtual_meter.hpp"
#include "dzx/source_detection.hpp"

namespace dzx {

VirtualMeterState computeVirtualMeterState(const DynamicZeroExportSiteConfig& cfg, const RealMeterSample& real) {
  VirtualMeterState vm;
  vm.kw = real.kw;
  vm.targetKw = real.kw;
  vm.exportLimitKw = cfg.policy.exportSetpointKw;
  vm.mode = "pass_through";

  const auto source = detectSource(real);
  if (real.stale) {
    vm.mode = "safe_fallback";
    vm.kw = 0.0;
    vm.targetKw = 0.0;
    vm.notes.push_back("stale data fallback");
    return vm;
  }

  if (cfg.virtualMeter.mode == VirtualMeterMode::PassThrough) {
    vm.mode = "pass_through";
    vm.notes.push_back("pass-through meter mode");
    return vm;
  }

  if (source == ActiveSource::Grid) {
    if (!cfg.policy.netMeteringEnabled || cfg.policy.gridMode == GridMode::ZeroExport) {
      vm.mode = "zero_export";
      vm.targetKw = real.kw > cfg.policy.zeroExportDeadbandKw ? real.kw - cfg.policy.zeroExportDeadbandKw : 0.0;
      vm.kw = vm.targetKw;
      vm.notes.push_back("zero export");
    } else if (cfg.policy.gridMode == GridMode::ExportSetpoint) {
      vm.mode = "limited_export";
      vm.targetKw = cfg.policy.exportSetpointKw;
      vm.kw = cfg.policy.exportSetpointKw;
      vm.notes.push_back("export setpoint");
    } else {
      vm.mode = "pass_through";
      vm.notes.push_back("full production");
    }
  } else if (source == ActiveSource::Generator) {
    vm.mode = "generator_min_load";
    vm.notes.push_back("generator min-load support");
    vm.targetKw = real.kw;
  } else {
    vm.mode = "safe_fallback";
    vm.kw = 0.0;
    vm.targetKw = 0.0;
    vm.notes.push_back("ambiguous source");
  }

  return vm;
}

}  // namespace dzx

