import type { AlertFeed, AlertRecord } from '../contracts/alerts';
import type { PwaRole } from '../roles';

function shorten(message: string) {
  return message.length > 72 ? `${message.slice(0, 69)}...` : message;
}

export function buildAlertViewModel(feed: AlertFeed, role: PwaRole) {
  const records = role === 'manufacturer' ? feed.history : feed.active;
  const list: AlertRecord[] = records.map((record) => {
    const base: AlertRecord = {
      id: record.id,
      code: record.code,
      severity: record.severity,
      title: record.title,
      message: role === 'user' ? shorten(record.message) : record.message,
      timestamp: record.timestamp,
      source: record.source,
    };
    if (role === 'manufacturer' && record.debugDetails) {
      return { ...base, debugDetails: record.debugDetails };
    }
    return base;
  });
  return {
    role,
    items: list,
    summary: feed.summary,
  };
}
