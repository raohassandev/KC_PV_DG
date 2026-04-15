#include "dzx/alarm.hpp"

namespace dzx {

AlarmState createAlarmState() {
  return AlarmState{};
}

void raiseAlarm(AlarmState& state, AlarmRecord record) {
  state.active.push_back(record);
}

}  // namespace dzx

