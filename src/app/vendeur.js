import { useState } from 'react';
import { Linking, Pressable, RefreshControl, Share, Text, TextInput, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Icon } from '../components/Icon';
import {
  Badge, Button, Card, Empty, ErrorView, Loader, ProductImage, Screen, StatusBadge, styles as ui, useFetch,
} from '../components/ui';
import { ChipRow, PERIODS, periodFrom, SearchBox } from '../components/Filters';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { api, SERVER_URL } from '../lib/api';
import { date, ORDER_STATUS, PAYMENT_PLANS, PRODUCT_STATUS, price } from '../lib/format';
import { colors, radius } from '../lib/theme';
import { useLive } from '../context/RealtimeContext';

const WEB_URL = SERVER_URL.replace(':5000', ':5173');

/**
 * Ouvre une page de l'espace vendeur web connectée au compte de l'application : le navigateur du téléphone a sa
 * propre session (parfois un autre compte). Un code à usage unique (2 min) est échangé par le site contre une session.
 */
async function openSellerWeb(path) {
  try {
    const { data } = await api.post('/auth/handoff');
    await Linking.openURL(`${WEB_URL}/connexion-app?next=${encodeURIComponent(path)}#${data.code}`);
  } catch {
    await Linking.openURL(`${WEB_URL}${path}`);
  }
}

/** Lien de la vitrine : les clients qui l'ouvrent ne voient que les articles de cette boutique. */
function ShopLink({ shop }) {
  const { notify } = useFeedback();
  const url = `${WEB_URL}/b/${shop.slug}`;
  const share = async () => {
    try { await Share.share({ message: `Découvrez ${shop.name} sur Ivoire Style : ${url}`, url }); } catch (e) { notify.error(e.message); }
  };
  return (
    <Card>
      <Text style={[ui.h3, { marginBottom: 4 }]}><Icon name="link" size={13} color={colors.gold} />  Lien de ma boutique</Text>
      <Text style={[ui.small, { marginBottom: 8 }]}>Partagez-le dans vos publicités : vos clients n’y verront que vos articles.</Text>
      <Text selectable style={{ backgroundColor: colors.goldSoft, color: colors.goldDeep, padding: 10, borderRadius: 8, fontWeight: '600' }}>{url}</Text>
      <View style={[ui.row, { marginTop: 10 }]}>
        <Button title="Partager" icon="share-nodes" size="sm" block={false} onPress={share} />
        <Button title="Ouvrir" icon="up-right-from-square" size="sm" variant="outline" block={false} onPress={() => Linking.openURL(url)} />
      </View>
    </Card>
  );
}

const NEXT_LABELS = { preparing: 'Mettre en préparation', ready: 'Prête à expédier', shipped: 'Marquer expédiée', in_delivery: 'En livraison', delivered: 'Marquer livrée' };

