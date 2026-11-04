import { useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Empty, ErrorView, Grid, Loader, ProductCard, Screen, useFetch } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export default function Favoris() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(user ? '/wishlist' : null);
  useFocusEffect(useCallback(() => { if (user) reload(true); }, [user, reload]));

  if (!user) return <Empty icon="heart" title="Vos coups de cœur" text="Connectez-vous pour retrouver vos favoris sur tous vos appareils." action="Se connecter" onAction={() => router.push('/connexion')} />;
  if (loading) return <Loader />;
  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data.length) return <Empty icon="heart" title="Aucun favori" text="Touchez le cœur d’un article pour le retrouver ici." action="Explorer" onAction={() => router.push('/catalogue')} />;
  return <Screen><Grid data={data} renderItem={(p) => <ProductCard p={p} />} /></Screen>;
}
