import PublicView from './PublicView';
import Dashboard from './Dashboard';
import App from './App';
import AuthScreen from './components/AuthScreen';
import { supabaseEnabled } from './utils/supabase';
import { useAuthSession } from './utils/auth';

// Three destinations, chosen from the URL and (when accounts are
// configured) sign-in state:
//   ?view=watch&t=<id>  -> PublicView, always open, no login
//   no ?t=              -> Dashboard (your tournaments) once signed in
//   ?t=<id>             -> App (the editor) once signed in
// Without Supabase configured there's no account system at all, so the
// editor runs standalone against localStorage only, as it always has.
export default function Root() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('view') === 'watch') return <PublicView />;

  if (!supabaseEnabled) return <App user={null} />;

  const { status, user } = useAuthSession();
  const tournamentId = params.get('t');

  if (status === 'loading') return <div className="public-message"><h2>Loading…</h2></div>;
  if (status === 'anon') return <AuthScreen />;

  if (!tournamentId) return <Dashboard user={user} />;
  return <App user={user} />;
}
