#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace dzx {

struct RealMeterSample {
  double kw{0.0};
  double importKw{0.0};
  double exportKw{0.0};
  double generatorKw{0.0};
  bool stale{false};
  bool sourceKnown{true};
  std::string source{"GRID"};
  std::uint64_t sampleTimeMs{0};
};

struct VirtualMeterSample {
  double kw{0.0};
  double exportLimitKw{0.0};
  double targetKw{0.0};
  std::string mode{"pass_through"};
  std::vector<std::string> notes;
};

struct ConnectivitySnapshot {
  bool wifiConnected{false};
  bool lanConnected{false};
  bool localApiReachable{false};
  bool upstreamMeterReachable{false};
  bool downstreamInverterReachable{false};
  std::string wifiSsid{};
  std::string wifiIp{};
  int wifiSignalDbm{0};
  std::string controllerId{};
  std::string firmwareVersion{};
  std::string buildId{};
  std::uint64_t uptimeSec{0};
};

struct AlarmRecord {
  std::string code;
  std::string severity;
  std::string message;
  std::uint64_t timestampMs{0};
};

struct MonitoringSnapshot {
  std::string controllerStatus;
  std::string topologyState;
  std::string sourceState;
  std::string policyMode;
  bool controllerOnline{false};
  RealMeterSample realMeter{};
  VirtualMeterSample virtualMeter{};
  ConnectivitySnapshot connectivity{};
  std::vector<AlarmRecord> alarms;
  double generatorMarginKw{0.0};
  std::vector<std::string> summaryLines;
};

class IMeterInput {
 public:
  virtual ~IMeterInput() = default;
  virtual RealMeterSample read() = 0;
};

class IVirtualMeterOutput {
 public:
  virtual ~IVirtualMeterOutput() = default;
  virtual void publish(const VirtualMeterSample& sample) = 0;
};

class IConnectivityProvider {
 public:
  virtual ~IConnectivityProvider() = default;
  virtual ConnectivitySnapshot snapshot() = 0;
};

class IStorage {
 public:
  virtual ~IStorage() = default;
  virtual void saveText(const std::string& key, const std::string& text) = 0;
  virtual std::string loadText(const std::string& key) = 0;
};

class IClock {
 public:
  virtual ~IClock() = default;
  virtual std::uint64_t nowMs() const = 0;
};

class ILogger {
 public:
  virtual ~ILogger() = default;
  virtual void log(const std::string& level, const std::string& message) = 0;
};

}  // namespace dzx

