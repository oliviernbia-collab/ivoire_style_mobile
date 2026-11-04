import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

/**
 * URL de l'API : EXPO_PUBLIC_API_URL si défini, sinon l'IP de la machine qui sert le bundle
 * (le téléphone ne peut pas joindre « localhost »).
 */
function resolveBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (Platform.OS === 'web' || !host) return 'http://localhost:5000';
  return `http://${host}:5000`;
}

export const SERVER_URL = resolveBaseUrl();
export const API_URL = `${SERVER_URL}/api/v1`;

const CLOUDINARY = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/)(.*)$/;

/** URL d'un média ; pour Cloudinary : format/qualité automatiques et largeur adaptée (w). */
export function fileUrl(u, { w } = {}) {
  if (!u) return null;
  const m = u.match(CLOUDINARY);
  if (m && m[2] === 'image') return `${m[1]}f_auto,q_auto${w ? `,c_limit,w_${w}` : ''}/${m[3]}`;
  if (m) return `${m[1]}q_auto/${m[3]}`;
  return /^https?:\/\//.test(u) ? u : `${SERVER_URL}${u}`;
}

/** Aperçu JPEG d'une vidéo Cloudinary. */
export function videoPoster(u, w = 600) {
  const m = (u || '').match(CLOUDINARY);
  if (!m || m[2] !== 'video') return null;
  return `${m[1]}so_1,f_jpg,q_auto,c_limit,w_${w}/${m[3].replace(/\.[a-z0-9]+$/i, '.jpg')}`;
}

// Jetons : stockage sécurisé (Keychain / Keystore), localStorage sur le web
const store = {
  async get(k) { return Platform.OS === 'web' ? globalThis.localStorage?.getItem(k) : SecureStore.getItemAsync(k); },
  async set(k, v) { return Platform.OS === 'web' ? globalThis.localStorage?.setItem(k, v) : SecureStore.setItemAsync(k, v); },
  async del(k) { return Platform.OS === 'web' ? globalThis.localStorage?.removeItem(k) : SecureStore.deleteItemAsync(k); },
};

let access = null;
let refresh = null;
let onExpired = () => {};

export const tokens = {
  async load() {
    access = await store.get('ivs_access');
    refresh = await store.get('ivs_refresh');
    return Boolean(access || refresh);
  },
  async set({ access_token, refresh_token }) {
    if (access_token) { access = access_token; await store.set('ivs_access', access_token); }
    if (refresh_token) { refresh = refresh_token; await store.set('ivs_refresh', refresh_token); }
  },
  async clear() {
    access = null; refresh = null;
    await store.del('ivs_access');
    await store.del('ivs_refresh');
  },
  get refresh() { return refresh; },
  get access() { return access; },
};

export const setSessionExpiredHandler = (fn) => { onExpired = fn; };

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors || {};
  }
}

let refreshing = null;
async function doRefresh() {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) throw new Error('refresh');
  const json = await res.json();
  await tokens.set(json.data);
}

/** Appel API JSON ou multipart (body FormData). Renvoie { data, meta, message }. */
// Heure de la dernière action de l'utilisateur : évite d'afficher en double la notification
// temps réel d'une action qu'il vient lui-même de faire
let lastActionAt = 0;
export const recentOwnAction = (ms = 4000) => Date.now() - lastActionAt < ms;

async function request(method, path, { body, params, retry = true } = {}) {
  if (method !== 'GET') lastActionAt = Date.now();
  const qs = params ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString()}` : '';
  const headers = { Accept: 'application/json' };
  if (access) headers.Authorization = `Bearer ${access}`;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body && !isForm) headers['Content-Type'] = 'application/json';
  const controller = new AbortController();
  // Envois de fichiers (relayés vers Cloudinary) : délai plus long
  const timer = setTimeout(() => controller.abort(), isForm ? 120000 : 20000);
  let res;
  try {
    res = await fetch(`${API_URL}${path}${qs}`, {
      method, headers, body: body ? (isForm ? body : JSON.stringify(body)) : undefined, signal: controller.signal,
    });
  } catch {
    throw new ApiError('Connexion impossible. Vérifiez votre réseau et réessayez.', 0);
  } finally {
    clearTimeout(timer);
  }
  // Seules les routes d'identification sont exclues du renouvellement (pas /auth/me, /auth/me/avatar…)
  if (res.status === 401 && retry && refresh && !/^\/auth\/(login|register|refresh|logout|forgot-password|reset-password)\b/.test(path)) {
    try {
      refreshing = refreshing || doRefresh().finally(() => { refreshing = null; });
      await refreshing;
      return request(method, path, { body, params, retry: false });
    } catch {
      await tokens.clear();
      onExpired();
    }
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.message || 'Une erreur est survenue', res.status, json.errors);
  return json;
}

export const api = {
  get: (p, params) => request('GET', p, { params }),
  post: (p, body) => request('POST', p, { body }),
  put: (p, body) => request('PUT', p, { body }),
  patch: (p, body) => request('PATCH', p, { body }),
  del: (p) => request('DELETE', p),
};
