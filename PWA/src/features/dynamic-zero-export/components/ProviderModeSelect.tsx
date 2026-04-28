import { saveProviderMode } from '../services/liveStatusService';
import type { ProviderMode } from '../services/provider';

type Props = {
  value: ProviderMode;
  onModeChange: (mode: ProviderMode) => void;
  disabled?: boolean;
};

/** Monitoring API base URL resolution — persisted under `dzx.providerMode`. */
export function ProviderModeSelect({ value, onModeChange, disabled }: Props) {
  return (
    <label>
      Provider mode
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value as ProviderMode;
          saveProviderMode(next);
          onModeChange(next);
        }}
        disabled={disabled}
      >
        <option value='auto'>Auto</option>
        <option value='api'>API</option>
      </select>
    </label>
  );
}
