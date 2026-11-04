import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import AddressForm from '../components/AddressForm';
import { Icon } from '../components/Icon';
import { Button, Card, Chip, Choice, Field, Loader, Screen, styles as ui, useFetch, useForm } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../lib/api';
import { PaymentChips } from '../components/PaymentLogo';
import { DELIVERY_MODES, price } from '../lib/format';
import { colors } from '../lib/theme';

export default function Commande() {
  const { user } = useAuth();
  const { cart, reload } = useCart();
  const { boutique } = useLocalSearchParams();
  const addresses = useFetch(user ? '/account/addresses' : null);
  const { data: settings } = useFetch('/settings/public');
  const [editing, setEditing] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState(null);
  const [promoInput, setPromoInput] = useState('');
  const myPromos = useFetch(user ? '/account/promotions' : null);
  const { values, set, setValues, submitting, submit } = useForm({
    address_id: null, delivery_mode: 'home', payment_plan: 'full', payment_method: 'orange_money', note: '', promo_code: '',
  });
  const applyPromo = (code) => { setPromoInput(code); set('promo_code')(code.trim().toUpperCase()); };

  // Une commande = une boutique (paramètre boutique, ou la seule boutique du panier)
  const shopIds = [...new Set(cart.items.map((i) => i.shop_id))];
  const shopId = Number(boutique) || (shopIds.length === 1 ? shopIds[0] : null);
  const items = cart.items.filter((i) => i.shop_id === shopId);

  useEffect(() => {
    if (addresses.data?.length && !values.address_id) {
      setValues((v) => ({ ...v, address_id: (addresses.data.find((a) => a.is_default) || addresses.data[0]).id }));
    }
  }, [addresses.data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!values.address_id || !shopId) return;
    api.post('/orders/quote', {
      shop_id: shopId, address_id: values.address_id, delivery_mode: values.delivery_mode,
      payment_plan: values.payment_plan, promo_code: values.promo_code || undefined,
    }).then((r) => { setQuote(r.data); setQuoteError(null); })
      // Ex. : zone non desservie par la boutique
      .catch((e) => { setQuote(null); setQuoteError(e.message); });
  }, [shopId, values.address_id, values.delivery_mode, values.payment_plan, values.promo_code, cart.subtotal]);

  if (!user) return <Redirect href="/connexion" />;
  if (!submitting && (!shopId || !items.length)) return <Redirect href="/panier" />;
  if (addresses.loading) return <Loader />;

  const plans = [
    { code: 'full', icon: 'wallet', title: 'Payer la totalité maintenant', sub: 'Tout est réglé en ligne, rien à payer à la livraison.' },
    { code: 'half', icon: 'circle-half-stroke', title: 'Payer la moitié maintenant', sub: `${settings?.half_payment_rate ?? 50} % en ligne, le reste au vendeur à la livraison.` },
    ...(settings?.cash_on_delivery ? [{ code: 'deposit', icon: 'money-bill-wave', title: 'Paiement à la livraison',
      sub: `Acompte obligatoire de ${settings?.deposit_rate ?? 10} % en ligne, le reste à la livraison.` }] : []),
  ];

  const onSubmit = submit(async (v) => {
    const res = await api.post('/orders', {
      ...v, shop_id: shopId, delivery_mode: quote?.delivery_mode || v.delivery_mode,
      promo_code: quote?.promo ? v.promo_code : undefined, // code transmis seulement s'il a été validé par le devis
    });
    await reload();
    const { order, payment } = res.data;
    router.replace({ pathname: '/paiement/[id]', params: { id: payment.id, commande: order.id } });
  }, { toastSuccess: false, validate: (v) => ({ address_id: !v.address_id && 'Ajoutez une adresse de livraison' }) });

  const shopName = items[0]?.shop_name;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Screen>
        <Text style={[ui.h3, { marginBottom: 10 }]}><Icon name="location-dot" size={14} color={colors.gold} />  1. Adresse de livraison</Text>
        {addresses.data?.map((a) => (
          <Choice key={a.id} on={values.address_id === a.id} onPress={() => set('address_id')(a.id)}
            label={`${a.label} — ${a.recipient_name}`} sub={`${a.phone} · ${[a.street, a.district, a.commune, a.city].filter(Boolean).join(', ')}`} />
        ))}
        <Button title="Ajouter une adresse" icon="plus" variant="outline" size="sm" onPress={() => setEditing({})} />

        <Text style={[ui.h3, { marginTop: 22, marginBottom: 10 }]}><Icon name="truck-fast" size={14} color={colors.gold} />  2. Livraison par {shopName}</Text>
        {(quote?.delivery_options || []).map((o) => (
          <Choice key={o.mode} label={o.label} sub={`${o.fee === 0 ? 'Gratuit' : price(o.fee)}${o.zone ? ` · ${o.zone}` : ''}`} icon={DELIVERY_MODES[o.mode]?.[1] || 'truck-fast'}
            on={quote?.delivery_mode === o.mode} onPress={() => set('delivery_mode')(o.mode)} />
        ))}
        {quoteError ? <Text style={[ui.error, { backgroundColor: colors.dangerBg, padding: 10, borderRadius: 8, marginBottom: 8 }]}>{quoteError}</Text> : null}
        {quote?.shop?.delivery_info ? <Text style={[ui.small, { marginBottom: 8 }]}>{quote.shop.delivery_info}</Text> : null}

        <Text style={[ui.h3, { marginTop: 12, marginBottom: 10 }]}><Icon name="wallet" size={14} color={colors.gold} />  3. Comment voulez-vous payer ?</Text>
        {plans.map((p) => (
          <Choice key={p.code} label={p.title} sub={p.sub} icon={p.icon} on={values.payment_plan === p.code} onPress={() => set('payment_plan')(p.code)} />
        ))}
        <Text style={[ui.label, { marginTop: 6, marginBottom: 8 }]}>
          {values.payment_plan === 'full' ? 'Payer avec' : 'Payer la part en ligne avec'}
        </Text>
        <PaymentChips codes={settings?.payment_methods || []} value={values.payment_method} onChange={set('payment_method')} />
        {settings?.payment_mode === 'sandbox' && (
          <Text style={[ui.small, { backgroundColor: colors.goldSoft, padding: 10, borderRadius: 8, color: colors.goldDeep, marginTop: 10 }]}>Mode démonstration : le paiement Mobile Money est simulé, aucun débit réel.</Text>
        )}
        <Field label="Note pour le vendeur (facultatif)" value={values.note} onChangeText={set('note')} multiline style={{ marginTop: 12 }} />

        {/* Code promo */}
        <Text style={[ui.h3, { marginBottom: 10 }]}><Icon name="ticket" size={14} color={colors.gold} />  Code promo</Text>
        <View style={[ui.row, { marginBottom: 8 }]}>
          <View style={[ui.inputBox, { flex: 1 }]}>
            <TextInput style={ui.input} value={promoInput} onChangeText={(t) => setPromoInput(t.toUpperCase())} placeholder="Ex. : IVS-AB12CD"
              placeholderTextColor="#A8A8A8" autoCapitalize="characters" autoCorrect={false} returnKeyType="done" onSubmitEditing={() => applyPromo(promoInput)} />
          </View>
          {values.promo_code
            ? <Button title="Retirer" variant="ghost" size="sm" block={false} onPress={() => applyPromo('')} />
            : <Button title="Appliquer" variant="outline" size="sm" block={false} disabled={!promoInput.trim()} onPress={() => applyPromo(promoInput)} />}
        </View>
        {values.promo_code && quote?.promo && (
          <Text style={[ui.small, { color: colors.success, marginBottom: 8 }]}><Icon name="circle-check" size={11} color={colors.success} /> {quote.promo.title} : code appliqué</Text>
        )}
        {values.promo_code && quote?.promo_error && <Text style={[ui.error, { marginBottom: 8 }]}>{quote.promo_error}</Text>}
        {!values.promo_code && myPromos.data?.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {myPromos.data.map((p) => (
              <Chip key={p.id} icon="gift" label={`${p.code} · ${p.discount_type === 'percent' ? `-${Number(p.discount_value)} %` : `-${price(p.discount_value)}`}`}
                onPress={() => applyPromo(p.code)} />
            ))}
          </View>
        )}

        <Card>
          <Text style={[ui.h3, { marginBottom: 8 }]}><Icon name="store" size={13} color={colors.gold} />  {shopName}</Text>
          {items.map((it) => (
            <View key={it.id} style={[ui.between, { marginBottom: 4 }]}>
              <Text style={[ui.small, { flex: 1 }]} numberOfLines={1}>{it.name} ({it.size}) x{it.quantity}</Text>
              <Text style={ui.small}>{price(it.line_total)}</Text>
            </View>
          ))}
          <View style={ui.divider} />
          <View style={ui.between}><Text style={ui.muted}>Sous-total</Text><Text>{price(quote?.subtotal ?? 0)}</Text></View>
          {quote?.discount > 0 && (
            <View style={ui.between}><Text style={{ color: colors.success }}>Remise ({quote.promo.code})</Text><Text style={{ color: colors.success, fontWeight: '700' }}>-{price(quote.discount)}</Text></View>
          )}
          <View style={ui.between}><Text style={ui.muted}>Livraison</Text><Text>{quote ? (quote.delivery_fee === 0 ? 'Offerte' : price(quote.delivery_fee)) : '—'}</Text></View>
          <View style={ui.between}><Text style={ui.muted}>Total</Text><Text style={{ fontWeight: '700' }}>{price(quote?.total ?? 0)}</Text></View>
        </Card>
      </Screen>
      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.line, gap: 6 }}>
        <View style={ui.between}><Text style={ui.h3}>À payer maintenant</Text><Text style={ui.h2}>{price(quote?.upfront ?? 0)}</Text></View>
        {quote?.balance > 0 && (
          <View style={ui.between}><Text style={ui.muted}>Au vendeur à la livraison</Text><Text style={{ fontWeight: '700', color: colors.ink }}>{price(quote.balance)}</Text></View>
        )}
        <Button title={quote ? `Payer ${price(quote.upfront)}` : 'Commander'} icon="lock" onPress={onSubmit} loading={submitting} disabled={!quote} size="lg" />
      </View>
      {editing && (
        <AddressForm visible address={editing.id ? editing : null} onClose={() => setEditing(null)}
          onSaved={(a) => { setEditing(null); addresses.reload(); set('address_id')(a.id); }} />
      )}
    </View>
  );
}
