#pragma once

#include "config.hpp"

#include <map>
#include <string>

namespace dzx {

using ConfigDocument = std::map<std::string, std::string>;

ConfigDocument parseKeyValueDocument(const std::string& text);
DynamicZeroExportSiteConfig loadConfigFromDocument(const ConfigDocument& doc);
std::string dumpConfigShape(const DynamicZeroExportSiteConfig& cfg);

}  // namespace dzx

