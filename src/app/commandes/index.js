import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Empty, ErrorView, Loader, ProductImage, StatusBadge, styles as ui, useFetch } from '../../components/ui';
import { PaymentLabel } from '../../components/PaymentLogo';
import { date, ORDER_STATUS, PAYMENT_PLANS, PAYMENT_STATUS, price, showPaymentStatus } from '../../lib/format';
import { colors, radius } from '../../lib/theme';

export default function Commandes() {
  const { data, loading, error, reload } = useFetch('/orders', { limit: 50 });
  if (loading) return <Loader />;
  if (error) return <ErrorView message={error} onRetry={reload} />;
  return (
    <FlatList
      style={ui.screen}
      contentContainerStyle={{ padding: 16 }}
      data={data}
      keyExtractor={(o) => String(o.id)}
      refreshing={false}
      onRefresh={reload}
      ListEmptyComponent={<Empty icon="box-open" title="Aucune commande" text="Vos commandes apparaîtront ici." action="Commencer mes achats" onAction={() => router.push('/catalogue')} />}
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
