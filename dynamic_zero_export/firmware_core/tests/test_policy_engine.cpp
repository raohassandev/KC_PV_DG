#include "dzx/policy_engine.hpp"
#include "dzx/simulator.hpp"

#include <cassert>

using namespace dzx;

static DynamicZeroExportSiteConfig singleBusConfig() {
  auto cfg = defaultConfig();
  cfg.topology.type = TopologyType::SingleBus;
  cfg.topology.busCount = 1;
  cfg.virtualMeter.mode = VirtualMeterMode::Adjusted;
  cfg.safety.staleDataMode = "reduce";
  return cfg;
}

void run_policy_engine_tests() {
  {
    auto cfg = singleBusConfig();
    cfg.policy.gridMode = GridMode::ZeroExport;
    auto eval = evaluatePolicy(cfg, {12.5, 0.0, 12.5, 0.0, false, true, "GRID", 1});
    assert(eval.decision.mode == RuntimePolicyMode::ZeroExport || eval.decision.mode == RuntimePolicyMode::PassThrough);
    assert(eval.virtualMeter.mode == "zero_export" || eval.virtualMeter.mode == "pass_through");
  }

  {
    auto cfg = singleBusConfig();
    cfg.policy.gridMode = GridMode::ExportSetpoint;
    cfg.policy.exportSetpointKw = 5.0;
    auto eval = evaluatePolicy(cfg, {10.0, 0.0, 10.0, 0.0, false, true, "GRID", 1});
    assert(eval.decision.mode == RuntimePolicyMode::LimitedExport);
    assert(eval.virtualMeter.targetKw == 5.0);
  }

  {
    auto cfg = singleBusConfig();
    cfg.policy.netMeteringEnabled = false;
    auto eval = evaluatePolicy(cfg, {10.0, 0.0, 10.0, 0.0, false, true, "GRID", 1});
    assert(eval.decision.mode == RuntimePolicyMode::ZeroExport);
    assert(eval.virtualMeter.mode == "zero_export");
  }

  {
    auto cfg = singleBusConfig();
    cfg.generators = {{"g1", "Diesel Gen", GeneratorType::Diesel, 500.0, {}, {}, {}, "main", BusSide::A}};
    auto eval = evaluatePolicy(cfg, {350.0, 0.0, 0.0, 350.0, false, true, "GENERATOR", 2});
    assert(eval.decision.mode == RuntimePolicyMode::GeneratorMinLoad || eval.decision.mode == RuntimePolicyMode::ReverseProtection);
  }

  {
    auto cfg = singleBusConfig();
    cfg.generators = {{"g1", "Gas Gen", GeneratorType::Gas, 500.0, {}, {}, {}, "main", BusSide::A}};
    auto eval = evaluatePolicy(cfg, {20.0, 0.0, 0.0, 20.0, false, true, "GENERATOR", 2});
    assert(eval.decision.mode == RuntimePolicyMode::ReverseProtection);
    assert(!eval.alarms.active.empty());
  }

  {
    auto cfg = singleBusConfig();
    cfg.topology.type = TopologyType::DualBusSeparate;
    cfg.topology.busCount = 2;
    auto eval = evaluatePolicy(cfg, {6.0, 0.0, 6.0, 0.0, false, true, "GRID", 3});
    assert(eval.topology.mode == "dual-separate");
  }

  {
    auto cfg = singleBusConfig();
    cfg.topology.type = TopologyType::DualBusCombined;
    cfg.topology.busCount = 2;
    cfg.topology.tieSignalPresent = true;
    auto eval = evaluatePolicy(cfg, {6.0, 0.0, 6.0, 0.0, false, true, "GRID", 3});
    assert(eval.topology.mode == "dual-combined");
  }

  {
    auto cfg = singleBusConfig();
    auto eval = evaluatePolicy(cfg, {1.0, 0.0, 1.0, 0.0, true, true, "GRID", 1});
    assert(eval.decision.mode == RuntimePolicyMode::SafeFallback);
    assert(eval.virtualMeter.mode == "safe_fallback");
  }

  {
    auto cfg = singleBusConfig();
    auto eval = evaluatePolicy(cfg, {1.0, 0.0, 1.0, 0.0, false, false, "UNKNOWN", 1});
    assert(eval.decision.mode == RuntimePolicyMode::SafeFallback);
    assert(eval.sourceState == "AMBIGUOUS");
  }
}
