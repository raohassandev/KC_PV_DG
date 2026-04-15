#include "dzx/simulator.hpp"

namespace dzx {

MockMeterInput::MockMeterInput(RealMeterSample sample) : sample_(std::move(sample)) {}
void MockMeterInput::setSample(RealMeterSample sample) { sample_ = std::move(sample); }
RealMeterSample MockMeterInput::read() { return sample_; }

void MockVirtualMeterOutput::publish(const VirtualMeterSample& sample) { last_ = sample; }
const VirtualMeterSample& MockVirtualMeterOutput::lastPublished() const { return last_; }

MockConnectivityProvider::MockConnectivityProvider(ConnectivitySnapshot snapshot) : snapshot_(std::move(snapshot)) {}
void MockConnectivityProvider::setSnapshot(ConnectivitySnapshot snapshot) { snapshot_ = std::move(snapshot); }
ConnectivitySnapshot MockConnectivityProvider::snapshot() { return snapshot_; }

void InMemoryStorage::saveText(const std::string& key, const std::string& text) { data_[key] = text; }
std::string InMemoryStorage::loadText(const std::string& key) { return data_.count(key) ? data_.at(key) : std::string{}; }

MonotonicClock::MonotonicClock(std::uint64_t startMs) : nowMs_(startMs) {}
std::uint64_t MonotonicClock::nowMs() const { return nowMs_; }
void MonotonicClock::advanceMs(std::uint64_t delta) { nowMs_ += delta; }

void VectorLogger::log(const std::string& level, const std::string& message) { entries_.push_back(level + ":" + message); }
const std::vector<std::string>& VectorLogger::entries() const { return entries_; }

SimulationResult simulateStep(Controller& controller, IMeterInput& meter, IConnectivityProvider& connectivity, IVirtualMeterOutput& output) {
  return {controller.step(meter, connectivity, output)};
}

}  // namespace dzx

