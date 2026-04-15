#include "dzx/config.hpp"
#include "dzx/serialization.hpp"

#include <cassert>

using namespace dzx;

void run_config_tests() {
  auto cfg = defaultConfig();
  auto diag = validateConfig(cfg);
  assert(diag.errors.empty());

  auto doc = parseKeyValueDocument(
    "site.name=Plant A\nsite.controllerId=dzx-123\ntopology.type=DUAL_BUS_COMBINED\ntopology.busCount=2\ntopology.tieSignalPresent=true\npolicy.gridMode=zero_export\n");
  auto parsed = loadConfigFromDocument(doc);
  assert(parsed.site.name == "Plant A");
  assert(parsed.site.controllerId == "dzx-123");
  assert(parsed.topology.busCount == 2);
  assert(parsed.topology.tieSignalPresent);
}
