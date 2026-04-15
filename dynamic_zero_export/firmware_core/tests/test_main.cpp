void run_config_tests();
void run_policy_engine_tests();
void run_controller_tests();
void run_api_contract_tests();

int main() {
  run_config_tests();
  run_policy_engine_tests();
  run_controller_tests();
  run_api_contract_tests();
  return 0;
}
