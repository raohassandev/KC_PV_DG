#pragma once

#include "config.hpp"
#include "interfaces.hpp"
#include "monitoring.hpp"

#include <vector>
#include <string>

namespace dzx {

struct ApiDeviceInfo {
  std::string deviceId;
  std::string deviceName;
  std::string controllerId;
  std::string firmwareVersion;
  std::string buildId;
  std::uint64_t uptimeSec{0};
  std::string localTimeIso;
};

struct ApiLiveStatus {
  std::string role;
  std::string siteName;
  std::string controllerState;
  bool systemOnline{false};
  double powerKw{0.0};
  double solarKw{0.0};
  double gridImportKw{0.0};
  double gridExportKw{0.0};
  double generatorKw{0.0};
  int alertsCount{0};
  std::string lastUpdatedAt;
};

struct ApiCommissioningSummary {
  std::string siteName;
  std::string topologySummary;
  std::vector<std::string> sourceSummary;
  std::vector<std::string> policySummary;
  std::vector<std::string> monitoringSummary;
  std::vector<std::string> warnings;
  std::vector<std::string> readinessChecklist;
  std::vector<std::string> reviewLines;
};

std::string escapeJson(const std::string& value);
std::string toJson(const ApiDeviceInfo& value);
std::string toJson(const ApiLiveStatus& value);
std::string toJson(const MonitoringSnapshot& value);
std::string toJson(const AlarmState& value);
std::string toJson(const ApiCommissioningSummary& value);

}  // namespace dzx
