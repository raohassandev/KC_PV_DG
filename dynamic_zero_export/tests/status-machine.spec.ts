import test from 'node:test';
import assert from 'node:assert/strict';
import { createAlarmState, raiseAlarm } from '../runtime/alarm-model';
import { evaluateControllerStatus } from '../runtime/status-machine';

test('status machine maps healthy, degraded, fallback and faulted', () => {
  const baseAlarms = createAlarmState();
  assert.equal(
    evaluateControllerStatus({
      online: true,
      adapterUpstream: 'ok',
      adapterDownstream: 'ok',
      alarms: baseAlarms,
      fallbackActive: false,
    }),
    'HEALTHY',
  );

  const warnAlarms = createAlarmState();
  raiseAlarm(warnAlarms, {
    code: 'WARN',
    severity: 'warning',
    message: 'warning',
    timestamp: new Date().toISOString(),
  });
  assert.equal(
    evaluateControllerStatus({
      online: true,
      adapterUpstream: 'warn',
      adapterDownstream: 'ok',
      alarms: warnAlarms,
      fallbackActive: false,
    }),
    'DEGRADED',
  );

  assert.equal(
    evaluateControllerStatus({
      online: true,
      adapterUpstream: 'ok',
      adapterDownstream: 'ok',
      alarms: createAlarmState(),
      fallbackActive: true,
    }),
    'FALLBACK',
  );

  const faultAlarms = createAlarmState();
  raiseAlarm(faultAlarms, {
    code: 'CRIT',
    severity: 'critical',
    message: 'critical',
    timestamp: new Date().toISOString(),
  });
  assert.equal(
    evaluateControllerStatus({
      online: true,
      adapterUpstream: 'ok',
      adapterDownstream: 'ok',
      alarms: faultAlarms,
      fallbackActive: false,
    }),
    'FAULTED',
  );
});

