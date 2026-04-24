import type { ReactNode } from 'react';
import styles from './DocReaderLayout.module.css';

type DocReaderLayoutProps = {
  'aria-label': string;
  kicker: string;
  title: string;
  lede: ReactNode;
  children: ReactNode;
};

/**
 * Long-form documentation inside the app shell (Templates tab).
 * Keeps layout + rhythm in one React-owned surface instead of global `.docs-reader*` classes.
 */
export function DocReaderLayout({ 'aria-label': ariaLabel, kicker, title, lede, children }: DocReaderLayoutProps) {
  return (
    <article className={styles.root} aria-label={ariaLabel}>
      <header className={styles.header}>
        <p className={styles.kicker}>{kicker}</p>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.lede}>{lede}</div>
      </header>
      <div className={styles.sections}>{children}</div>
    </article>
  );
}

type DocReaderSectionProps = {
  title: string;
  children: ReactNode;
};

export function DocReaderSection({ title, children }: DocReaderSectionProps) {
  return (
    <section className={`panel ${styles.section}`}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}
