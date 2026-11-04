import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, TextInput, View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Icon } from '../../components/Icon';
import { Chip, Empty, ErrorView, ProductCard, styles as ui, useFetch } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { AUDIENCES, SORTS } from '../../lib/format';
import { colors, radius } from '../../lib/theme';

export default function Catalogue() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [filters, setFilters] = useState(() => ({ ...params }));
  const [q, setQ] = useState(params.q || '');
  const [result, setResult] = useState({ key: null, items: [], meta: null, error: null });
  const [showFilters, setShowFilters] = useState(false);
  const { data: categories } = useFetch('/categories');
  const { data: opts } = useFetch('/products/filters');

  // Paramètres reçus depuis l'accueil (catégorie, recherche, tri…) : on réinitialise les filtres
  const paramsKey = JSON.stringify(params);
  const [prevParamsKey, setPrevParamsKey] = useState(paramsKey);
  if (paramsKey !== prevParamsKey) {
    setPrevParamsKey(paramsKey);
    setFilters({ ...params });
    setQ(params.q || '');
  }

  const filtersKey = JSON.stringify([filters, user?.id]);
  const loading = result.key !== filtersKey;
  const { items, meta, error } = result;

  const fetchPage = useCallback((page) => api.get('/products', { ...filters, page, limit: 12 }), [filters]);

  // Pagination et actualisation (gestionnaires d'événements)
  const load = async (page = 1) => {
    try {
      const res = await fetchPage(page);
      setResult((prev) => ({ key: filtersKey, items: page === 1 ? res.data : [...prev.items, ...res.data], meta: res.meta, error: null }));
    } catch (e) {
      setResult({ key: filtersKey, items: [], meta: null, error: e.message });
    }
  };

  // Première page à chaque changement de filtres
  useEffect(() => {
    let active = true;
    fetchPage(1)
      .then((res) => active && setResult({ key: filtersKey, items: res.data, meta: res.meta, error: null }))
      .catch((e) => active && setResult({ key: filtersKey, items: [], meta: null, error: e.message }));
    return () => { active = false; };
  }, [fetchPage, filtersKey]);

  const toggle = (k, v) => setFilters((f) => { const n = { ...f }; if (n[k] === v) delete n[k]; else n[k] = v; return n; });
  const activeCount = Object.keys(filters).filter((k) => !['sort', 'q'].includes(k)).length;

  const header = (
    <View style={{ gap: 10, marginBottom: 12 }}>
      <View style={ui.row}>
        <View style={[ui.inputBox, { flex: 1, borderRadius: radius.pill }]}>
          <Icon name="magnifying-glass" size={15} color={colors.muted} />
          <TextInput style={ui.input} value={q} onChangeText={setQ} placeholder="Rechercher un vêtement" placeholderTextColor="#A8A8A8"
            returnKeyType="search" onSubmitEditing={() => setFilters((f) => ({ ...f, q: q || undefined }))} />
        </View>
        <Chip label={activeCount ? `Filtres (${activeCount})` : 'Filtres'} icon="sliders" on={showFilters} onPress={() => setShowFilters((s) => !s)} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {Object.entries(SORTS).map(([k, l]) => <Chip key={k} label={l} on={(filters.sort || 'newest') === k} onPress={() => setFilters((f) => ({ ...f, sort: k }))} />)}
      </ScrollView>
      {showFilters && (
        <View style={[ui.card, { gap: 10, marginBottom: 0 }]}>
          <Text style={ui.label}>Catégorie</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {categories?.map((c) => <Chip key={c.id} label={c.name} icon={c.icon} on={filters.category === c.slug} onPress={() => toggle('category', c.slug)} />)}
          </View>
          <Text style={ui.label}>Public</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(AUDIENCES).map(([k, l]) => <Chip key={k} label={l} on={filters.audience === k} onPress={() => toggle('audience', k)} />)}
          </View>
          {opts?.sizes?.length > 0 && <>
            <Text style={ui.label}>Taille</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {opts.sizes.map((s) => <Chip key={s} label={s} on={filters.size === s} onPress={() => toggle('size', s)} />)}
            </View>
          </>}
          {opts?.colors?.length > 0 && <>
            <Text style={ui.label}>Couleur</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {opts.colors.map((c) => <Chip key={c.color} label={c.color} swatch={c.hex || '#ddd'} on={filters.color === c.color} onPress={() => toggle('color', c.color)} />)}
            </View>
          </>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip label="En stock" on={filters.in_stock === '1'} onPress={() => toggle('in_stock', '1')} />
            <Chip label="Promotions" on={filters.promo === '1'} onPress={() => toggle('promo', '1')} />
            <Chip label="Nouveautés" on={filters.new === '1'} onPress={() => toggle('new', '1')} />
            {activeCount > 0 && <Chip label="Tout effacer" icon="xmark" onPress={() => setFilters({ sort: filters.sort })} />}
          </View>
        </View>
      )}
      {meta && <Text style={ui.small}>{meta.total} article(s)</Text>}
    </View>
  );

  return (
    <FlatList
      style={ui.screen}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      data={loading ? [] : items}
      keyExtractor={(p) => String(p.id)}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListHeaderComponent={header}
      renderItem={({ item }) => <View style={{ flex: 1 / 2 }}><ProductCard p={item} /></View>}
      onEndReachedThreshold={0.4}
      onEndReached={() => meta && meta.page < meta.pages && !loading && load(meta.page + 1)}
      refreshing={false}
      onRefresh={() => load(1)}
      extraData={filtersKey}
      ListEmptyComponent={loading ? <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
        : error ? <ErrorView message={error} onRetry={() => load(1)} />
        : <Empty icon="shirt" title="Aucun vêtement trouvé" text="Essayez d’élargir vos critères." />}
      ListFooterComponent={meta && meta.page < meta.pages ? <ActivityIndicator color={colors.gold} style={{ marginTop: 16 }} /> : null}
    />
  );
}
