import type { ApiSnapshotResponse } from '../api_contract';
import {
  alertsExample,
  commissioningExample,
  connectivityExample,
  deviceExample,
  historyExample,
  liveStatusExample,
  configReviewExample,
  sessionExample,
  topologyExample,
} from '../api_contract/examples';

export function buildSnapshot(): ApiSnapshotResponse {
  return {
    device: deviceExample,
    live: liveStatusExample,
    topology: topologyExample,
    connectivity: connectivityExample,
    alerts: alertsExample,
    history: historyExample,
    commissioning: commissioningExample,
    configReview: configReviewExample,
    session: sessionExample,
  };
}

