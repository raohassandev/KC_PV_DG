#pragma once

#include <string>
#include <vector>

namespace dzx {

enum class TopologyType {
  SingleBus,
  SingleBusMultiGen,
  DualBus,
  DualBusSeparate,
  DualBusCombined,
};

enum class MeterTransport {
  Rtu,
  Tcp,
};

enum class VirtualMeterMode {
  PassThrough,
  Adjusted,
  SafeFallback,
};

enum class GridMode {
  FullProduction,
  ExportSetpoint,
  ZeroExport,
};

enum class FallbackMode {
  HoldLastSafe,
  ReduceToSafeMin,
  ManualBypass,
};

enum class GeneratorType {
  Diesel,
  Gas,
};

enum class BusSide {
  A,
  B,
  Both,
};

struct SiteBasics {
  std::string name{"New Site"};
  std::string controllerId{"dzx-001"};
  std::string timezone{"Asia/Karachi"};
  std::string customerName{};
  std::string notes{};
};

struct TopologyConfig {
  TopologyType type{TopologyType::SingleBus};
  int busCount{1};
  bool tieSignalPresent{false};
};

struct MeterAddressing {
  int slaveId{1};
  int baud{9600};
  char parity{'N'};
  int port{0};
  std::string ip{};
};

struct MeterInputConfig {
  MeterTransport transport{MeterTransport::Rtu};
  std::string brand{"generic-modbus"};
  std::string profileId{"default-grid-meter"};
  MeterAddressing addressing{};
  int pollIntervalMs{1000};
  int timeoutMs{2000};
};

struct VirtualMeterConfig {
  std::string brand{"generic-modbus"};
  std::string profileId{"default-virtual-meter"};
  VirtualMeterMode mode{VirtualMeterMode::Adjusted};
  int slaveId{1};
};

struct GeneratorConfig {
  std::string id;
  std::string label;
  GeneratorType type{GeneratorType::Diesel};
  double ratingKw{0.0};
  std::string runningSignal{};
  std::string breakerSignal{};
  std::string powerSignal{};
  std::string networkId{"main"};
  BusSide busSide{BusSide::A};
};

struct InverterGroupConfig {
  std::string id;
  std::string label;
  std::string brand;
  std::string emulationProfileId;
  std::string networkId{"main"};
  BusSide busSide{BusSide::A};
  int slaveId{1};
  std::string serialPort{};
};

struct PolicyConfig {
  bool netMeteringEnabled{true};
  GridMode gridMode{GridMode::ZeroExport};
  double exportSetpointKw{0.0};
  double zeroExportDeadbandKw{1.0};
  double dieselMinimumLoadPct{30.0};
  double gasMinimumLoadPct{50.0};
  double reverseMarginKw{2.0};
  double rampUpPct{3.0};
  double rampDownPct{10.0};
  double fastDropPct{25.0};
  FallbackMode fallbackMode{FallbackMode::ReduceToSafeMin};
};

struct SafetyConfig {
  int meterTimeoutSec{10};
  std::string staleDataMode{"reduce"};
  bool manualOverrideEnabled{false};
};

struct MonitoringConfig {
  bool enableWebUi{true};
  bool enableEventLog{true};
  bool publishDiagnostics{true};
};

struct DynamicZeroExportSiteConfig {
  SiteBasics site{};
  TopologyConfig topology{};
  MeterInputConfig meterInput{};
  VirtualMeterConfig virtualMeter{};
  PolicyConfig policy{};
  SafetyConfig safety{};
  MonitoringConfig monitoring{};
  std::vector<GeneratorConfig> generators{};
  std::vector<InverterGroupConfig> inverterGroups{};
};

DynamicZeroExportSiteConfig defaultConfig();

struct ConfigDiagnostics {
  std::vector<std::string> warnings;
  std::vector<std::string> errors;
};

ConfigDiagnostics validateConfig(const DynamicZeroExportSiteConfig& cfg);

}  // namespace dzx

