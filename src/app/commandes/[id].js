import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Icon } from '../../components/Icon';
import {
  Button, Card, ErrorView, Field, Loader, ProductImage, Screen, StatusBadge, styles as ui, useFetch, useForm,
} from '../../components/ui';
import { useFeedback } from '../../context/FeedbackContext';
import { PaymentLabel } from '../../components/PaymentLogo';
import { api } from '../../lib/api';
import { date, DELIVERY_MODES, ORDER_STATUS, PAYMENT_PLANS, PAYMENT_STATUS, price, showPaymentStatus } from '../../lib/format';
import { colors, radius } from '../../lib/theme';

function Sheet({ visible, title, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 }}>
          <View style={[ui.between, { marginBottom: 14 }]}><Text style={ui.h2}>{title}</Text><Pressable onPress={onClose} hitSlop={10}><Icon name="xmark" size={18} /></Pressable></View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

export default function CommandeDetail() {
  const { id } = useLocalSearchParams();
  const { data: o, loading, error, reload } = useFetch(`/orders/${id}`);
  const { confirm, notify, showResult } = useFeedback();
  const [reviewing, setReviewing] = useState(null);
  const [returning, setReturning] = useState(false);
  const review = useForm({ rating: 5, comment: '' });
  const ret = useForm({ reason: '' });

  if (loading) return <Loader />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const pendingPayment = o.status === 'pending' && !['succeeded', 'partially_paid'].includes(o.payment_status);

  const cancel = async () => {
    if (!(await confirm({ title: 'Annuler cette commande ?', message: 'Les articles seront remis en stock. Si vous avez payé, vous serez remboursé.', confirmLabel: 'Annuler la commande', cancelLabel: 'Garder', danger: true }))) return;
    try {
      const res = await api.post(`/orders/${o.id}/cancel`, { reason: 'Annulée par le client' });
      await showResult({ title: 'Commande annulée', message: res.message });
      reload();
    } catch (e) { notify.error(e.message); }
  };

  const sendReview = review.submit(async (v) => {
    const res = await api.post(`/products/${reviewing.product_id}/reviews`, v);
    setReviewing(null);
    reload();
    return res;
  });

  const sendReturn = ret.submit(async (v) => {
    await api.post(`/orders/${o.id}/return`, v);
    setReturning(false);
    await showResult({ icon: 'rotate-left', title: 'Demande de retour envoyée', message: 'Notre équipe va l’examiner et vous tiendra informé.' });
    reload();
  }, { toastSuccess: false, validate: (v) => ({ reason: v.reason.trim().length < 10 && 'Décrivez le motif (10 caractères minimum)' }) });

  return (
    <Screen>
      <Stack.Screen options={{ title: o.order_number }} />
      <View style={[ui.row, { gap: 6, marginBottom: 12, flexWrap: 'wrap' }]}>
        <StatusBadge map={ORDER_STATUS} value={o.status} />{showPaymentStatus(o) && <StatusBadge map={PAYMENT_STATUS} value={o.payment_status} />}
      </View>
      {pendingPayment && (
        <Card style={{ backgroundColor: colors.warningBg, borderColor: '#F3DDB0' }}>
          <Text style={{ color: colors.warning, marginBottom: 10 }}>Votre commande attend le paiement. Sans paiement, elle sera annulée automatiquement.</Text>
          <Button title="Payer maintenant" icon="credit-card" onPress={() => router.push({ pathname: '/paiement/[id]', params: { id: o.payments[0]?.id, commande: o.id } })} />
        </Card>
      )}

      <Card>
        <Text style={[ui.h3, { marginBottom: 8 }]}>Articles</Text>
        {o.items.map((it) => (
          <View key={it.id} style={[ui.row, { alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line2 }]}>
            <ProductImage uri={it.image_url} style={{ width: 54, height: 66, borderRadius: radius.sm }} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontWeight: '600' }}>{it.product_name}</Text>
              <Text style={ui.small}>{it.size} · {it.color} · x{it.quantity} · {it.shop_name}</Text>
              <StatusBadge map={ORDER_STATUS} value={it.fulfillment_status} />
              {it.tracking_number && <Text style={ui.small}><Icon name="truck-fast" size={11} color={colors.goldDark} /> {it.carrier} {it.tracking_number}</Text>}
              {it.fulfillment_status === 'delivered' && !it.reviewed && it.product_id && (
                <Button title="Donner mon avis" icon="star" size="sm" variant="outline" block={false} onPress={() => { review.setValues({ rating: 5, comment: '' }); setReviewing(it); }} />
              )}
            </View>
            <Text style={{ fontWeight: '700' }}>{price(it.line_total)}</Text>
          </View>
        ))}
        <View style={[ui.between, { marginTop: 10 }]}><Text style={ui.muted}>Sous-total</Text><Text>{price(o.subtotal)}</Text></View>
        {Number(o.discount_total) > 0 && (
          <View style={ui.between}><Text style={{ color: colors.success }}>Remise ({o.promo_code})</Text><Text style={{ color: colors.success }}>-{price(o.discount_total)}</Text></View>
        )}
        <View style={ui.between}><Text style={ui.muted}>Livraison</Text><Text>{Number(o.delivery_fee) ? price(o.delivery_fee) : 'Offerte'}</Text></View>
        <View style={[ui.between, { marginTop: 4 }]}><Text style={ui.h3}>Total</Text><Text style={ui.h2}>{price(o.total_amount)}</Text></View>
        <View style={ui.divider} />
        <Text style={[ui.small, { marginBottom: 6 }]}>{PAYMENT_PLANS[o.payment_plan] || ''}</Text>
        <View style={ui.between}><PaymentLabel code={o.payment_method} size={24} /><Text style={{ fontWeight: '700' }}>{price(o.upfront_amount)}</Text></View>
        {Number(o.balance_amount) > 0 && (
          <View style={[ui.between, { marginTop: 6 }]}>
            <Text style={[ui.muted, { flex: 1 }]}>{o.balance_paid_at ? 'Réglé au vendeur à la livraison' : 'À régler au vendeur à la livraison'}</Text>
            <Text style={{ fontWeight: '700', color: o.balance_paid_at ? colors.success : colors.goldDeep }}>{price(o.balance_amount)}</Text>
          </View>
        )}
      </Card>

      <Card>
        <Text style={[ui.h3, { marginBottom: 6 }]}><Icon name="location-dot" size={13} color={colors.gold} />  {DELIVERY_MODES[o.delivery_mode]?.[0]}</Text>
        <Text style={ui.muted}>{o.ship_recipient} · {o.ship_phone}{'\n'}{[o.ship_street, o.ship_district, o.ship_commune, o.ship_city].filter(Boolean).join(', ')}</Text>
      </Card>

      <Card>
        <Text style={[ui.h3, { marginBottom: 10 }]}>Suivi</Text>
        {[...o.history].reverse().map((h, i) => (
          <View key={i} style={[ui.row, { alignItems: 'flex-start', marginBottom: 10 }]}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: i === 0 ? colors.gold : colors.line, marginTop: 4 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: i === 0 ? '700' : '500' }}>{ORDER_STATUS[h.status]?.[0] || h.status}</Text>
              <Text style={ui.small}>{date(h.created_at, true)}{h.comment ? ` — ${h.comment}` : ''}</Text>
            </View>
          </View>
        ))}
      </Card>

      {o.returns.map((r) => <Text key={r.id} style={[ui.small, { marginBottom: 10 }]}>Retour : {r.status === 'requested' ? 'en cours d’examen' : r.status === 'accepted' ? 'accepté' : r.status === 'refunded' ? 'remboursé' : 'refusé'}</Text>)}
      {['pending', 'confirmed'].includes(o.status) && <Button title="Annuler la commande" icon="ban" variant="danger" onPress={cancel} />}
      {o.status === 'delivered' && <Button title="Demander un retour" icon="rotate-left" variant="outline" onPress={() => setReturning(true)} />}

      <Sheet visible={!!reviewing} title="Donner mon avis" onClose={() => setReviewing(null)}>
        <Text style={{ fontWeight: '600', marginBottom: 10 }}>{reviewing?.product_name}</Text>
        <View style={[ui.row, { marginBottom: 14 }]}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => review.set('rating')(n)} hitSlop={6}>
              <Icon name="star" size={30} regular={n > review.values.rating} color={colors.gold} />
            </Pressable>
          ))}
        </View>
        <Field label="Commentaire" multiline value={review.values.comment} onChangeText={review.set('comment')} />
        <Button title="Publier mon avis" onPress={sendReview} loading={review.submitting} />
      </Sheet>

      <Sheet visible={returning} title="Demander un retour" onClose={() => setReturning(false)}>
        <Field label="Motif du retour" multiline value={ret.values.reason} onChangeText={ret.set('reason')} error={ret.errors.reason} hint="Taille, défaut, article non conforme…" />
        <Button title="Envoyer la demande" icon="paper-plane" onPress={sendReturn} loading={ret.submitting} />
      </Sheet>
    </Screen>
  );
}
