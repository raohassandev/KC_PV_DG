#pragma once

#include "alarm.hpp"
#include "config.hpp"
#include "interfaces.hpp"
#include "monitoring.hpp"
#include "policy_types.hpp"

namespace dzx {

class Controller {
 public:
  explicit Controller(DynamicZeroExportSiteConfig cfg);

  const DynamicZeroExportSiteConfig& config() const;
  const RuntimeSiteModel& model() const;
  const MonitoringSnapshot& monitoring() const;

  ControllerStepResult step(IMeterInput& meter, IConnectivityProvider& connectivity, IVirtualMeterOutput& output);

 private:
  DynamicZeroExportSiteConfig config_;
  RuntimeSiteModel model_;
  MonitoringSnapshot monitoring_{};
};

}  // namespace dzx

