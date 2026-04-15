#include "dzx/api_contract.hpp"

#include <cassert>

using namespace dzx;

void run_api_contract_tests() {
  ApiDeviceInfo device{"dzx-001", "Dynamic Zero Export Controller", "dzx-001", "0.1.0-dev", "dev-0001", 3600, "2026-04-15T00:00:00Z"};
  auto json = toJson(device);
  assert(json.find("\"deviceId\"") != std::string::npos);
  assert(json.find("\"firmwareVersion\"") != std::string::npos);

  MonitoringSnapshot monitoring;
  monitoring.controllerStatus = "HEALTHY";
  monitoring.topologyState = "single";
  monitoring.sourceState = "GRID";
  monitoring.policyMode = "policy";
  monitoring.controllerOnline = true;
  monitoring.summaryLines = {"status=HEALTHY"};
  auto monitoringJson = toJson(monitoring);
  assert(monitoringJson.find("\"controllerStatus\"") != std::string::npos);
  assert(monitoringJson.find("\"summaryLines\"") != std::string::npos);

  AlarmState alarms;
  raiseAlarm(alarms, {"METER_STALE", "warning", "Meter stale", 1});
  auto alarmJson = toJson(alarms);
  assert(alarmJson.find("\"active\"") != std::string::npos);
  assert(alarmJson.find("METER_STALE") != std::string::npos);

  ApiCommissioningSummary commissioning;
  commissioning.siteName = "Demo Plant";
  commissioning.topologySummary = "single bus";
  commissioning.sourceSummary = {"Grid meter present", "Inverter mapped"};
  commissioning.policySummary = {"Zero export", "Deadband 1 kW"};
  commissioning.monitoringSummary = {"Wi-Fi connected", "LAN connected"};
  commissioning.warnings = {"Inverter write gate pending"};
  commissioning.readinessChecklist = {"Verify meter", "Verify connectivity"};
  commissioning.reviewLines = {"Topology valid", "Policy valid"};
  auto commissioningJson = toJson(commissioning);
  assert(commissioningJson.find("\"sourceSummary\"") != std::string::npos);
  assert(commissioningJson.find("Zero export") != std::string::npos);
}
