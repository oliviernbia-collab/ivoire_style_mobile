import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Chip, Empty, ErrorView, Loader, styles as ui, useFetch } from '../components/ui';
import { ChipRow, PERIODS, periodFrom, SearchBox } from '../components/Filters';
import { useFeedback } from '../context/FeedbackContext';
import { api } from '../lib/api';
import { date } from '../lib/format';
import { colors, radius } from '../lib/theme';
import { useLive } from '../context/RealtimeContext';

// Mêmes catégories que l'API (et le site web) ; icône de chaque notification selon sa catégorie
const CATEGORIES = [
  ['orders', 'Commandes', 'box-open'], ['payments', 'Paiements', 'credit-card'], ['refunds', 'Remboursements', 'rotate-left'],
  ['payouts', 'Reversements', 'hand-holding-dollar'], ['shop', 'Boutique', 'store'], ['promotions', 'Promotions', 'gift'],
  ['other', 'Autres', 'bell'],
];
const TYPE_CATEGORY = {
  order: 'orders', seller_order: 'orders', return: 'orders', payment: 'payments', refund: 'refunds', payout: 'payouts',
  seller: 'shop', seller_request: 'shop', moderation: 'shop', promotion: 'promotions',
};
const ICON = Object.fromEntries(CATEGORIES.map(([k, , icon]) => [k, icon]));

// Les liens des notifications sont ceux du site web : correspondance vers les écrans mobiles
function mobileRoute(link) {
  if (!link) return null;
  const m = link.match(/^\/compte\/commandes\/(\d+)/);
  if (m) return `/commandes/${m[1]}`;
  if (link.startsWith('/vendeur')) return '/vendeur';
  if (link === '/compte/avantages') return '/avantages';
  return null;
}

export default function Notifications() {
  const [f, setF] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const query = { category: f.category, status: f.status, q: f.q, from: periodFrom(f.period) };
  const { data, meta, loading, error, reload } = useFetch('/account/notifications', query);
  // Pages suivantes, chargées en bas de liste (remises à zéro à chaque changement de filtre)
  const [more, setMore] = useState({ key: null, items: [], page: 1, busy: false });
  const key = JSON.stringify(query);
  const extra = more.key === key ? more : { key, items: [], page: 1, busy: false };
  const { bottom } = useSafeAreaInsets();
  useLive('*', () => { setMore({ key: null, items: [], page: 1, busy: false }); reload(true); });
  const { notify } = useFeedback();
  if (loading && !data) return <Loader />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;

  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v || undefined }));
  const activeCount = ['status', 'period'].filter((k) => f[k]).length;
  const items = [...(data?.items || []), ...extra.items];
  const pages = meta?.pages || 1;

  const loadMore = async () => {
    if (extra.busy || extra.page >= pages) return;
    setMore({ ...extra, busy: true });
    try {
      const r = await api.get('/account/notifications', { ...query, page: extra.page + 1 });
      setMore({ key, items: [...extra.items, ...r.data.items], page: extra.page + 1, busy: false });
    } catch (e) {
      setMore({ ...extra, busy: false });
      notify.error(e.message);
    }
  };
  const refresh = () => { setMore({ key: null, items: [], page: 1, busy: false }); reload(); };
  const readAll = async () => { const r = await api.post('/account/notifications/read-all'); notify.success(r.message); refresh(); };
  const open = async (n) => {
    if (!n.read_at) await api.patch(`/account/notifications/${n.id}/read`).catch(() => {});
    const to = mobileRoute(n.link);
    if (to) router.push(to); else refresh();
  };

  const counts = data?.counts || {};
  const header = (
    <View>
      <View style={ui.row}>
        <View style={{ flex: 1 }}><SearchBox value={f.q} onSubmit={set('q')} placeholder="Rechercher une notification" /></View>
        <View style={{ marginBottom: 10 }}>
          <Chip label={activeCount ? `Filtres (${activeCount})` : 'Filtres'} icon="sliders" on={showFilters} onPress={() => setShowFilters((s) => !s)} />
        </View>
      </View>
      <ChipRow value={f.category} onChange={set('category')}
        options={[['', 'Toutes', counts.all], ...CATEGORIES.filter(([k]) => counts[k] > 0 || f.category === k).map(([k, l]) => [k, l, counts[k]])]} />
      {showFilters && (
        <View style={[ui.card, { gap: 4 }]}>
          <Text style={ui.label}>État</Text>
          <ChipRow value={f.status} onChange={set('status')} options={[['', 'Toutes'], ['unread', 'Non lues'], ['read', 'Lues']]} />
          <Text style={ui.label}>Période</Text>
          <ChipRow value={f.period} onChange={set('period')} options={PERIODS} />
          {activeCount > 0 && <View style={{ alignSelf: 'flex-start' }}><Chip label="Tout effacer" icon="xmark" onPress={() => setF((s) => ({ q: s.q, category: s.category }))} /></View>}
        </View>
      )}
      {meta && <Text style={[ui.small, { marginBottom: 10 }]}>{meta.total} notification(s){data.unread ? ` · ${data.unread} non lue(s) au total` : ''}</Text>}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerRight: () => (data?.unread > 0 ? <Pressable onPress={readAll}><Text style={ui.link}>Tout lire</Text></Pressable> : null) }} />
      <FlatList
        style={ui.screen}
        contentContainerStyle={{ padding: 16, paddingBottom: 16 + bottom }}
        data={items}
        keyExtractor={(n) => String(n.id)}
        ListHeaderComponent={header}
        refreshing={false}
        onRefresh={refresh}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        ListFooterComponent={extra.busy ? <ActivityIndicator color={colors.gold} style={{ marginTop: 12 }} /> : null}
        ListEmptyComponent={<Empty icon="envelope-open" title="Aucune notification"
          text={f.q || f.category || activeCount ? 'Aucune notification ne correspond à ces filtres.' : undefined} />}
        renderItem={({ item: n }) => (
          <Pressable onPress={() => open(n)} style={[ui.card, ui.row, { alignItems: 'flex-start', backgroundColor: n.read_at ? '#fff' : colors.goldSoft, borderColor: n.read_at ? colors.line : colors.goldLight }]}>
            <View style={{ width: 38, height: 38, borderRadius: radius.pill, backgroundColor: n.read_at ? colors.line2 : colors.gold, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={ICON[TYPE_CATEGORY[n.type] || 'other']} size={15} color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: n.read_at ? '500' : '700', color: colors.ink }}>{n.title}</Text>
              {n.body && <Text style={ui.small}>{n.body}</Text>}
              <Text style={[ui.small, { marginTop: 4 }]}>{date(n.created_at, true)}</Text>
            </View>
          </Pressable>
        )}
      />
    </>
  );
}
