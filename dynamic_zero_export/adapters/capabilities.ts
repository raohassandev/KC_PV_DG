export type AdapterCapability = {
  readonly id: string;
  readonly label: string;
  readonly supportedModes: string[];
  readonly notes: string[];
};

export type AdapterCapabilities = {
  readonly adapterId: string;
  readonly adapterKind: string;
  readonly capabilities: AdapterCapability[];
};

