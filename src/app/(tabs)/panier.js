import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Icon } from '../../components/Icon';
import { Button, Card, Empty, ProductImage, Screen, styles as ui } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useFeedback } from '../../context/FeedbackContext';
import { price } from '../../lib/format';
import { colors, radius } from '../../lib/theme';

/** Articles regroupés par boutique : chaque boutique livre elle-même, on commande boutique par boutique. */
function groupByShop(items) {
  const groups = new Map();
  for (const it of items) {
    if (!groups.has(it.shop_id)) groups.set(it.shop_id, { shop_id: it.shop_id, shop_name: it.shop_name, items: [] });
    groups.get(it.shop_id).items.push(it);
  }
  return [...groups.values()].map((g) => ({
    ...g,
    subtotal: g.items.reduce((s, i) => s + Number(i.line_total), 0),
    count: g.items.reduce((s, i) => s + i.quantity, 0),
    hasIssue: g.items.some((i) => i.issue),
  }));
}

export default function Panier() {
  const { user } = useAuth();
  const { cart, update, remove, reload } = useCart();
  const { confirm } = useFeedback();
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  if (!user) return <Empty icon="cart-shopping" title="Votre panier vous attend" text="Connectez-vous pour ajouter des articles et commander." action="Se connecter" onAction={() => router.push('/connexion')} />;
  if (!cart.items.length) return <Empty icon="cart-shopping" title="Votre panier est vide" text="Parcourez nos collections et laissez-vous inspirer." action="Découvrir le catalogue" onAction={() => router.push('/catalogue')} />;

  const groups = groupByShop(cart.items);
  const askRemove = async (it) => {
    if (await confirm({ title: 'Retirer cet article ?', message: it.name, confirmLabel: 'Retirer', danger: true })) remove(it.id).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Screen>
        {groups.length > 1 && (
          <Text style={[ui.small, { backgroundColor: colors.goldSoft, padding: 10, borderRadius: 8, color: colors.goldDeep, marginBottom: 12 }]}>
            <Icon name="circle-info" size={11} color={colors.goldDeep} /> Articles de {groups.length} boutiques : chacune livre elle-même, vous validez une commande par boutique.
          </Text>
        )}
        {groups.map((g) => (
          <View key={g.shop_id} style={{ marginBottom: 18 }}>
            <View style={[ui.between, { marginBottom: 8 }]}>
              <Text style={ui.h3}><Icon name="store" size={13} color={colors.gold} />  {g.shop_name}</Text>
              <Text style={ui.small}><Icon name="truck-fast" size={11} color={colors.ink2} /> Livrée par la boutique</Text>
            </View>
            {g.items.map((it) => (
              <Card key={it.id} style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
                <Pressable onPress={() => router.push(`/produit/${it.slug}`)}>
                  <ProductImage uri={it.image} style={{ width: 80, height: 100, borderRadius: radius.sm }} />
                </Pressable>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={ui.h3} numberOfLines={2}>{it.name}</Text>
                  <Text style={ui.small}>{it.size} · {it.color}</Text>
                  <Text style={{ fontWeight: '800', color: colors.ink }}>{price(it.line_total)}</Text>
                  {it.issue && <Text style={ui.error}><Icon name="triangle-exclamation" size={11} color={colors.danger} /> {it.issue}</Text>}
                  <View style={[ui.between, { marginTop: 4 }]}>
                    <View style={[ui.row, { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.pill, gap: 0 }]}>
                      <Pressable style={{ padding: 10 }} disabled={it.quantity <= 1} onPress={() => update(it.id, { quantity: it.quantity - 1 }).catch(() => {})}><Icon name="minus" size={12} /></Pressable>
                      <Text style={{ minWidth: 24, textAlign: 'center', fontWeight: '700' }}>{it.quantity}</Text>
                      <Pressable style={{ padding: 10 }} disabled={it.quantity >= it.stock} onPress={() => update(it.id, { quantity: it.quantity + 1 }).catch(() => {})}><Icon name="plus" size={12} /></Pressable>
                    </View>
                    <Pressable onPress={() => askRemove(it)} hitSlop={8}><Icon name="trash-can" size={16} color={colors.danger} /></Pressable>
                  </View>
                </View>
              </Card>
            ))}
            <View style={[ui.between, { marginVertical: 8 }]}>
              <Text style={ui.muted}>Sous-total ({g.count} article{g.count > 1 ? 's' : ''})</Text>
              <Text style={ui.h3}>{price(g.subtotal)}</Text>
            </View>
            {g.hasIssue && <Text style={[ui.error, { marginBottom: 6 }]}>Corrigez les articles signalés pour continuer.</Text>}
            <Button title={`Commander chez ${g.shop_name}`} icon="lock" disabled={g.hasIssue}
              onPress={() => router.push({ pathname: '/commande', params: { boutique: String(g.shop_id) } })} />
          </View>
        ))}
      </Screen>
    </View>
  );
}
