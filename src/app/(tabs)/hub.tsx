/**
 * Écran VOTE communautaire — « Qui veux-tu voir en stage ? »
 * Partagé école + événement (même Supabase). Mono-choix, changeable.
 * Accent cobalt (identité de la feature, indépendante du campus).
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wavetruv } from '@/components/Logo';
import { FavHeart } from '@/components/ui';
import { Palette, Radius, Space, Type } from '@/constants/brand';
import { useI18n } from '@/lib/i18n';
import { castVote, getActivePoll, Poll } from '@/lib/polls';

const COBALT = Palette.industry;
const INK = '#1B1917';
const AV_COLORS: readonly [string, string][] = [
  ['#3346C9', '#233BB0'],
  ['#8A5A2A', '#6D4318'],
  ['#4A4A52', '#2F2F36'],
  ['#2F7D4E', '#215C3A'],
  ['#B8620D', '#984D09'],
];

export default function VoteScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const p = await getActivePoll(['school', 'both']);
    setPoll(p);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onVote = async (candidateId: string) => {
    if (!poll || voting) return;
    setVoting(candidateId);
    try {
      await castVote(poll.id, candidateId);
      await load();
    } catch {
      // en prod : afficher un toast d'erreur
    } finally {
      setVoting(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerFull}>
        <ActivityIndicator color={COBALT} />
      </View>
    );
  }

  if (!poll) {
    return (
      <View style={[styles.centerFull, { padding: Space.xl }]}>
        <Ionicons name="megaphone-outline" size={28} color={Palette.textMute} />
        <Text style={styles.emptyText}>{t('vote.empty')}</Text>
      </View>
    );
  }

  const showResults = poll.resultsVisibility === 'live' || poll.status === 'closed';
  const total = Math.max(1, poll.totalVotes);

  return (
    <View style={{ flex: 1, backgroundColor: Palette.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Space.xxxl }}>
        {/* En-tête */}
        <View style={[styles.hdr, { paddingTop: insets.top + Space.md }]}>
          <View style={{ position: 'absolute', right: Space.lg, top: insets.top + Space.md }}>
            <Wavetruv size={20} tint="#fff" />
          </View>
          <View style={styles.scope}>
            <View style={styles.scopeDot} />
            <Text style={styles.scopeText}>{t('vote.scope')}</Text>
          </View>
          <Text style={styles.question}>{poll.question}</Text>
          {poll.subtitle ? <Text style={styles.subtitle}>{poll.subtitle}</Text> : null}
          <Text style={styles.total}>
            {poll.status === 'closed' ? `${t('vote.closed')} · ` : ''}
            {t('vote.totalVotes', { n: poll.totalVotes })}
          </Text>
        </View>

        {/* Consigne / confirmation */}
        <Text style={styles.hint}>{poll.myVote ? t('vote.youVoted') : t('vote.tapToVote')}</Text>

        {/* Candidats */}
        <View style={styles.list}>
          {poll.candidates.map((c, i) => {
            const selected = poll.myVote === c.id;
            const pct = Math.round((c.voteCount / total) * 100);
            const isVoting = voting === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => onVote(c.id)}
                disabled={poll.status !== 'open' || !!voting}
                style={[styles.card, selected && styles.cardSel]}>
                {c.photoUrl ? (
                  <Image source={{ uri: c.photoUrl }} style={styles.av} />
                ) : (
                  <LinearGradient colors={AV_COLORS[i % AV_COLORS.length]} style={styles.av} />
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <Text style={styles.name}>{c.name}</Text>
                    {selected && (
                      <View style={styles.badge}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
                        <Text style={styles.badgeText}>{t('vote.voted')}</Text>
                      </View>
                    )}
                  </View>
                  {c.subtitle ? <Text style={styles.sub}>{c.subtitle}</Text> : null}
                  {showResults && (
                    <View style={styles.resultRow}>
                      <View style={styles.track}>
                        <View style={[styles.fill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.pct}>{pct}%</Text>
                    </View>
                  )}
                </View>
                <FavHeart
                  fav={{ key: `teacher:${c.id}`, kind: 'teacher', label: c.name, subtitle: c.subtitle ?? undefined }}
                  size={20}
                  color={Palette.textMute}
                />
                {isVoting ? (
                  <ActivityIndicator color={COBALT} style={{ marginLeft: 8 }} />
                ) : (
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={selected ? COBALT : Palette.textMute}
                    style={{ marginLeft: 8 }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centerFull: { flex: 1, backgroundColor: Palette.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { ...Type.body, color: Palette.textMute, textAlign: 'center' },

  hdr: { backgroundColor: INK, paddingHorizontal: Space.lg, paddingBottom: Space.lg },
  scope: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  scopeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COBALT },
  scopeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: '#A9B0E8' },
  question: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4, color: '#fff', lineHeight: 26 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 8, lineHeight: 18 },
  total: { fontSize: 12, fontWeight: '700', color: COBALT, marginTop: 12, letterSpacing: 0.4 },

  hint: { ...Type.small, color: Palette.textDim, textAlign: 'center', marginTop: Space.lg, marginBottom: Space.sm },

  list: { paddingHorizontal: Space.lg, gap: 10, marginTop: 2 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Palette.border,
    padding: 12,
  },
  cardSel: { borderColor: COBALT, backgroundColor: Palette.industryTint },
  av: { width: 52, height: 52, borderRadius: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 16, fontWeight: '800', color: Palette.text, textTransform: 'uppercase', letterSpacing: -0.2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COBALT,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' },
  sub: { fontSize: 12, color: Palette.textDim, marginTop: 2 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  track: { flex: 1, height: 7, borderRadius: 100, backgroundColor: Palette.surface2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 100, backgroundColor: COBALT },
  pct: { fontSize: 12, fontWeight: '800', color: Palette.text, width: 38, textAlign: 'right' },
});
