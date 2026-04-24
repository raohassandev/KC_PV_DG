import type { ReactNode } from 'react';
import styles from './FormGrid.module.css';

type Props = {
  children: ReactNode;
};

/**
 * Two-column commissioning layout that collapses to one column on narrow viewports.
 */
export function FormGrid({ children }: Props) {
  return <div className={styles.root}>{children}</div>;
}
