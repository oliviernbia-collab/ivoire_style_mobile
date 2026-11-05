import { FlatList, Pressable, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Empty, ErrorView, Loader, styles as ui, useFetch } from '../components/ui';
import { useFeedback } from '../context/FeedbackContext';
import { api } from '../lib/api';
import { date } from '../lib/format';
import { colors, radius } from '../lib/theme';
import { useLive } from '../context/RealtimeContext';

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
  const { data, loading, error, reload } = useFetch('/account/notifications');
  const { bottom } = useSafeAreaInsets();
  useLive('*', () => reload(true));
  const { notify } = useFeedback();
  if (loading) return <Loader />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const readAll = async () => { const r = await api.post('/account/notifications/read-all'); notify.success(r.message); reload(); };
  const open = async (n) => {
    if (!n.read_at) await api.patch(`/account/notifications/${n.id}/read`).catch(() => {});
    const to = mobileRoute(n.link);
    if (to) router.push(to); else reload();
  };

  return (
    <>
      <Stack.Screen options={{ headerRight: () => (data.unread > 0 ? <Pressable onPress={readAll}><Text style={ui.link}>Tout lire</Text></Pressable> : null) }} />
      <FlatList
        style={ui.screen}
        contentContainerStyle={{ padding: 16, paddingBottom: 16 + bottom }}
        data={data.items}
        keyExtractor={(n) => String(n.id)}
        refreshing={false}
        onRefresh={reload}
        ListEmptyComponent={<Empty icon="envelope-open" title="Aucune notification" />}
        renderItem={({ item: n }) => (
          <Pressable onPress={() => open(n)} style={[ui.card, ui.row, { alignItems: 'flex-start', backgroundColor: n.read_at ? '#fff' : colors.goldSoft, borderColor: n.read_at ? colors.line : colors.goldLight }]}>
            <View style={{ width: 38, height: 38, borderRadius: radius.pill, backgroundColor: n.read_at ? colors.line2 : colors.gold, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="bell" size={15} color={colors.ink} />
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
