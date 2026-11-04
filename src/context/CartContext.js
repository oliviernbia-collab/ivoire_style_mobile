import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import { useFeedback } from './FeedbackContext';

const CartContext = createContext(null);
const EMPTY = { items: [], subtotal: 0, count: 0 };
const NO_FAVORITES = new Set();

export function CartProvider({ children }) {
  const { user } = useAuth();
  const { notify } = useFeedback();
  const [cart, setCart] = useState(EMPTY);
  const [favorites, setFavorites] = useState(new Set());

  const fetchAll = useCallback(async () => {
    const [c, w] = await Promise.all([api.get('/cart'), api.get('/wishlist')]);
    return { cart: c.data, favorites: new Set(w.data.map((p) => p.id)) };
  }, []);

  const apply = (r) => { setCart(r.cart); setFavorites(r.favorites); };

  const reload = useCallback(async () => {
    if (!user) return;
    try { apply(await fetchAll()); } catch { /* hors ligne : on garde l'état courant */ }
  }, [user, fetchAll]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    fetchAll().then((r) => active && apply(r)).catch(() => {});
    return () => { active = false; };
  }, [user, fetchAll]);

  const requireLogin = (msg) => { notify.info(msg); router.push('/connexion'); };

  const run = async (fn, silent = false) => {
    try {
      const res = await fn();
      if (res.data?.items) setCart(res.data);
      if (!silent && res.message) notify.success(res.message);
      return res;
    } catch (e) {
      notify.error(e.message);
      throw e;
    }
  };

  const add = (variantId, quantity = 1) => {
    if (!user) return requireLogin('Connectez-vous pour ajouter au panier');
    return run(() => api.post('/cart/items', { variant_id: variantId, quantity }));
  };
  const update = (id, body) => run(() => api.patch(`/cart/items/${id}`, body), true);
  const remove = (id) => run(() => api.del(`/cart/items/${id}`));

  const toggleFavorite = async (productId) => {
    if (!user) return requireLogin('Connectez-vous pour enregistrer vos favoris');
    const on = favorites.has(productId);
    try {
      const res = on ? await api.del(`/wishlist/items/${productId}`) : await api.post('/wishlist/items', { product_id: productId });
      setFavorites((prev) => { const n = new Set(prev); if (on) n.delete(productId); else n.add(productId); return n; });
      notify.success(res.message);
    } catch (e) { notify.error(e.message); }
  };

  return (
    // Visiteur déconnecté : panier et favoris vides (état dérivé, sans réinitialisation dans un effet)
    <CartContext.Provider value={{
      cart: user ? cart : EMPTY, reload, add, update, remove, favorites: user ? favorites : NO_FAVORITES, toggleFavorite,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
