#include "dzx/policy_engine.hpp"

#include "dzx/source_detection.hpp"

#include <algorithm>

namespace dzx {

PolicyEvaluation evaluatePolicy(const DynamicZeroExportSiteConfig& cfg, const RealMeterSample& real) {
  PolicyEvaluation evaluation;
  evaluation.topology = deriveTopology(cfg);
  evaluation.virtualMeter = computeVirtualMeterState(cfg, real);

  const auto source = detectSource(real);
  evaluation.sourceState = "GRID";
  evaluation.controllerStatus = "HEALTHY";

  if (real.stale) {
    raiseAlarm(evaluation.alarms, {"STALE_DATA", "warning", "Upstream meter data is stale", real.sampleTimeMs});
    evaluation.controllerStatus = "DEGRADED";
  }

  switch (source) {
    case ActiveSource::Grid: evaluation.sourceState = "GRID"; break;
    case ActiveSource::Generator: evaluation.sourceState = "GENERATOR"; break;
    case ActiveSource::None: evaluation.sourceState = "NONE"; evaluation.controllerStatus = "FALLBACK"; break;
    case ActiveSource::Ambiguous: evaluation.sourceState = "AMBIGUOUS"; evaluation.controllerStatus = "FAULTED"; break;
  }

  if (evaluation.topology.ambiguous) {
    raiseAlarm(evaluation.alarms, {"DUAL_BUS_AMBIGUOUS", "critical", "Dual-bus mapping is ambiguous", real.sampleTimeMs});
    evaluation.controllerStatus = "FAULTED";
  }

  if (real.stale || source == ActiveSource::None || source == ActiveSource::Ambiguous) {
    if (cfg.safety.staleDataMode == "reduce") {
      evaluation.controllerStatus = "FALLBACK";
    } else if (cfg.safety.staleDataMode == "alarm") {
      evaluation.controllerStatus = "FAULTED";
    }
  }

  const auto sourceKnown = source != ActiveSource::Ambiguous && source != ActiveSource::None;
  const auto generatorMinLoadKw = dzx::generatorMinimumLoadKw(cfg, cfg.generators);

  if (source == ActiveSource::Grid) {
    if (cfg.virtualMeter.mode == VirtualMeterMode::PassThrough) {
      evaluation.decision = {RuntimePolicyMode::PassThrough, real.kw, 0.0, {"pass-through meter mode"}};
    } else if (!cfg.policy.netMeteringEnabled || cfg.policy.gridMode == GridMode::ZeroExport) {
      const auto target = real.kw > cfg.policy.zeroExportDeadbandKw ? real.kw - cfg.policy.zeroExportDeadbandKw : 0.0;
      evaluation.decision = {RuntimePolicyMode::ZeroExport, target, 0.0, {"zero export"}};
      evaluation.virtualMeter.mode = "zero_export";
      evaluation.virtualMeter.targetKw = target;
      evaluation.virtualMeter.kw = target;
      evaluation.virtualMeter.notes.push_back("zero export");
    } else if (cfg.policy.gridMode == GridMode::ExportSetpoint) {
      evaluation.decision = {RuntimePolicyMode::LimitedExport, cfg.policy.exportSetpointKw, 0.0, {"export setpoint"}};
      evaluation.virtualMeter.mode = "limited_export";
      evaluation.virtualMeter.targetKw = cfg.policy.exportSetpointKw;
      evaluation.virtualMeter.kw = cfg.policy.exportSetpointKw;
      evaluation.virtualMeter.notes.push_back("export setpoint");
    } else {
      evaluation.decision = {RuntimePolicyMode::PassThrough, real.kw, 0.0, {"full production"}};
    }
  } else if (source == ActiveSource::Generator) {
    const auto remaining = real.kw - generatorMinLoadKw;
    const auto target = remaining > 0.0 ? remaining : 0.0;
    const bool reverseRisk = real.kw < generatorMinLoadKw + cfg.policy.reverseMarginKw;
    evaluation.decision = {reverseRisk ? RuntimePolicyMode::ReverseProtection : RuntimePolicyMode::GeneratorMinLoad,
                           target,
                           0.0,
                           {reverseRisk ? "reverse protection assist" : "minimum generator load"}};
    evaluation.virtualMeter.mode = reverseRisk ? "reverse_protection" : "generator_min_load";
    evaluation.virtualMeter.targetKw = target;
    evaluation.virtualMeter.kw = target;
    evaluation.virtualMeter.notes.push_back("generator min-load");
    evaluation.virtualMeter.notes.push_back("generator minimum load " + std::to_string(generatorMinLoadKw));
    if (reverseRisk) {
      raiseAlarm(evaluation.alarms, {"GENERATOR_LOW_LOAD", "warning", "Generator load is near the reverse-protection margin", real.sampleTimeMs});
    }
  } else {
    evaluation.decision = {RuntimePolicyMode::SafeFallback, 0.0, 0.0, {"ambiguous or no source"}};
    evaluation.virtualMeter.mode = "safe_fallback";
    evaluation.virtualMeter.kw = 0.0;
    evaluation.virtualMeter.targetKw = 0.0;
    evaluation.virtualMeter.notes.push_back(sourceKnown ? "source fallback" : "ambiguous source");
    raiseAlarm(evaluation.alarms, {"AMBIGUOUS_SOURCE", "critical", "Unable to determine active source", real.sampleTimeMs});
  }

  if (evaluation.topology.mode == "dual-combined") {
    evaluation.decision.notes.push_back("dual-bus combined zone");
  } else if (evaluation.topology.mode == "dual-separate") {
    evaluation.decision.notes.push_back("dual-bus separate zones");
  }

  if (cfg.generators.size() > 1) {
    const auto invalid = std::count_if(cfg.generators.begin(), cfg.generators.end(), [](const GeneratorConfig& gen) {
      return gen.ratingKw <= 0;
    });
    if (invalid > 0) {
      raiseAlarm(evaluation.alarms, {"GENERATOR_RATING_INVALID", "warning", "One or more generators have invalid ratings", real.sampleTimeMs});
    }
  }

  return evaluation;
}

}  // namespace dzx
