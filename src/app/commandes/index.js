import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Empty, ErrorView, Loader, ProductImage, StatusBadge, styles as ui, useFetch } from '../../components/ui';
import { ChipRow, PERIODS, periodFrom, SearchBox } from '../../components/Filters';
import { PaymentLabel } from '../../components/PaymentLogo';
import { date, ORDER_STATUS, PAYMENT_PLANS, PAYMENT_STATUS, price, showPaymentStatus } from '../../lib/format';
import { colors, radius } from '../../lib/theme';
import { useLive } from '../../context/RealtimeContext';

// Groupes de statuts compris par l'API (GET /orders?status=…)
const GROUPS = [['', 'Toutes'], ['to_pay', 'À payer'], ['ongoing', 'En cours'], ['delivered', 'Livrées'], ['returns', 'Retours'], ['cancelled', 'Annulées']];

export default function Commandes() {
  const [f, setF] = useState({});
  const { data, meta, loading, error, reload } = useFetch('/orders', { limit: 50, status: f.status, q: f.q, from: periodFrom(f.period) });
  const { bottom } = useSafeAreaInsets();
  useLive(['order', 'payment', 'refund', 'return'], () => reload(true));
  if (loading && !data) return <Loader />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v || undefined }));
  const filtered = Boolean(f.status || f.q || f.period);

  const header = (
    <View>
      <SearchBox value={f.q} onSubmit={set('q')} placeholder="N° de commande ou boutique" />
      <ChipRow value={f.status} onChange={set('status')} options={GROUPS} />
      <ChipRow value={f.period} onChange={set('period')} options={PERIODS} />
      {meta && filtered && <Text style={[ui.small, { marginBottom: 10 }]}>{meta.total} commande(s)</Text>}
    </View>
  );

  return (
    <FlatList
      style={ui.screen}
      contentContainerStyle={{ padding: 16, paddingBottom: 16 + bottom }}
      data={data || []}
      keyExtractor={(o) => String(o.id)}
      ListHeaderComponent={header}
      refreshing={false}
      onRefresh={reload}
      ListEmptyComponent={filtered
        ? <Empty icon="filter" title="Aucune commande" text="Aucune commande ne correspond à ces filtres." />
        : <Empty icon="box-open" title="Aucune commande" text="Vos commandes apparaîtront ici." action="Commencer mes achats" onAction={() => router.push('/catalogue')} />}
      renderItem={({ item: o }) => (
        <Pressable style={[ui.card, ui.row, { alignItems: 'flex-start' }]} onPress={() => router.push(`/commandes/${o.id}`)}>
          <ProductImage uri={o.image} style={{ width: 56, height: 70, borderRadius: radius.sm }} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={ui.between}><Text style={ui.h3}>{o.order_number}</Text><Text style={{ fontWeight: '800' }}>{price(o.total_amount)}</Text></View>
            <Text style={ui.small}>{date(o.created_at, true)} · {o.item_count} article(s){o.shop_name ? ` · ${o.shop_name}` : ''}</Text>
            <PaymentLabel code={o.payment_method} size={20} textStyle={{ fontSize: 12 }} />
            {o.payment_plan ? <Text style={ui.small}>{PAYMENT_PLANS[o.payment_plan]}</Text> : null}
            {Number(o.balance_amount) > 0 && !o.balance_paid_at && !['cancelled', 'refunding', 'refunded'].includes(o.status) && (
              <Text style={[ui.small, { color: colors.goldDeep, fontWeight: '600' }]}>{price(o.balance_amount)} à régler au vendeur à la livraison</Text>
            )}
            <View style={[ui.row, { gap: 6, flexWrap: 'wrap' }]}><StatusBadge map={ORDER_STATUS} value={o.status} />{showPaymentStatus(o) && <StatusBadge map={PAYMENT_STATUS} value={o.payment_status} />}</View>
          </View>
        </Pressable>
      )}
    />
  );
}
