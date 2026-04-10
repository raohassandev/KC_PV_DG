export type BoardSensor = {
  entity_id: string;
  state: string;
  attributes?: Record<string, any>;
};

export type BoardState = {
  sensors: Record<string, number | string>;
  raw: any;
};

// Basic fetch from ESPHome web server JSON
export async function fetchBoardState(ip: string): Promise<BoardState> {
  try {
    const res = await fetch(`http://${ip}/sensor`, {
      method: 'GET',
    });

    if (!res.ok) {
      throw new Error('Board not reachable');
    }

    const data = await res.json();

    const parsed: Record<string, number | string> = {};

    // Normalize ESPHome sensor JSON
    Object.keys(data).forEach((key) => {
      const val = data[key];

      if (typeof val === 'object' && val !== null) {
        parsed[key] = val.state ?? 'NA';
      } else {
        parsed[key] = val;
      }
    });

    return {
      sensors: parsed,
      raw: data,
    };
  } catch (err) {
    console.error('Board fetch error:', err);
    throw err;
  }
}
