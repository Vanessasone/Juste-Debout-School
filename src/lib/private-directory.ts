import { supabase } from '@/lib/supabase';

export type DirectoryInput = {
  external_key: string; campus: 'CORE' | 'INDUSTRY'; person_type: 'student' | 'teacher';
  first_name: string; last_name: string; email: string | null; phone: string | null;
  cohort: string | null; file_code: string | null;
};
export type DirectoryPerson = DirectoryInput & { id: string; review_status: 'pending' | 'verified' };

/** CSV paste accepts comma, semicolon or spreadsheet tabs, including quoted cells. */
export function parseDirectoryCsv(input: string): DirectoryInput[] {
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const first = text.split('\n')[0] ?? '';
  const delimiter = first.includes('\t') ? '\t' : first.includes(';') ? ';' : ',';
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (!quoted && (ch === delimiter || ch === '\n')) {
      row.push(cell.trim()); cell = '';
      if (ch === '\n') { if (row.some(Boolean)) rows.push(row); row = []; }
    } else cell += ch;
  }
  if (quoted) throw new Error('Guillemet non fermé dans le fichier.');
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift()?.map(s => s.toLowerCase()) ?? [];
  for (const key of ['prenom', 'nom', 'campus', 'type']) {
    if (!headers.includes(key)) throw new Error(`Colonne manquante : ${key}`);
  }
  if (!rows.length) throw new Error('Aucune fiche à importer.');
  if (rows.length > 500) throw new Error('Limite : 500 fiches par import.');
  const seen = new Set<string>();
  return rows.map((r, i) => {
    if (r.length !== headers.length) throw new Error(`Ligne ${i + 2} : nombre de colonnes incorrect.`);
    const get = (key: string) => r[headers.indexOf(key)]?.trim() ?? '';
    const first_name = get('prenom'); const last_name = get('nom');
    const campus = get('campus').toUpperCase(); const person_type = get('type').toLowerCase();
    if (!first_name || !last_name) throw new Error(`Ligne ${i + 2} : prénom et nom requis.`);
    if (campus !== 'CORE' && campus !== 'INDUSTRY') throw new Error(`Ligne ${i + 2} : campus CORE ou INDUSTRY requis.`);
    if (person_type !== 'student' && person_type !== 'teacher') throw new Error(`Ligne ${i + 2} : type student ou teacher requis.`);
    const email = get('email').toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`Ligne ${i + 2} : email invalide.`);
    const cohort = get('promo') || null; const file_code = get('dossier') || null;
    const external_key = JSON.stringify([campus, person_type, cohort, file_code || [first_name.toLowerCase(), last_name.toLowerCase()]]);
    if (seen.has(external_key)) throw new Error(`Ligne ${i + 2} : doublon dans l’import.`);
    seen.add(external_key);
    return { external_key, campus, person_type, first_name, last_name, email, phone: get('telephone') || null, cohort, file_code };
  });
}

export async function getPrivateDirectory(): Promise<DirectoryPerson[]> {
  const { data, error } = await supabase.from('jds_private_directory').select('*').order('first_name').order('last_name').limit(1000);
  if (error) throw error;
  return data ?? [];
}
export async function importPrivateDirectory(rows: DirectoryInput[]): Promise<void> {
  const { error } = await supabase.from('jds_private_directory').upsert(rows.map(row => ({ ...row, review_status: 'pending' })), { onConflict: 'external_key' });
  if (error) throw error;
}

export async function verifyDirectoryPerson(id: string): Promise<void> {
  const { error } = await supabase.from('jds_private_directory').update({ review_status: 'verified' }).eq('id', id);
  if (error) throw error;
}
