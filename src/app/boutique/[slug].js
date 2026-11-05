import { useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Icon } from '../../components/Icon';
import { Badge, Button, Chip, Empty, ErrorView, Grid, Loader, ProductCard, Screen, styles as ui, useFetch } from '../../components/ui';
import { ChipRow, SearchBox } from '../../components/Filters';
import { api, fileUrl } from '../../lib/api';
import { SORTS } from '../../lib/format';
import { colors } from '../../lib/theme';

const PAGE = 24;

export default function Boutique() {
  const { slug } = useLocalSearchParams();
  const shop = useFetch(`/shops/${slug}`);
  const [f, setF] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const query = { ...f, limit: PAGE };
  const products = useFetch(`/shops/${slug}/products`, query);
  const { data: opts } = useFetch('/products/filters', { shop: slug });
  // Pages suivantes (« Voir plus »), remises à zéro à chaque changement de filtre
  const key = JSON.stringify(query);
  const [more, setMore] = useState({ key: null, items: [], page: 1, busy: false });
  const extra = more.key === key ? more : { key, items: [], page: 1, busy: false };
  if (shop.loading) return <Loader />;
  if (shop.error) return <ErrorView message={shop.error} onRetry={shop.reload} />;
  const s = shop.data;

  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v || undefined }));
  const toggle = (k, v) => set(k)(f[k] === v ? undefined : v);
  const activeCount = ['size', 'color', 'in_stock', 'promo', 'new'].filter((k) => f[k]).length;
  const meta = products.meta;
  const items = [...(products.data || []), ...extra.items];
  const loadMore = async () => {
    setMore({ ...extra, busy: true });
    try {
      const r = await api.get(`/shops/${slug}/products`, { ...query, page: extra.page + 1 });
      setMore({ key, items: [...extra.items, ...r.data], page: extra.page + 1, busy: false });
    } catch {
      setMore({ ...extra, busy: false });
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: s.name }} />
      {s.banner_url ? (
        <Image source={{ uri: fileUrl(s.banner_url, { w: 1200 }) }} accessibilityLabel={`Bannière de ${s.name}`}
          style={{ width: '100%', aspectRatio: 4, borderRadius: 14, marginBottom: 12, backgroundColor: colors.goldSoft }} resizeMode="cover" />
      ) : null}
      <View style={[ui.card, { backgroundColor: colors.goldSoft, borderColor: colors.goldLight, alignItems: 'center' }]}>
        <View style={{ width: 80, height: 80, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.goldLight }}>
          {s.logo_url ? <Image source={{ uri: fileUrl(s.logo_url) }} style={{ width: 80, height: 80 }} /> : <Text style={{ fontSize: 30, fontWeight: '800', color: colors.goldDark }}>{s.name[0]}</Text>}
        </View>
        <Text style={[ui.h2, { marginTop: 10 }]}>{s.name}</Text>
        {s.is_official ? <View style={{ marginTop: 4 }}><Badge tone="gold" label="✓ Boutique officielle" /></View> : null}
        <Text style={ui.small}><Icon name="location-dot" size={11} color={colors.goldDark} /> {s.city}{s.commune ? `, ${s.commune}` : ''} · {s.product_count} article(s){s.rating ? ` · ★ ${s.rating}` : ''}</Text>
        <Text style={[ui.muted, { textAlign: 'center', marginTop: 8 }]}>{s.description}</Text>
      </View>

      <View style={ui.row}>
        <View style={{ flex: 1 }}><SearchBox value={f.q} onSubmit={set('q')} placeholder={`Rechercher chez ${s.name}`} /></View>
        <View style={{ marginBottom: 10 }}>
          <Chip label={activeCount ? `Filtres (${activeCount})` : 'Filtres'} icon="sliders" on={showFilters} onPress={() => setShowFilters((x) => !x)} />
        </View>
      </View>
      <ChipRow value={f.sort || 'newest'} onChange={set('sort')} options={Object.entries(SORTS)} />
      {showFilters && (
        <View style={[ui.card, { gap: 10 }]}>
          {opts?.sizes?.length > 0 && <>
            <Text style={ui.label}>Taille</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {opts.sizes.map((x) => <Chip key={x} label={x} on={f.size === x} onPress={() => toggle('size', x)} />)}
            </View>
          </>}
          {opts?.colors?.length > 0 && <>
            <Text style={ui.label}>Couleur</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {opts.colors.map((c) => <Chip key={c.color} label={c.color} swatch={c.hex || '#ddd'} on={f.color === c.color} onPress={() => toggle('color', c.color)} />)}
            </View>
          </>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip label="En stock" on={f.in_stock === '1'} onPress={() => toggle('in_stock', '1')} />
            <Chip label="Promotions" on={f.promo === '1'} onPress={() => toggle('promo', '1')} />
            <Chip label="Nouveautés" on={f.new === '1'} onPress={() => toggle('new', '1')} />
            {activeCount > 0 && <Chip label="Tout effacer" icon="xmark" onPress={() => setF((x) => ({ q: x.q, sort: x.sort }))} />}
          </View>
        </View>
      )}
      {meta && (f.q || activeCount > 0) ? <Text style={[ui.small, { marginBottom: 10 }]}>{meta.total} article(s)</Text> : null}

      {products.loading && !products.data ? <Loader />
        : products.error ? <ErrorView message={products.error} onRetry={products.reload} />
        : items.length ? <>
          <Grid data={items} renderItem={(p) => <ProductCard p={p} />} />
          {extra.busy ? <ActivityIndicator color={colors.gold} style={{ marginTop: 14 }} />
            : meta && extra.page < meta.pages && (
              <Button title="Voir plus d’articles" icon="chevron-down" variant="outline" onPress={loadMore} style={{ marginTop: 14 }} />
            )}
        </>
        : <Empty icon="shirt" title="Aucun article" text={f.q || activeCount ? 'Aucun article ne correspond à ces filtres.' : undefined} />}
    </Screen>
  );
}
