#include "dzx/controller.hpp"
#include "dzx/simulator.hpp"

#include <cassert>

using namespace dzx;

void run_controller_tests() {
  auto cfg = defaultConfig();
  Controller controller(cfg);
  MockMeterInput meter({1.0, 0.0, 1.0, 0.0, true, true, "GRID", 1});
  MockConnectivityProvider connectivity({false, false, false, false, false, "Plant-WiFi", "", -80, "dzx-001", "0.1", "dev-1", 1});
  MockVirtualMeterOutput output;
  auto result = controller.step(meter, connectivity, output);
  assert(result.monitoring.controllerStatus == "DEGRADED" || result.monitoring.controllerStatus == "FALLBACK" || result.monitoring.controllerStatus == "FAULTED");
  assert(!result.monitoring.summaryLines.empty());

  meter.setSample({14.0, 0.0, 14.0, 0.0, false, true, "GRID", 2});
  connectivity.setSnapshot({true, true, true, true, true, "Plant-WiFi", "192.168.1.20", -45, "dzx-001", "0.1", "dev-1", 2});
  auto result2 = controller.step(meter, connectivity, output);
  assert(result2.monitoring.controllerOnline);
  assert(result2.monitoring.virtualMeter.mode == result2.virtualMeter.mode);
}
