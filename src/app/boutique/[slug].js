import { Image, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Icon } from '../../components/Icon';
import { Badge, Empty, ErrorView, Grid, Loader, ProductCard, Screen, styles as ui, useFetch } from '../../components/ui';
import { fileUrl } from '../../lib/api';
import { colors } from '../../lib/theme';

export default function Boutique() {
  const { slug } = useLocalSearchParams();
  const shop = useFetch(`/shops/${slug}`);
  const products = useFetch(`/shops/${slug}/products`, { limit: 40 });
  if (shop.loading) return <Loader />;
  if (shop.error) return <ErrorView message={shop.error} onRetry={shop.reload} />;
  const s = shop.data;
  return (
    <Screen>
      <Stack.Screen options={{ title: s.name }} />
      <View style={[ui.card, { backgroundColor: colors.goldSoft, borderColor: colors.goldLight, alignItems: 'center' }]}>
        <View style={{ width: 80, height: 80, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.goldLight }}>
          {s.logo_url ? <Image source={{ uri: fileUrl(s.logo_url) }} style={{ width: 80, height: 80 }} /> : <Text style={{ fontSize: 30, fontWeight: '800', color: colors.goldDark }}>{s.name[0]}</Text>}
        </View>
        <Text style={[ui.h2, { marginTop: 10 }]}>{s.name}</Text>
        {s.is_official ? <View style={{ marginTop: 4 }}><Badge tone="gold" label="✓ Boutique officielle" /></View> : null}
        <Text style={ui.small}><Icon name="location-dot" size={11} color={colors.goldDark} /> {s.city}{s.commune ? `, ${s.commune}` : ''} · {s.product_count} article(s){s.rating ? ` · ★ ${s.rating}` : ''}</Text>
        <Text style={[ui.muted, { textAlign: 'center', marginTop: 8 }]}>{s.description}</Text>
      </View>
      {products.loading ? <Loader /> : products.data?.length ? <Grid data={products.data} renderItem={(p) => <ProductCard p={p} />} />
        : <Empty icon="shirt" title="Aucun article" />}
    </Screen>
  );
}
