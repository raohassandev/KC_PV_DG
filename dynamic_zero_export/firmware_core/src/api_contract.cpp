#include "dzx/api_contract.hpp"

#include <sstream>

namespace dzx {

std::string escapeJson(const std::string& value) {
  std::ostringstream out;
  for (char ch : value) {
    switch (ch) {
      case '\\': out << "\\\\"; break;
      case '"': out << "\\\""; break;
      case '\n': out << "\\n"; break;
      case '\r': out << "\\r"; break;
      case '\t': out << "\\t"; break;
      default: out << ch; break;
    }
  }
  return out.str();
}

static std::string boolJson(bool value) { return value ? "true" : "false"; }

static std::string quote(const std::string& value) { return "\"" + escapeJson(value) + "\""; }

std::string toJson(const ApiDeviceInfo& value) {
  std::ostringstream out;
  out << "{";
  out << "\"deviceId\":" << quote(value.deviceId) << ",";
  out << "\"deviceName\":" << quote(value.deviceName) << ",";
  out << "\"controllerId\":" << quote(value.controllerId) << ",";
  out << "\"firmwareVersion\":" << quote(value.firmwareVersion) << ",";
  out << "\"buildId\":" << quote(value.buildId) << ",";
  out << "\"uptimeSec\":" << value.uptimeSec << ",";
  out << "\"localTimeIso\":" << quote(value.localTimeIso);
  out << "}";
  return out.str();
}

std::string toJson(const ApiLiveStatus& value) {
  std::ostringstream out;
  out << "{";
  out << "\"role\":" << quote(value.role) << ",";
  out << "\"siteName\":" << quote(value.siteName) << ",";
  out << "\"controllerState\":" << quote(value.controllerState) << ",";
  out << "\"systemOnline\":" << boolJson(value.systemOnline) << ",";
  out << "\"powerKw\":" << value.powerKw << ",";
  out << "\"solarKw\":" << value.solarKw << ",";
  out << "\"gridImportKw\":" << value.gridImportKw << ",";
  out << "\"gridExportKw\":" << value.gridExportKw << ",";
  out << "\"generatorKw\":" << value.generatorKw << ",";
  out << "\"alertsCount\":" << value.alertsCount << ",";
  out << "\"lastUpdatedAt\":" << quote(value.lastUpdatedAt);
  out << "}";
  return out.str();
}

static std::string alarmArrayJson(const std::vector<AlarmRecord>& alarms) {
  std::ostringstream out;
  out << "[";
  for (std::size_t i = 0; i < alarms.size(); ++i) {
    const auto& alarm = alarms[i];
    if (i > 0) out << ",";
    out << "{";
    out << "\"code\":" << quote(alarm.code) << ",";
    out << "\"severity\":" << quote(alarm.severity) << ",";
    out << "\"message\":" << quote(alarm.message) << ",";
    out << "\"timestampMs\":" << alarm.timestampMs;
    out << "}";
  }
  out << "]";
  return out.str();
}

static std::string stringArrayJson(const std::vector<std::string>& values) {
  std::ostringstream out;
  out << "[";
  for (std::size_t i = 0; i < values.size(); ++i) {
    if (i > 0) out << ",";
    out << quote(values[i]);
  }
  out << "]";
  return out.str();
}

std::string toJson(const MonitoringSnapshot& value) {
  std::ostringstream out;
  out << "{";
  out << "\"controllerStatus\":" << quote(value.controllerStatus) << ",";
  out << "\"topologyState\":" << quote(value.topologyState) << ",";
  out << "\"sourceState\":" << quote(value.sourceState) << ",";
  out << "\"policyMode\":" << quote(value.policyMode) << ",";
  out << "\"controllerOnline\":" << boolJson(value.controllerOnline) << ",";
  out << "\"realMeter\":{\"kw\":" << value.realMeter.kw << ",\"importKw\":" << value.realMeter.importKw << ",\"exportKw\":" << value.realMeter.exportKw << ",\"generatorKw\":" << value.realMeter.generatorKw << ",\"stale\":" << boolJson(value.realMeter.stale) << "},";
  out << "\"virtualMeter\":{\"kw\":" << value.virtualMeter.kw << ",\"exportLimitKw\":" << value.virtualMeter.exportLimitKw << ",\"targetKw\":" << value.virtualMeter.targetKw << ",\"mode\":" << quote(value.virtualMeter.mode) << ",\"notes\":" << stringArrayJson(value.virtualMeter.notes) << "},";
  out << "\"connectivity\":{\"wifiConnected\":" << boolJson(value.connectivity.wifiConnected) << ",\"lanConnected\":" << boolJson(value.connectivity.lanConnected) << ",\"localApiReachable\":" << boolJson(value.connectivity.localApiReachable) << "},";
  out << "\"alarms\":" << alarmArrayJson(value.alarms) << ",";
  out << "\"generatorMarginKw\":" << value.generatorMarginKw << ",";
  out << "\"summaryLines\":" << stringArrayJson(value.summaryLines);
  out << "}";
  return out.str();
}

std::string toJson(const AlarmState& value) {
  std::ostringstream out;
  out << "{";
  out << "\"active\":" << alarmArrayJson(value.active);
  out << "}";
  return out.str();
}

std::string toJson(const ApiCommissioningSummary& value) {
  std::ostringstream out;
  out << "{";
  out << "\"siteName\":" << quote(value.siteName) << ",";
  out << "\"topologySummary\":" << quote(value.topologySummary) << ",";
  out << "\"sourceSummary\":" << stringArrayJson(value.sourceSummary) << ",";
  out << "\"policySummary\":" << stringArrayJson(value.policySummary) << ",";
  out << "\"monitoringSummary\":" << stringArrayJson(value.monitoringSummary) << ",";
  out << "\"warnings\":" << stringArrayJson(value.warnings) << ",";
  out << "\"readinessChecklist\":" << stringArrayJson(value.readinessChecklist) << ",";
  out << "\"reviewLines\":" << stringArrayJson(value.reviewLines);
  out << "}";
  return out.str();
}

}  // namespace dzx
