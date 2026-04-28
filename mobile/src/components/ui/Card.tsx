import type { ReactNode } from 'react';
import { Card as PaperCard } from 'react-native-paper';

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <PaperCard style={{ marginBottom: 12 }}>
      {title ? <PaperCard.Title title={title} /> : null}
      <PaperCard.Content>{children}</PaperCard.Content>
    </PaperCard>
  );
}
