import { supabase } from './supabase';

const PARAM = 't';

export function getTournamentIdFromUrl() {
  return new URLSearchParams(window.location.search).get(PARAM);
}

export function setTournamentIdInUrl(id) {
  const url = new URL(window.location.href);
  url.searchParams.set(PARAM, id);
  window.history.replaceState({}, '', url);
}

export async function createTournament(initialState, ownerId, name) {
  const { data, error } = await supabase
    .from('tournaments')
    .insert({ data: initialState, owner_id: ownerId || null, name: name || 'Untitled tournament' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

// Merges the row's data blob with its owner/name so callers get one flat
// object — same shape subscribeTournament's realtime payload uses below.
function flattenRow(row) {
  if (!row) return null;
  return { ...row.data, ownerId: row.owner_id, tournamentName: row.name };
}

export async function loadTournament(id) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('data, owner_id, name')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return flattenRow(data);
}

// Every tournament this account owns, most recently updated first — the
// list shown on the dashboard.
export async function listMyTournaments(ownerId) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, name, updated_at, data')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function renameTournament(id, name) {
  const { error } = await supabase.from('tournaments').update({ name }).eq('id', id);
  if (error) throw error;
}

// Claims a legacy tournament (created before accounts existed, owner_id
// still null) for the signed-in user opening its edit link — the
// migration path for links shared before this app had logins. A no-op
// if the tournament is already owned by someone.
export async function claimTournament(id, ownerId) {
  const { error } = await supabase.from('tournaments').update({ owner_id: ownerId }).eq('id', id).is('owner_id', null);
  if (error) throw error;
}

export async function saveTournament(id, state) {
  const { error } = await supabase
    .from('tournaments')
    .update({ data: state, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// Fires onRemoteChange(state) whenever another connected client updates
// this tournament's row. Returns an unsubscribe function.
export function subscribeTournament(id, onRemoteChange) {
  const channel = supabase
    .channel(`tournament-${id}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` },
      (payload) => onRemoteChange(flattenRow({ data: payload.new.data, owner_id: payload.new.owner_id, name: payload.new.name }))
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// Tracks who else currently has this tournament's edit link open, so
// simultaneous editors are visible to each other instead of silently
// clobbering one another's changes. onSync(list) fires with everyone
// present (including yourself) whenever the roster changes.
export function subscribePresence(id, me, onSync) {
  const channel = supabase.channel(`presence-${id}`, {
    config: { presence: { key: me.editorId } },
  });
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const editors = Object.values(state)
        .map((entries) => entries[0])
        .filter(Boolean);
      onSync(editors);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') channel.track(me);
    });
  return () => supabase.removeChannel(channel);
}
