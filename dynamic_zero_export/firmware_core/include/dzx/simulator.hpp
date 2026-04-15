#pragma once

#include "controller.hpp"

#include <map>

namespace dzx {

struct SimulationResult {
  ControllerStepResult step;
};

class MockMeterInput final : public IMeterInput {
 public:
  explicit MockMeterInput(RealMeterSample sample);
  void setSample(RealMeterSample sample);
  RealMeterSample read() override;

 private:
  RealMeterSample sample_;
};

class MockVirtualMeterOutput final : public IVirtualMeterOutput {
 public:
  void publish(const VirtualMeterSample& sample) override;
  const VirtualMeterSample& lastPublished() const;

 private:
  VirtualMeterSample last_;
};

class MockConnectivityProvider final : public IConnectivityProvider {
 public:
  explicit MockConnectivityProvider(ConnectivitySnapshot snapshot);
  void setSnapshot(ConnectivitySnapshot snapshot);
  ConnectivitySnapshot snapshot() override;

 private:
  ConnectivitySnapshot snapshot_;
};

class InMemoryStorage final : public IStorage {
 public:
  void saveText(const std::string& key, const std::string& text) override;
  std::string loadText(const std::string& key) override;

 private:
  std::map<std::string, std::string> data_;
};

class MonotonicClock final : public IClock {
 public:
  explicit MonotonicClock(std::uint64_t startMs = 0);
  std::uint64_t nowMs() const override;
  void advanceMs(std::uint64_t delta);

 private:
  std::uint64_t nowMs_;
};

class VectorLogger final : public ILogger {
 public:
  void log(const std::string& level, const std::string& message) override;
  const std::vector<std::string>& entries() const;

 private:
  std::vector<std::string> entries_;
};

SimulationResult simulateStep(Controller& controller, IMeterInput& meter, IConnectivityProvider& connectivity, IVirtualMeterOutput& output);

}  // namespace dzx
