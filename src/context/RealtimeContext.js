import { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { api, recentOwnAction, SERVER_URL, tokens } from '../lib/api';
import { useAuth } from './AuthContext';
import { useFeedback } from './FeedbackContext';

/**
 * Temps réel : connexion Socket.IO tant que l'utilisateur est connecté.
 * « notification » : bandeau + rechargement des écrans abonnés (useLive).
 */
const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  const { notify } = useFeedback();
  const listeners = useRef(new Set());
  const notifyRef = useRef(notify);
  useEffect(() => { notifyRef.current = notify; }, [notify]);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return undefined;
    const socket = io(SERVER_URL, {
      path: '/api/v1/realtime',
      transports: ['websocket'], // React Native : WebSocket direct (pas de long polling)
      auth: (cb) => cb({ token: tokens.access }), // jeton relu à chaque (re)connexion
    });
    let retries = 0;
    socket.on('connect', () => { retries = 0; });
    socket.on('connect_error', (err) => {
      // Jeton expiré : un appel à l'API le renouvelle, puis on se reconnecte
      if (err.message === 'unauthorized' && retries < 3) {
        retries += 1;
        api.get('/auth/me').then(() => socket.connect()).catch(() => {});
      }
    });
    socket.on('notification', (n) => {
      if (!recentOwnAction()) notifyRef.current.info(n.title);
      listeners.current.forEach((l) => l(n));
    });
    return () => { socket.disconnect(); };
  }, [userId]);

  return <RealtimeContext.Provider value={listeners}>{children}</RealtimeContext.Provider>;
}

/** Recharge un écran quand une notification le concerne. types : liste de types, ou '*' pour tous. */
export function useLive(types, callback) {
  const listeners = useContext(RealtimeContext);
  const cb = useRef(callback);
  useEffect(() => { cb.current = callback; }, [callback]);
  const key = Array.isArray(types) ? types.join(',') : types;
  useEffect(() => {
    if (!listeners) return undefined;
    let timer = null;
    const wanted = key === '*' ? null : key.split(',');
    const listener = (n) => {
      if (wanted && !wanted.includes(n.type)) return;
      clearTimeout(timer);
      timer = setTimeout(() => cb.current(n), 400);
    };
    const set = listeners.current;
    set.add(listener);
    return () => { clearTimeout(timer); set.delete(listener); };
  }, [listeners, key]);
}
