import type { ReactNode } from 'react';

type FeatureCardProps = {
  title: string;
  value?: string;
  subtitle?: string;
  children?: ReactNode;
};

export function FeatureCard({ title, value, subtitle, children }: FeatureCardProps) {
  return (
    <section className='feature-card'>
      <div className='feature-card-header'>
        <h3>{title}</h3>
        {value ? <div className='feature-card-value'>{value}</div> : null}
      </div>
      {subtitle ? <p className='feature-card-subtitle'>{subtitle}</p> : null}
      {children}
    </section>
  );
}
