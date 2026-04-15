import { FeatureCard } from '../components/FeatureCard';
import { buildCommissioningViewModel } from '../view-models/commissioning';

export function CommissioningPage() {
  const summary = buildCommissioningViewModel();

  return (
    <div className='feature-page-grid'>
      <FeatureCard title='Commissioning Summary' subtitle={summary.siteName}>
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
    </div>
  );
}
