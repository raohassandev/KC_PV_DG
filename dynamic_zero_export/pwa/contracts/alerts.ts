export type AlertSeverity = 'info' | 'warning' | 'critical';

export type AlertRecord = {
  id: string;
  code: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  source: 'controller' | 'meter' | 'inverter' | 'network' | 'commissioning';
  debugDetails?: string;
};

export type AlertFeed = {
  active: AlertRecord[];
  history: AlertRecord[];
  summary: {
    criticalCount: number;
    warningCount: number;
    infoCount: number;
  };
};

export function summarizeAlertFeed(feed: AlertFeed): string[] {
  return [
    `critical=${feed.summary.criticalCount}`,
    `warning=${feed.summary.warningCount}`,
    `info=${feed.summary.infoCount}`,
  ];
}

