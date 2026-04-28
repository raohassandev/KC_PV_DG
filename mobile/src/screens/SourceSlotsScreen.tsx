import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AppScreen } from '../components/ui/AppScreen';
import { Card } from '../components/ui/Card';
import { LabeledInput } from '../components/ui/LabeledInput';
import { LabeledSelect } from '../components/ui/LabeledSelect';
import { colors } from '../theme/colors';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateSlot } from '../store/slices/siteConfigSlice';
import type { DeviceType, SourceRole, SourceSlot } from '../domain/siteProfileSchema';
import { deviceOptionsForRole } from '../domain/siteTemplates';

function toInt(raw: string, fallback: number) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function roleLabel(role: SourceRole) {
  if (role === 'grid_meter') return 'Grid meter';
  if (role === 'generator_meter') return 'Generator meter';
  if (role === 'inverter') return 'Inverter';
  return 'Unused';
}

export function SourceSlotsScreen() {
  const dispatch = useAppDispatch();
  const slots = useAppSelector((s) => s.siteConfig.config.slots);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const roleOptions = useMemo(
    () =>
      (['grid_meter', 'generator_meter', 'inverter', 'none'] as const).map((r) => ({
        value: r,
        label: roleLabel(r),
      })),
    [],
  );

  return (
    <AppScreen
      title='Source slots'
      subtitle='Full slot mapping: role, device type, Modbus ID, transport, and link hints.'
    >
      {slots.length ? null : (
        <Card title='No slots yet'>
          <Text style={styles.help}>
            Apply a scenario template on the Site tab (Single bus, Dual bus, etc.) to generate the
            harness slots.
          </Text>
        </Card>
      )}

      {slots.map((slot) => {
        const open = !!expanded[slot.id];
        const deviceOpts = deviceOptionsForRole(slot.role).map(([value, label]) => ({
          value,
          label,
        }));
        const transport = slot.transport === 'tcp' || slot.transport === 'rs232' ? slot.transport : 'rtu';
        const transportOptions = [
          { value: 'rtu' as const, label: 'RS-485 RTU' },
          { value: 'rs232' as const, label: 'RS-232 RTU' },
          { value: 'tcp' as const, label: 'TCP (Modbus TCP)' },
        ];

        return (
          <Card key={slot.id} title={`${slot.id} · ${slot.label || ''}`.trim()}>
            <View style={styles.slotTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.meta}>
                  {roleLabel(slot.role)} · {slot.deviceType} · Modbus {slot.modbusId}
                </Text>
              </View>
              <Switch
                value={slot.enabled}
                onValueChange={(v) => {
                  dispatch(updateSlot({ id: slot.id, patch: { enabled: v } }));
                }}
              />
            </View>

            <Pressable
              onPress={() => setExpanded((p) => ({ ...p, [slot.id]: !open }))}
              style={styles.expandBtn}
            >
              <Text style={styles.expandText}>{open ? 'Hide details' : 'Edit details'}</Text>
            </Pressable>

            {open ? (
              <SlotEditor
                slot={slot}
                roleOptions={roleOptions}
                deviceOptions={deviceOpts}
                transport={transport}
                transportOptions={transportOptions}
                onPatch={(patch) => dispatch(updateSlot({ id: slot.id, patch }))}
              />
            ) : null}
          </Card>
        );
      })}
    </AppScreen>
  );
}

function SlotEditor({
  slot,
  roleOptions,
  deviceOptions,
  transport,
  transportOptions,
  onPatch,
}: {
  slot: SourceSlot;
  roleOptions: Array<{ value: SourceRole; label: string }>;
  deviceOptions: Array<{ value: DeviceType; label: string }>;
  transport: NonNullable<SourceSlot['transport']>;
  transportOptions: Array<{ value: NonNullable<SourceSlot['transport']>; label: string }>;
  onPatch: (patch: Partial<SourceSlot>) => void;
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <LabeledInput label='Label' value={slot.label} onChangeText={(v) => onPatch({ label: v })} />

      <LabeledSelect
        label='Role'
        value={slot.role}
        options={roleOptions}
        onValueChange={(v) => onPatch({ role: v })}
      />

      <LabeledSelect
        label='Device type'
        value={slot.deviceType}
        options={deviceOptions.length ? deviceOptions : [{ value: 'none', label: 'Unused' }]}
        onValueChange={(v) => onPatch({ deviceType: v })}
      />

      <LabeledInput
        label='Modbus ID'
        value={String(slot.modbusId ?? '')}
        onChangeText={(v) => onPatch({ modbusId: toInt(v, slot.modbusId ?? 1) })}
        keyboardType='numeric'
      />

      <LabeledSelect
        label='Transport'
        value={transport}
        options={transportOptions}
        onValueChange={(v) => onPatch({ transport: v })}
      />

      {transport === 'tcp' ? (
        <>
          <LabeledInput
            label='TCP host'
            value={slot.tcpHost ?? ''}
            onChangeText={(v) => onPatch({ tcpHost: v })}
            placeholder='192.168.1.10'
            autoCapitalize='none'
          />
          <LabeledInput
            label='TCP port'
            value={String(slot.tcpPort ?? 502)}
            onChangeText={(v) => onPatch({ tcpPort: toInt(v, slot.tcpPort ?? 502) })}
            keyboardType='numeric'
          />
        </>
      ) : null}

      <LabeledInput
        label='Capacity (kW)'
        value={String(slot.capacityKw ?? 0)}
        onChangeText={(v) => onPatch({ capacityKw: toInt(v, slot.capacityKw ?? 0) })}
        keyboardType='numeric'
      />

      <LabeledSelect
        label='Bus side'
        value={(slot.busSide ?? 'A') as 'A' | 'B' | 'both'}
        options={[
          { value: 'A', label: 'A' },
          { value: 'B', label: 'B' },
          { value: 'both', label: 'both' },
        ]}
        onValueChange={(v) => onPatch({ busSide: v })}
      />

      <LabeledInput
        label='Network ID'
        value={slot.networkId ?? 'main'}
        onChangeText={(v) => onPatch({ networkId: v })}
        autoCapitalize='none'
      />
    </View>
  );
}

const styles = StyleSheet.create({
  help: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  slotTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  expandBtn: { marginTop: 10, paddingVertical: 8 },
  expandText: { color: colors.primary, fontWeight: '700' },
});

