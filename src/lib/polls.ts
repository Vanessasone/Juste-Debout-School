/**
 * Couche données VOTE — sondage actif, candidats, résultats, vote.
 * Partagé avec l'app événement (même Supabase). En mode démo (sans .env),
 * un état en mémoire simule le vote pour que l'écran soit pleinement jouable.
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type PollCandidate = {
  id: string;
  name: string;
  subtitle: string | null;
  photoUrl: string | null;
  voteCount: number;
};

export type Poll = {
  id: string;
  question: string;
  subtitle: string | null;
  status: string; // open | closed
  resultsVisibility: string; // live | after_close
  candidates: PollCandidate[];
  totalVotes: number;
  myVote: string | null; // candidate_id choisi, ou null
};

/* ---------------- Mode démo (en mémoire) ---------------- */

const MOCK_CANDIDATES: PollCandidate[] = [
  { id: 'c1', name: 'Diablo', subtitle: 'Popping', photoUrl: null, voteCount: 128 },
  { id: 'c2', name: 'Nelson', subtitle: 'Popping · Boogaloo', photoUrl: null, voteCount: 96 },
  { id: 'c3', name: 'Yugson', subtitle: 'House', photoUrl: null, voteCount: 154 },
  { id: 'c4', name: 'Soulz', subtitle: 'House', photoUrl: null, voteCount: 73 },
  { id: 'c5', name: 'Malika', subtitle: 'Waacking · Dancehall', photoUrl: null, voteCount: 61 },
];
let mockMyVote: string | null = null;

function mockPoll(): Poll {
  const candidates = MOCK_CANDIDATES.map((c) => ({ ...c }));
  return {
    id: 'mock-poll',
    question: 'Qui veux-tu voir en stage à la Juste Debout School ?',
    subtitle: 'Le/la gagnant·e donnera un stage exceptionnel au prochain trimestre.',
    status: 'open',
    resultsVisibility: 'live',
    candidates,
    totalVotes: candidates.reduce((s, c) => s + c.voteCount, 0),
    myVote: mockMyVote,
  };
}

/* ---------------- Accès réel (Supabase) ---------------- */

/**
 * Sondage ouvert visible dans cette app.
 * @param scopes portées à inclure (école : ['school','both'] ; événement : ['event','both']).
 */
export async function getActivePoll(scopes: string[] = ['school', 'both']): Promise<Poll | null> {
  if (!isSupabaseConfigured) return mockPoll();

  // Un sondage n'est « actif » que s'il est ouvert ET dans sa fenêtre de dates
  // (début passé, fin nulle ou à venir) → contrôle total de QUAND il s'affiche.
  const nowIso = new Date().toISOString();
  const { data: poll, error } = await supabase
    .from('polls')
    .select(
      'id, question, subtitle, status, results_visibility, ' +
        'poll_candidates(id, name, subtitle, photo_url, vote_count)',
    )
    .in('scope', scopes)
    .eq('status', 'open')
    .lte('starts_at', nowIso)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !poll) return null;
  const p = poll as any;

  const { data: mine } = await supabase
    .from('poll_votes')
    .select('candidate_id')
    .eq('poll_id', p.id)
    .maybeSingle();

  const candidates: PollCandidate[] = (p.poll_candidates ?? [])
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      subtitle: c.subtitle,
      photoUrl: c.photo_url,
      voteCount: c.vote_count ?? 0,
    }))
    .sort((a: PollCandidate, b: PollCandidate) => b.voteCount - a.voteCount);

  return {
    id: p.id,
    question: p.question,
    subtitle: p.subtitle,
    status: p.status,
    resultsVisibility: p.results_visibility,
    candidates,
    totalVotes: candidates.reduce((s, c) => s + c.voteCount, 0),
    myVote: (mine as any)?.candidate_id ?? null,
  };
}

/** Vote pour un candidat (mono-choix : remplace le vote précédent). */
export async function castVote(pollId: string, candidateId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    // démo : ajuste les compteurs en mémoire
    if (mockMyVote && mockMyVote !== candidateId) {
      const prev = MOCK_CANDIDATES.find((c) => c.id === mockMyVote);
      if (prev) prev.voteCount = Math.max(0, prev.voteCount - 1);
    }
    if (mockMyVote !== candidateId) {
      const next = MOCK_CANDIDATES.find((c) => c.id === candidateId);
      if (next) next.voteCount += 1;
      mockMyVote = candidateId;
    }
    return;
  }
  const { error } = await supabase.rpc('cast_vote', { p_poll: pollId, p_candidate: candidateId });
  if (error) throw error;
}

export type NewCandidate = { name: string; photoUrl?: string | null; subtitle?: string | null };

/** Créer un sondage (staff/admin) avec ses candidats (choisis parmi les fiches). Démo : no-op. */
export async function createPoll(
  question: string,
  subtitle: string | null,
  candidates: NewCandidate[],
  opts?: { startsAt?: Date; endsAt?: Date | null },
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { data: poll, error } = await supabase
    .from('polls')
    .insert({
      scope: 'both',
      question,
      subtitle,
      status: 'open',
      starts_at: (opts?.startsAt ?? new Date()).toISOString(),
      ends_at: opts?.endsAt ? opts.endsAt.toISOString() : null,
    })
    .select('id')
    .single();
  if (error || !poll) throw error ?? new Error('création impossible');
  const rows = candidates
    .map((c, i) => ({
      poll_id: (poll as any).id,
      name: c.name.trim(),
      photo_url: c.photoUrl ?? null,
      subtitle: c.subtitle ?? null,
      sort_order: i + 1,
    }))
    .filter((r) => r.name.length > 0);
  if (rows.length) {
    const { error: e2 } = await supabase.from('poll_candidates').insert(rows);
    if (e2) throw e2;
  }
}
