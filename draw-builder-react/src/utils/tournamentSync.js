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

export async function createTournament(initialState) {
  const { data, error } = await supabase
    .from('tournaments')
    .insert({ data: initialState })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function loadTournament(id) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('data')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? data.data : null;
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
      (payload) => onRemoteChange(payload.new.data)
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
