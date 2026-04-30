import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { Card as PaperCard } from 'react-native-paper';

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <PaperCard mode='contained' style={styles.card}>
      {title ? <PaperCard.Title title={title} titleStyle={styles.title} /> : null}
      <PaperCard.Content style={styles.content}>{children}</PaperCard.Content>
    </PaperCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 0,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  content: {
    paddingBottom: 14,
  },
});
