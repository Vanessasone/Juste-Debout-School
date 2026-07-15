/**
 * RATE SHEET — bottom-sheet « post-class rating » : l'élève note son prof en
 * 1–5 étoiles (+ commentaire) après un cours. Alimente le classement du prof.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientBtn } from '@/components/ui';
import { Palette, Radius, Space } from '@/constants/brand';
import { success, tap } from '@/lib/haptics';
import { useI18n } from '@/lib/i18n';
import { rateClass, RateItem } from '@/lib/ratings';

const INK = '#14101c';
const GOLD = '#E8B54B';

export function RateSheet({ visible, item, onClose, onRated }: {
  visible: boolean;
  item: RateItem | null;
  onClose: () => void;
  onRated?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (visible) { setStars(0); setComment(''); setDone(false); }
  }, [visible]);

  const submit = async () => {
    if (!item || stars === 0) return;
    setSaving(true);
    try {
      await rateClass(item, stars, comment.trim() || undefined);
      success();
      setDone(true);
      setTimeout(() => { onRated?.(); onClose(); }, 1200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + Space.lg }]} onPress={() => {}}>
          <View style={styles.grab} />

          {item && !done && (
            <>
              <View style={styles.head}>
                {item.teacherPhoto ? (
                  <Image source={{ uri: item.teacherPhoto }} style={styles.av} />
                ) : (
                  <LinearGradient colors={['#FF6A16', '#FF2E7E'] as const} style={styles.av}><Text style={styles.avInit}>{item.teacherName.charAt(0)}</Text></LinearGradient>
                )}
                <Text style={styles.q}>{t('rate.q', { style: item.style, name: item.teacherName })}</Text>
              </View>

              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => { tap(); setStars(n); }} hitSlop={6}>
                    <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={40} color={n <= stars ? GOLD : 'rgba(255,255,255,0.28)'} />
                  </Pressable>
                ))}
              </View>

              <TextInput
                style={styles.input}
                value={comment}
                onChangeText={setComment}
                placeholder={t('rate.commentPh')}
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
              />

              <GradientBtn label={t('rate.submit')} colors={['#FF6A16', '#FF2E7E']} onPress={submit} disabled={saving || stars === 0} style={{ marginTop: Space.lg }} />
            </>
          )}

          {done && (
            <View style={styles.doneBox}>
              <Ionicons name="checkmark-circle" size={44} color="#3E9E59" />
              <Text style={styles.doneTxt}>{t('rate.done')}</Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(8,6,12,0.55)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 460, backgroundColor: INK, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: Space.lg, paddingTop: Space.md },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', marginBottom: Space.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: Space.xl },
  av: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avInit: { color: '#fff', fontSize: 22, fontWeight: '800' },
  q: { flex: 1, fontSize: 17, fontWeight: '800', color: '#fff', lineHeight: 23 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#fff', marginTop: Space.xl, minHeight: 60, textAlignVertical: 'top' },
  doneBox: { alignItems: 'center', gap: 12, paddingVertical: Space.xxl },
  doneTxt: { fontSize: 17, fontWeight: '800', color: '#fff', textAlign: 'center' },
});