function Stat({ icon, label, value }) {
  return (
    <View style={{ width: '48%', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, gap: 6 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={14} color={colors.goldDark} /></View>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>{value}</Text>
      <Text style={ui.small}>{label}</Text>
    </View>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const { data: d, loading, error, reload } = useFetch('/seller/dashboard');
  useLive(['seller_order', 'order', 'return', 'payout', 'refund', 'moderation'], () => reload(true));
  if (loading) return <Loader />;
  if (error) return <ErrorView message={error} onRetry={reload} />;
  return (
    <>
      {user.shop?.is_official && (
        <Card style={{ backgroundColor: colors.goldSoft, borderColor: colors.goldLight }}>
          <Text style={{ color: colors.goldDeep }}><Icon name="circle-check" size={12} color={colors.goldDeep} />  <Text style={{ fontWeight: '700' }}>Boutique officielle</Text> : sans commission, produits publiés immédiatement.</Text>
        </Card>
      )}
      {d.promotions?.map((p) => (
        <Card key={p.id} style={{ backgroundColor: colors.successBg, borderColor: '#CDE8D8' }}>
          <Text style={{ color: colors.success, fontWeight: '700' }}><Icon name="gift" size={13} color={colors.success} />  {p.title}</Text>
          <Text style={{ color: colors.success, marginTop: 4 }}>
            {p.feature_shops ? 'Boutique mise en avant sur l’accueil' : 'Avantage vendeur'}{p.ends_at ? ` jusqu’au ${date(p.ends_at)}` : ''}. Merci pour votre activité !
          </Text>
        </Card>
      ))}
      {!d.payout_ready && (
        <Card style={{ backgroundColor: colors.warningBg, borderColor: '#F3DDB0' }}>
          <Text style={{ color: colors.warning, marginBottom: 10 }}>Renseignez le compte qui recevra votre argent (opérateur, numéro et titulaire) pour être payé après vos ventes.</Text>
          <Button title="Compléter dans l’espace web" icon="up-right-from-square" size="sm" variant="outline"
            onPress={() => openSellerWeb('/vendeur/boutique#paiement')} />
        </Card>
      )}
      <ShopLink shop={user.shop} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', marginBottom: 14 }}>
        <Stat icon="chart-line" label="Mes ventes (mon prix)" value={price(d.gross_sales)} />
        <Stat icon="box-open" label="Commandes" value={d.orders_count} />
        <Stat icon="clock" label="À préparer" value={d.to_prepare} />
        <Stat icon="shirt" label="En ligne" value={`${d.products.published}/${d.products.total}`} />
        <Stat icon="money-bill-wave" label={`À encaisser à la livraison (${d.to_collect_orders})`} value={price(d.to_collect)} />
        <Stat icon="hand-holding-dollar" label="À recevoir de la plateforme" value={price(d.balance)} />
      </View>
      <Card>
        <Text style={[ui.h3, { marginBottom: 8 }]}><Icon name="triangle-exclamation" size={13} color={colors.gold} />  Stocks faibles</Text>
        {d.low_stock.length === 0 ? <Text style={ui.small}>Tous vos stocks sont suffisants.</Text> : d.low_stock.map((v) => (
          <View key={v.id} style={[ui.between, { paddingVertical: 4 }]}>
            <Text style={[ui.small, { flex: 1 }]}>{v.name} ({v.size}/{v.color})</Text>
            <Badge label={String(v.stock_quantity)} tone={v.stock_quantity === 0 ? 'danger' : 'warning'} />
          </View>
        ))}
      </Card>
    </>
  );
}

function Orders() {
  const [status, setStatus] = useState('confirmed');
  const [f, setF] = useState({});
  const { data, meta, loading, error, reload } = useFetch('/seller/orders', { status, limit: 30, q: f.q, from: periodFrom(f.period) });
  useLive(['seller_order', 'order', 'return', 'payout', 'refund', 'moderation'], () => reload(true));
  const { notify, confirm } = useFeedback();
  const [ship, setShip] = useState({});

  const advance = async (item, next, order) => {
    let extra = {};
    // Livraison avec solde : le vendeur confirme l'avoir encaissé auprès du client
    if (next === 'delivered' && order.balance_due > 0) {
      const ok = await confirm({
        title: `Avez-vous encaissé ${price(order.balance_due)} ?`,
        message: `Solde de la commande ${order.order_number} réglé par le client à la livraison (espèces ou Mobile Money).`,
        confirmLabel: 'Oui, solde encaissé', cancelLabel: 'Pas encore', icon: 'money-bill-wave',
      });
      if (!ok) return;
      extra = { balance_collected: true };
    }
    try {
      const body = { status: next, ...extra, ...(next === 'shipped' ? ship[item.order_id] || {} : {}) };
      const res = await api.patch(`/seller/order-items/${item.id}/status`, body);
      notify.success(res.message);
      reload();
    } catch (e) { notify.error(e.message); }
  };

  return (
    <>
      <SearchBox value={f.q} onSubmit={(q) => setF((s) => ({ ...s, q }))} placeholder="N° de commande, client ou téléphone" />
      <ChipRow value={status} onChange={setStatus}
        options={[['confirmed', 'À traiter'], ['preparing', 'Préparation'], ['ready', 'Prêtes'], ['shipped', 'Expédiées'], ['in_delivery', 'En livraison'], ['delivered', 'Livrées'], ['', 'Toutes']]} />
      <ChipRow value={f.period} onChange={(period) => setF((s) => ({ ...s, period: period || undefined }))} options={PERIODS} />
      {meta && (f.q || f.period) ? <Text style={[ui.small, { marginBottom: 10 }]}>{meta.total} commande(s)</Text> : null}
      {loading ? <Loader /> : error ? <ErrorView message={error} onRetry={reload} /> : data.length === 0
        ? <Empty icon="box-open" title="Aucune commande" text={f.q || f.period ? 'Aucune commande ne correspond à ces filtres.' : undefined} /> : data.map((o) => {
        const first = o.items[0];
        const next = first?.next_statuses?.[0];
        return (
          <Card key={o.id}>
            <View style={ui.between}><Text style={ui.h3}>{o.order_number}</Text><Text style={{ fontWeight: '800', color: colors.goldDark }}>{price(o.seller_amount)}</Text></View>
            {o.items.map((it) => (
              <View key={it.id} style={[ui.row, { marginTop: 8 }]}>
                <ProductImage uri={it.image_url} style={{ width: 42, height: 52, borderRadius: 6 }} />
                <View style={{ flex: 1 }}><Text style={{ fontWeight: '600' }}>{it.product_name}</Text><Text style={ui.small}>{it.size} · {it.color} · x{it.quantity}</Text></View>
                <StatusBadge map={ORDER_STATUS} value={it.fulfillment_status} />
              </View>
            ))}
            <View style={{ backgroundColor: colors.goldSoft, borderRadius: 8, padding: 10, marginTop: 10 }}>
              <Text style={ui.small}><Icon name="user" size={10} color={colors.goldDark} /> {o.ship_recipient} · {o.ship_phone}</Text>
              <Text style={ui.small}><Icon name="location-dot" size={10} color={colors.goldDark} /> {[o.ship_street, o.ship_district, o.ship_commune, o.ship_city].filter(Boolean).join(', ')}</Text>
            </View>
            <View style={{ marginTop: 8, gap: 2 }}>
              <Text style={ui.small}>{PAYMENT_PLANS[o.payment_plan]} · payé en ligne {price(o.upfront_amount)}</Text>
              {o.balance_due > 0 && <Text style={[ui.small, { color: colors.goldDeep, fontWeight: '700' }]}>À encaisser à la livraison : {price(o.balance_due)}</Text>}
              {Number(o.balance_amount) > 0 && o.balance_paid_at && <Text style={[ui.small, { color: colors.success }]}>Solde encaissé</Text>}
            </View>
            {next === 'shipped' && (
              <View style={[ui.row, { marginTop: 10 }]}>
                <TextInput style={[ui.inputBox, ui.input, { flex: 1 }]} placeholder="Livreur" placeholderTextColor="#A8A8A8"
                  onChangeText={(t) => setShip((s) => ({ ...s, [o.id]: { ...s[o.id], carrier: t } }))} />
                <TextInput style={[ui.inputBox, ui.input, { flex: 1 }]} placeholder="N° de suivi" placeholderTextColor="#A8A8A8"
                  onChangeText={(t) => setShip((s) => ({ ...s, [o.id]: { ...s[o.id], tracking_number: t } }))} />
              </View>
            )}
            {next && (
              <Button title={next === 'delivered' && o.balance_due > 0 ? `Livrée — ${price(o.balance_due)} encaissés` : NEXT_LABELS[next]}
                icon={next === 'shipped' ? 'truck-fast' : 'circle-check'} size="sm" onPress={() => advance(first, next, o)} style={{ marginTop: 10 }} />
            )}
          </Card>
        );
      })}
    </>
  );
}

function Products() {
  const { data, loading, error, reload } = useFetch('/seller/products', { limit: 50 });
  useLive(['moderation'], () => reload(true));
  if (loading) return <Loader />;
  if (error) return <ErrorView message={error} onRetry={reload} />;
  return (
    <>
      <Card style={{ backgroundColor: colors.goldSoft, borderColor: colors.goldLight }}>
        <Text style={[ui.small, { color: colors.goldDeep }]}>L’ajout et la modification détaillée des vêtements (photos, variantes) se font depuis l’espace vendeur web.</Text>
        <Button title="Ouvrir l’espace vendeur web" icon="up-right-from-square" size="sm" variant="outline" style={{ marginTop: 10 }}
          onPress={() => openSellerWeb('/vendeur/produits/nouveau')} />
      </Card>
      {data.length === 0 ? <Empty icon="shirt" title="Aucun vêtement" /> : data.map((p) => (
        <Card key={p.id} style={[ui.row, { padding: 10 }]}>
          <ProductImage uri={p.image} style={{ width: 52, height: 64, borderRadius: 8 }} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontWeight: '600' }} numberOfLines={1}>{p.name}</Text>
            <Text style={ui.small}>Prix client {price(p.price)} · stock {p.stock} · {p.sales_count} vente(s)</Text>
            <StatusBadge map={PRODUCT_STATUS} value={p.status} />
          </View>
        </Card>
      ))}
    </>
  );
}

export default function Vendeur() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('dash');
  if (!user) return <Redirect href="/connexion" />;
  if (user.shop?.status !== 'approved') return <Redirect href="/vendre" />;
  return (
    <Screen refreshControl={<RefreshControl refreshing={false} onRefresh={refreshUser} tintColor={colors.gold} />}>
      <Text style={[ui.h2, { marginBottom: 12 }]}><Icon name="store" size={16} color={colors.gold} />  {user.shop.name}</Text>
      {/* Onglets de largeur égale : toujours visibles, même sur un petit écran */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }} accessibilityRole="tablist">
        {[['dash', 'Tableau de bord', 'gauge-high'], ['orders', 'Commandes', 'box-open'], ['products', 'Vêtements', 'shirt']].map(([k, label, icon]) => {
          const on = tab === k;
          return (
            <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: on }}
              style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 9, paddingHorizontal: 4, borderRadius: radius.md, borderWidth: 1.5,
                borderColor: on ? colors.gold : colors.line, backgroundColor: on ? colors.goldLight : '#fff' }}>
              <Icon name={icon} size={15} color={on ? colors.goldDeep : colors.gold} />
              <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 12, fontWeight: on ? '700' : '500', color: on ? colors.goldDeep : colors.ink2 }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {tab === 'dash' ? <Dashboard /> : tab === 'orders' ? <Orders /> : <Products />}
    </Screen>
  );
}
