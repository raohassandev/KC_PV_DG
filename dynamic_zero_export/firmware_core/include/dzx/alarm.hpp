#pragma once

#include "interfaces.hpp"

namespace dzx {

struct AlarmState {
  std::vector<AlarmRecord> active;
};

AlarmState createAlarmState();
void raiseAlarm(AlarmState& state, AlarmRecord record);

}  // namespace dzx

