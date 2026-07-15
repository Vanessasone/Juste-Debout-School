/**
 * NUDGE D'ÉCONOMIE — bottom-sheet discret qui apparaît quand on paie à l'unité :
 * « Tu économiserais X € avec une carte… ». Informe (per-cours, ladder) plutôt
 * que de crier une promo → pousse à la carte sans avoir l'air de vendre.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientBtn } from '@/components/ui';
import { CampusCode, gradientFor, Radius, Space } from '@/constants/brand';
import { bestSaving, savingsLadder, singlePrice } from '@/lib/cards';
import { tap } from '@/lib/haptics';
import { useI18n } from '@/lib/i18n';

const INK = '#14101c';

export function SavingsNudge({
  visible,
  campus,
  onClose,
  onSeeCards,
}: {
  visible: boolean;
  campus: CampusCode;
  onClose: () => void;
  onSeeCards: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const best = bestSaving(campus);
  const ladder = savingsLadder(campus);
  const single = singlePrice(campus);

  useEffect(() => { if (visible) tap(); }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + Space.lg }]} onPress={() => {}}>
          <View style={styles.grab} />

          <Text style={styles.eyebrow}>{t('nudge.eyebrow')}</Text>
          <Text style={styles.title}>{t('nudge.title', { n: best.savings })}</Text>
          <Text style={styles.body}>
            {t('nudge.body', { c: best.offer.classes, p: best.offer.priceEuros, u: best.perClass, s: single })}
          </Text>

          <Text style={styles.ladderLbl}>{t('nudge.ladder')}</Text>
          <View style={{ gap: 8 }}>
            {ladder.map((row) => {
              const on = row.offer.classes === best.offer.classes;
              return (
                <View key={row.offer.classes} style={[styles.row, on && styles.rowOn]}>
                  <Text style={styles.rowName}>{row.offer.classes} cours</Text>
                  <Text style={styles.rowPer}>{t('nudge.perClass', { n: row.perClass })}</Text>
                  <Text style={styles.rowPrice}>{row.offer.priceEuros} €</Text>
                  {row.savings > 0 ? (
                    <View style={[styles.saveTag, on && styles.saveTagOn]}>
                      <Text style={[styles.saveTxt, on && styles.saveTxtOn]}>{t('nudge.save', { n: row.savings })}</Text>
                    </View>
                  ) : (
                    <View style={styles.saveTag} />
                  )}
                </View>
              );
            })}
          </View>

          <View style={{ marginTop: Space.lg }}>
            <GradientBtn label={t('nudge.cta')} colors={gradientFor(campus)} onPress={() => { onClose(); onSeeCards(); }} />
          </View>
          <Pressable onPress={onClose} hitSlop={8} style={styles.later}>
            <Text style={styles.laterTxt}>{t('nudge.later')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(8,6,12,0.55)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 460, backgroundColor: INK, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: Space.lg, paddingTop: Space.md },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', marginBottom: Space.lg },
  eyebrow: { fontSize: 12, fontWeight: '800', color: '#FF2E7E', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { fontSize: 27, fontWeight: '800', color: '#fff', letterSpacing: -0.6, marginTop: 6 },
  body: { fontSize: 14, color: 'rgba(255,255,255,0.78)', lineHeight: 20, marginTop: 8 },
  ladderLbl: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Space.lg, marginBottom: Space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'transparent', borderRadius: Radius.md, paddingHorizontal: 13, paddingVertical: 11 },
  rowOn: { backgroundColor: 'rgba(255,106,22,0.12)', borderColor: 'rgba(255,106,22,0.55)' },
  rowName: { width: 66, fontSize: 14, fontWeight: '800', color: '#fff' },
  rowPer: { flex: 1, fontSize: 12.5, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  rowPrice: { fontSize: 13.5, fontWeight: '800', color: '#fff', width: 52, textAlign: 'right' },
  saveTag: { width: 74, alignItems: 'flex-end' },
  saveTagOn: {},
  saveTxt: { fontSize: 11.5, fontWeight: '800', color: '#7ee0a0' },
  saveTxtOn: { color: '#8CFF7A' },
  later: { alignSelf: 'center', paddingVertical: 12, marginTop: 4 },
  laterTxt: { fontSize: 13.5, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
});
