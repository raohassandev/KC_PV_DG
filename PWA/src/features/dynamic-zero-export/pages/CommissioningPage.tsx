import { FeatureCard } from '../components/FeatureCard';
import {
  buildCommissioningViewModel,
  mapCommissioningApiToModel,
} from '../view-models/commissioning';
import { useEffect, useState } from 'react';
import { fetchCommissioningApiBundle } from '../services/commissioningService';
import { loadProviderMode } from '../services/liveStatusService';
import type { CommissioningSummaryModel } from '../../../../../dynamic_zero_export/pwa';
import type { PwaRole } from '../roles';

export function CommissioningPage({ role = 'installer' }: { role?: PwaRole }) {
  const [summary, setSummary] = useState<CommissioningSummaryModel>(() =>
    buildCommissioningViewModel(role),
  );
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'offline'>('loading');

  useEffect(() => {
    let active = true;
    setLoadState('loading');
    fetchCommissioningApiBundle(loadProviderMode())
      .then(({ commissioning, configReview }) => {
        if (!active) return;
        if (commissioning) {
          setSummary(mapCommissioningApiToModel(commissioning, role, configReview));
          setLoadState('idle');
        } else {
          setSummary(buildCommissioningViewModel(role));
          setLoadState('offline');
        }
      })
      .catch(() => {
        if (!active) return;
        setSummary(buildCommissioningViewModel(role));
        setLoadState('offline');
      });
    return () => {
      active = false;
    };
  }, [role]);

  return (
    <div className='feature-page-grid'>
      <FeatureCard
        title='Commissioning Summary'
        subtitle={`${summary.siteName} · ${role}${
          loadState === 'loading' ? ' · loading…' : ''
        }${loadState === 'offline' ? ' · fixture preview (no API)' : ''}`}
      >
        <ul className='list-block'>
          {summary.cards.map((card) => (
            <li key={card.label}>
              {card.label}: {card.value}
              {card.note ? ` · ${card.note}` : ''}
            </li>
          ))}
        </ul>
      </FeatureCard>
      <FeatureCard title='Readiness Checklist' subtitle='Installer tasks'>
        <ul className='list-block'>
          {summary.checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </FeatureCard>
      <FeatureCard title='Warnings' subtitle='Commissioning notes'>
        <ul className='list-block'>
          {summary.warnings.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </FeatureCard>
      {summary.reviewLines && summary.reviewLines.length > 0 ? (
        <FeatureCard title='Review lines' subtitle='From controller commissioning payload'>
          <ul className='list-block'>
            {summary.reviewLines.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </FeatureCard>
      ) : null}
      {summary.configReview ? (
        <FeatureCard
          title='Config review'
          subtitle={summary.configReview.valid ? 'Valid' : 'Needs attention'}
        >
          <ul className='list-block'>
            <li>Valid: {String(summary.configReview.valid)}</li>
            {summary.configReview.errors.map((item) => (
              <li key={`e-${item}`}>Error: {item}</li>
            ))}
            {summary.configReview.warnings.map((item) => (
              <li key={`w-${item}`}>Warning: {item}</li>
            ))}
            {summary.configReview.reviewLines.map((item) => (
              <li key={`r-${item}`}>{item}</li>
            ))}
          </ul>
        </FeatureCard>
      ) : null}
    </div>
  );
}
