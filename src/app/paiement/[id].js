import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Button, ErrorView, Field, Loader, Screen, styles as ui, useFetch } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useLive } from '../../context/RealtimeContext';
import { api } from '../../lib/api';
import PaymentLogo, { PaymentChips, paymentLabel } from '../../components/PaymentLogo';
import { PAYMENT_PLANS, price } from '../../lib/format';
import { colors } from '../../lib/theme';

const POLL_MS = 5000;
// Opérateurs qui confirment par USSD (demande de code sur le téléphone)
const USSD = ['mtn_momo', 'moov_money'];

/**
 * Parcours Mobile Money.
 * - sandbox : la réponse de l'opérateur est simulée côté serveur (webhook signé) ;
 * - jeko : validation chez l'opérateur (application Orange / Wave, ou code USSD MTN / Moov),
 *   puis l'écran attend la confirmation ; le retour se fait par le lien ivoirestyle://paiement/…
 */
export default function Paiement() {
  const { id, commande, retour } = useLocalSearchParams();
  const { user } = useAuth();
  const { notify, showResult } = useFeedback();
  const [paymentId, setPaymentId] = useState(Number(id));
  const order = useFetch(`/orders/${commande}`);
  const payment = useFetch(`/payments/${paymentId}`);
  const { data: settings } = useFetch('/settings/public');
  const [phone, setPhone] = useState(user?.phone || '');
  const [provider, setProvider] = useState(null);
  const [busy, setBusy] = useState(null);
  const [phoneError, setPhoneError] = useState(null);
  const [waiting, setWaiting] = useState(retour === '1');
  const [live, setLive] = useState(null);
  const announced = useRef(false);

  const jeko = settings?.payment_mode === 'jeko';
  const p = live?.id === paymentId ? live : payment.data;
  const o = order.data;

  // Vérifie l'état du paiement toutes les 5 s pendant l'attente
  useEffect(() => {
    if (!waiting) return undefined;
    let active = true;
    const tick = () => api.get(`/payments/${paymentId}`).then((r) => active && setLive(r.data)).catch(() => {});
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => { active = false; clearInterval(t); };
  }, [waiting, paymentId]);

  // Confirmation reçue en temps réel (webhook Jèko) : mise à jour immédiate
  useLive(['payment', 'order'], () => {
    if (!waiting) return;
    api.get(`/payments/${paymentId}`).then((r) => setLive(r.data)).catch(() => {});
    order.reload(true);
  });

  const status = p?.status;
  useEffect(() => {
    if (!waiting || !o || announced.current) return;
    if (status === 'succeeded') {
      announced.current = true;
      const balance = Number(o.balance_amount);
      showResult({
        title: balance > 0 ? 'Acompte confirmé !' : 'Paiement réussi !',
        message: `Votre paiement de ${price(p.amount)} est confirmé. Commande ${o.order_number} validée.`
          + (balance > 0 ? ` Vous réglerez ${price(balance)} au vendeur à la livraison.` : ''),
        confirmLabel: 'Suivre ma commande',
      }).then(() => router.replace(`/commandes/${o.id}`));
    } else if (status === 'failed') {
      announced.current = true;
      showResult({
        type: 'error', title: 'Paiement non abouti',
        message: p.failure_reason || 'La transaction n’a pas abouti. Aucun montant n’a été débité. Réessayez ou changez d’opérateur.',
        confirmLabel: 'Réessayer',
      }).then(() => { setWaiting(false); announced.current = false; });
    }
  }, [status, waiting, o, p, showResult]);

  if (order.loading || payment.loading) return <Loader />;
  if (order.error || payment.error) return <ErrorView message={order.error || payment.error} />;
  if (!waiting && (['succeeded', 'partially_paid'].includes(o.payment_status) || o.status !== 'pending')) return <Redirect href={`/commandes/${o.id}`} />;
  const current = provider || p.provider;
  const methods = settings?.payment_methods || [];
  // Montant de la tentative = part payable en ligne (totalité, moitié ou acompte)
  const amount = Number(p.amount);
  const balance = Number(o.balance_amount);

  const checkPhone = () => {
    const digits = phone.replace(/\D/g, '').replace(/^(00)?225/, '');
    const okPhone = jeko ? /^(01|05|07)\d{8}$/.test(digits) : /^\+?[0-9 ]{8,20}$/.test(phone);
    setPhoneError(okPhone ? null : 'Numéro ivoirien à 10 chiffres (01, 05 ou 07…)');
    if (!okPhone) notify.error('Saisissez votre numéro Mobile Money');
    return okPhone;
  };

  /** Mode Jèko : nouvelle tentative, puis ouverture de l'opérateur ou attente du code USSD. */
  const payWithJeko = async () => {
    if (!checkPhone()) return;
    setBusy('success');
    try {
      const r = await api.post('/payments/initiate', { order_id: o.id, provider: current, payer_phone: phone, return_to: 'app' });
      const { payment: attempt, instructions } = r.data;
      setPaymentId(attempt.id);
      setLive(null);
      setWaiting(true);
      if (instructions.type === 'redirect' && instructions.url) await Linking.openURL(instructions.url);
      else notify.info(instructions.message);
    } catch (e) {
      notify.error(e.message);
      payment.reload();
    } finally { setBusy(null); }
  };

  const pay = async (outcome) => {
    if (!checkPhone()) return;
    setBusy(outcome);
    try {
      let target = p;
      if (!['initiated', 'pending'].includes(p.status) || current !== p.provider) {
        const r = await api.post('/payments/initiate', { order_id: o.id, provider: current, payer_phone: phone });
        target = r.data.payment;
        setPaymentId(target.id);
      }
      const res = await api.post(`/payments/${target.id}/sandbox`, { outcome, payer_phone: phone });
      if (res.data.result.status === 'succeeded') {
        await showResult({
          title: balance > 0 ? 'Acompte confirmé !' : 'Paiement réussi !',
          message: `Votre paiement de ${price(amount)} est confirmé. Commande ${o.order_number} validée.`
            + (balance > 0 ? ` Vous réglerez ${price(balance)} au vendeur à la livraison.` : ''),
          confirmLabel: 'Suivre ma commande',
        });
        router.replace(`/commandes/${o.id}`);
      } else {
        await showResult({ type: 'error', title: 'Paiement refusé', message: 'La transaction n’a pas abouti. Aucun montant n’a été débité. Réessayez ou changez d’opérateur.', confirmLabel: 'Réessayer' });
        payment.reload(); order.reload();
      }
    } catch (e) {
      notify.error(e.message);
      payment.reload();
    } finally { setBusy(null); }
  };

  if (waiting && status !== 'failed') {
    const ussd = USSD.includes(p.provider);
    return (
      <Screen>
        <View style={{ alignItems: 'center', marginTop: 20, gap: 10 }}>
          <PaymentLogo code={p.provider} size={72} />
          <Text style={[ui.h2, { textAlign: 'center' }]}>{ussd ? 'Validez le paiement sur votre téléphone' : 'Confirmation du paiement en cours'}</Text>
          <Text style={ui.h1}>{price(amount)}</Text>
          <Text style={[ui.muted, { textAlign: 'center' }]}>
            {ussd
              ? `Une demande ${paymentLabel(p.provider)} a été envoyée au ${p.payer_phone} : composez votre code secret pour confirmer.`
              : 'Validez le paiement chez votre opérateur, puis revenez ici. La confirmation arrive en quelques secondes.'}
          </Text>
          <ActivityIndicator color={colors.gold} style={{ marginVertical: 10 }} />
          <Text style={ui.small}>Cet écran se met à jour automatiquement.</Text>
        </View>
        {!ussd && p.checkout_url && (
          <Button title={`Rouvrir ${paymentLabel(p.provider)}`} icon="up-right-from-square" variant="outline" onPress={() => Linking.openURL(p.checkout_url)} style={{ marginTop: 20 }} />
        )}
        <Button title="Changer d’opérateur ou de numéro" variant="ghost" onPress={() => { setWaiting(false); setLive(null); }} style={{ marginTop: 6 }} />
        <Button title="Suivre ma commande" variant="ghost" onPress={() => router.replace(`/commandes/${o.id}`)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginBottom: 18 }}>
        <PaymentLogo code={current} size={72} />
        <Text style={[ui.h2, { marginTop: 10 }]}>Paiement {paymentLabel(current)}</Text>
        <Text style={ui.muted}>Commande {o.order_number}</Text>
        <Text style={[ui.h1, { marginTop: 6 }]}>{price(amount)}</Text>
        {balance > 0 && (
          <Text style={[ui.small, { textAlign: 'center', marginTop: 4 }]}>
            {PAYMENT_PLANS[o.payment_plan]} · total {price(o.total_amount)}{'\n'}Reste {price(balance)} à régler au vendeur à la livraison
          </Text>
        )}
      </View>
      {p.status === 'failed' && (
        <Text style={[ui.error, { backgroundColor: colors.dangerBg, padding: 10, borderRadius: 8, marginBottom: 12 }]}>
          {p.failure_reason || 'La dernière tentative a échoué.'} Réessayez ou changez d’opérateur.
        </Text>
      )}
      <Text style={ui.label}>Opérateur</Text>
      <View style={{ marginBottom: 14 }}>
        <PaymentChips codes={methods} value={current} onChange={setProvider} />
      </View>
      <Field label="Numéro Mobile Money" required icon="phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} error={phoneError}
        hint={USSD.includes(current) ? 'Vous recevrez une demande de code secret sur ce numéro.' : 'Le numéro du compte qui paie.'} />
      {settings?.payment_mode === 'sandbox' && (
        <Text style={[ui.small, { backgroundColor: colors.goldSoft, padding: 12, borderRadius: 8, color: colors.goldDeep, marginBottom: 14 }]}>
          Mode démonstration : aucun débit réel. Choisissez le résultat de la transaction simulée.
        </Text>
      )}
      {jeko && (
        <Text style={[ui.small, { backgroundColor: colors.goldSoft, padding: 12, borderRadius: 8, color: colors.goldDeep, marginBottom: 14 }]}>
          Paiement sécurisé par Jèko. {USSD.includes(current) ? 'Vous validerez avec votre code secret sur votre téléphone.' : `Vous serez redirigé vers ${paymentLabel(current)} pour valider.`}
        </Text>
      )}
      <Button title={p.status === 'failed' ? 'Réessayer le paiement' : `Payer ${price(amount)}`} icon="circle-check" size="lg" loading={busy === 'success'} disabled={!!busy}
        onPress={() => (jeko ? payWithJeko() : pay('success'))} />
      {settings?.payment_mode === 'sandbox' && <Button title="Simuler un refus" icon="rotate-right" variant="danger" loading={busy === 'failure'} disabled={!!busy} onPress={() => pay('failure')} style={{ marginTop: 10 }} />}
      <Button title="Payer plus tard" variant="ghost" onPress={() => router.replace(`/commandes/${o.id}`)} style={{ marginTop: 6 }} />
    </Screen>
  );
}
