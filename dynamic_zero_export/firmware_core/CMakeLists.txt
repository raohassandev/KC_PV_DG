cmake_minimum_required(VERSION 3.16)
project(dynamic_zero_export_firmware_core LANGUAGES CXX)

option(DZX_BUILD_TESTS "Build dynamic zero export firmware core tests" ON)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(dzx_firmware_core
  src/config.cpp
  src/topology.cpp
  src/source_detection.cpp
  src/virtual_meter.cpp
  src/alarm.cpp
  src/monitoring.cpp
  src/serialization.cpp
  src/api_contract.cpp
  src/controller.cpp
  src/policy_engine.cpp
  src/simulator.cpp
)

target_include_directories(dzx_firmware_core
  PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_compile_options(dzx_firmware_core PRIVATE -Wall -Wextra -Wpedantic)

if (DZX_BUILD_TESTS)
  add_executable(dzx_firmware_core_tests
    tests/test_main.cpp
    tests/test_config.cpp
    tests/test_policy_engine.cpp
    tests/test_controller.cpp
    tests/test_api_contract.cpp
  )
  target_link_libraries(dzx_firmware_core_tests PRIVATE dzx_firmware_core)
  target_include_directories(dzx_firmware_core_tests PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/include)
  target_compile_options(dzx_firmware_core_tests PRIVATE -Wall -Wextra -Wpedantic)
endif()
