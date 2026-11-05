import { useMemo, useState } from 'react';
import { Dimensions, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import {
  Button, Chip, ErrorView, IconButton, Loader, Price, ProductCard, ProductImage, SectionTitle, Stars, styles as ui, useFetch,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import PaymentLogo from '../../components/PaymentLogo';
import { fileUrl } from '../../lib/api';
import { AUDIENCES, date, price } from '../../lib/format';
import { colors, radius } from '../../lib/theme';

const W = Dimensions.get('window').width;

export default function Produit() {
  const { slug } = useLocalSearchParams();
  const { user } = useAuth();
  const { bottom } = useSafeAreaInsets();
  const { add, favorites, toggleFavorite, cart } = useCart();
  const { data: p, loading, error, reload } = useFetch(`/products/${slug}`, null, [user?.id]);
  // Sélection propre à chaque produit : valeurs par défaut tant que l'utilisateur n'a rien choisi
  const [sel, setSel] = useState({});
  const current = sel.id === p?.id ? sel : { id: p?.id, color: p?.variants[0]?.color || null, size: null, qty: 1 };
  const { color, size, qty } = current;
  const choose = (patch) => setSel({ ...current, ...patch });
  const setColor = (c) => choose({ color: c, size: null });
  const setSize = (s) => choose({ size: s, qty: 1 });
  const setQty = (f) => choose({ qty: f(qty) });
  const [adding, setAdding] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [showRates, setShowRates] = useState(false);

  const colorsList = useMemo(() => {
    const m = new Map();
    p?.variants.forEach((v) => !m.has(v.color) && m.set(v.color, v.color_hex));
    return [...m.entries()];
  }, [p]);
  const sizes = useMemo(() => p?.variants.filter((v) => v.color === color) || [], [p, color]);
  const variant = sizes.find((v) => v.size === size);
  const shown = variant || sizes[0];

  if (loading) return <Loader />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const fav = favorites.has(p.id);
  const outOfStock = p.variants.every((v) => v.stock <= 0);

  const onAdd = async (buyNow) => {
    if (!variant) return;
    setAdding(true);
    try {
      await add(variant.id, qty);
      if (buyNow && user) router.push('/panier');
    } catch { /* message déjà affiché */ } finally { setAdding(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{
        title: '',
        headerRight: () => (
          <View style={ui.row}>
            <IconButton icon="heart" regular={!fav} color={fav ? '#D64545' : colors.ink2} onPress={() => toggleFavorite(p.id)} label="Favori" />
            <IconButton icon="cart-shopping" badge={cart.count} onPress={() => router.push('/panier')} label="Panier" />
          </View>
        ),
      }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setImgIndex(Math.round(e.nativeEvent.contentOffset.x / W))}>
          {(p.images.length ? p.images : [{ id: 0, url: null }]).map((im) => (im.media_type === 'video' ? (
            <Pressable key={im.id} onPress={() => Linking.openURL(fileUrl(im.url))} accessibilityRole="button" accessibilityLabel="Lire la vidéo">
              <ProductImage uri={im.url} w={900} style={{ width: W, height: W * 1.15 }} />
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(28,28,28,0.65)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="play" size={24} color="#fff" />
                </View>
              </View>
            </Pressable>
          ) : (
            <ProductImage key={im.id} uri={im.url} w={900} style={{ width: W, height: W * 1.15 }} />
          )))}
        </ScrollView>
        {p.images.length > 1 && (
          <View style={[ui.row, { justifyContent: 'center', marginTop: 8, gap: 6 }]}>
            {p.images.map((im, i) => <View key={im.id} style={{ width: i === imgIndex ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === imgIndex ? colors.gold : colors.line }} />)}
          </View>
        )}

        <View style={{ padding: 16 }}>
          <Pressable onPress={() => router.push(`/boutique/${p.shop_slug}`)} style={[ui.badge, { backgroundColor: colors.goldLight, flexDirection: 'row', gap: 6, alignItems: 'center' }]}>
            <Icon name="store" size={11} color={colors.goldDeep} /><Text style={[ui.badgeText, { color: colors.goldDeep }]}>{p.shop_name}</Text>
            {p.shop_official ? <Icon name="circle-check" size={11} color={colors.goldDeep} /> : null}
          </Pressable>
          <Text style={[ui.h1, { fontSize: 21, marginTop: 8 }]}>{p.name}</Text>
          <View style={[ui.row, { marginVertical: 6 }]}>
            {p.rating_count > 0 ? <Stars value={Number(p.rating_avg)} count={p.rating_count} size={13} /> : <Text style={ui.small}>Pas encore d’avis</Text>}
            <Text style={ui.small}>· {AUDIENCES[p.audience]}</Text>
          </View>
          <Price value={shown?.price ?? p.min_price} old={shown?.compare_at_price} size={22} />

          <Text style={[ui.label, { marginTop: 18 }]}>Couleur : <Text style={{ fontWeight: '400' }}>{color}</Text></Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {colorsList.map(([c, hex]) => <Chip key={c} label={c} swatch={hex || '#ddd'} on={c === color} onPress={() => setColor(c)} />)}
          </View>

          <Text style={[ui.label, { marginTop: 16 }]}>Taille</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {sizes.map((v) => (
              <Pressable key={v.id} disabled={v.stock <= 0} onPress={() => setSize(v.size)}
                style={{ minWidth: 52, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1.5, alignItems: 'center',
                  borderColor: v.size === size ? colors.gold : colors.line, backgroundColor: v.size === size ? colors.goldLight : '#fff', opacity: v.stock <= 0 ? 0.4 : 1 }}>
                <Text style={{ fontWeight: v.size === size ? '800' : '500', color: colors.ink, textDecorationLine: v.stock <= 0 ? 'line-through' : 'none' }}>{v.size}</Text>
              </Pressable>
            ))}
          </View>
          {variant && (
            <Text style={[ui.small, { marginTop: 8, color: variant.stock <= 3 ? colors.goldDark : colors.success }]}>
              <Icon name={variant.stock <= 3 ? 'triangle-exclamation' : 'circle-check'} size={11} color={variant.stock <= 3 ? colors.goldDark : colors.success} />
              {variant.stock <= 3 ? ` Plus que ${variant.stock} en stock !` : ' En stock'}
            </Text>
          )}

          {!outOfStock && variant && (
            <View style={[ui.row, { marginTop: 14 }]}>
              <Text style={ui.label}>Quantité</Text>
              <View style={[ui.row, { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.pill, gap: 0 }]}>
                <Pressable style={{ padding: 10 }} onPress={() => setQty((q) => Math.max(1, q - 1))}><Icon name="minus" size={12} /></Pressable>
                <Text style={{ minWidth: 26, textAlign: 'center', fontWeight: '700' }}>{qty}</Text>
                <Pressable style={{ padding: 10 }} onPress={() => setQty((q) => Math.min(variant.stock, q + 1))}><Icon name="plus" size={12} /></Pressable>
              </View>
            </View>
          )}

          <View style={[ui.card, { marginTop: 18, gap: 10 }]}>
            <View style={{ gap: 2 }}>
              <Text style={ui.small}><Icon name="truck-fast" size={12} color={colors.goldDark} />  Livraison par la boutique — Abidjan {price(p.delivery_info.abidjan)} · Intérieur {price(p.delivery_info.other)}</Text>
              {p.delivery_info.free_threshold > 0 && <Text style={ui.small}>Offerte dès {price(p.delivery_info.free_threshold)} d’achat</Text>}
              {p.delivery_info.shop_pickup && <Text style={ui.small}>Retrait gratuit en boutique</Text>}
              {p.delivery_info.note ? <Text style={ui.small}>{p.delivery_info.note}</Text> : null}
              {p.delivery_info.zones?.length > 0 && (
                <Pressable onPress={() => setShowRates((v) => !v)} hitSlop={6}>
                  <Text style={[ui.small, { color: colors.goldDeep, fontWeight: '600' }]}>
                    {showRates ? 'Masquer' : 'Voir'} les tarifs par commune et par ville
                  </Text>
                </Pressable>
              )}
              {showRates && p.delivery_info.zones?.map((z) => (
                <View key={`${z.type}-${z.name}`} style={ui.between}>
                  <Text style={ui.small}>{z.type === 'commune' ? `${z.name} (Abidjan)` : z.name}</Text>
                  <Text style={[ui.small, { fontWeight: '700' }]}>
                    {z.delivers ? price(z.fee ?? (z.type === 'commune' ? p.delivery_info.abidjan : p.delivery_info.other)) : 'Non desservi'}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ gap: 6 }}>
              <Text style={ui.small}><Icon name="shield-halved" size={12} color={colors.goldDark} />  Paiement Mobile Money sécurisé</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {['orange_money', 'mtn_momo', 'wave', 'moov_money'].map((c) => <PaymentLogo key={c} code={c} size={30} />)}
              </View>
              <Text style={ui.small}>
                Payez la totalité, ou {p.payment_terms?.half_rate ?? 50} % maintenant et le reste à la livraison
                {p.payment_terms?.cash_on_delivery ? `, ou à la livraison avec un acompte de ${p.payment_terms.deposit_rate} %` : ''}.
              </Text>
            </View>
            <Text style={ui.small}><Icon name="rotate-left" size={12} color={colors.goldDark} />  Retour possible sous 7 jours après livraison</Text>
          </View>

          <Text style={ui.h3}>Description</Text>
          <Text style={[ui.muted, { marginTop: 6 }]}>{p.description}</Text>
          {[['Matière', p.material], ['Coupe', p.fit], ['Entretien', p.care], ['Origine', p.origin]].filter(([, v]) => v).map(([k, v]) => (
            <Text key={k} style={[ui.small, { marginTop: 4 }]}><Text style={{ fontWeight: '700', color: colors.ink2 }}>{k} : </Text>{v}</Text>
          ))}
          {p.size_guide && <><Text style={[ui.h3, { marginTop: 14 }]}>Guide des tailles</Text><Text style={[ui.muted, { marginTop: 6 }]}>{p.size_guide}</Text></>}

          <Text style={[ui.h3, { marginTop: 18 }]}>Avis ({p.reviews.length})</Text>
          {p.reviews.length === 0 && <Text style={[ui.small, { marginTop: 6 }]}>Les avis sont réservés aux clients ayant reçu l’article.</Text>}
          {p.reviews.map((r) => (
            <View key={r.id} style={[ui.card, { marginTop: 8, marginBottom: 0 }]}>
              <View style={ui.between}><Text style={{ fontWeight: '700' }}>{r.author}</Text><Text style={ui.small}>{date(r.created_at)}</Text></View>
              <Stars value={r.rating} />
              {r.comment && <Text style={[ui.muted, { marginTop: 4 }]}>{r.comment}</Text>}
            </View>
          ))}

          {p.similar.length > 0 && <>
            <SectionTitle title="Vous aimerez aussi" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {p.similar.map((s) => <ProductCard key={s.id} p={s} width={150} />)}
            </ScrollView>
          </>}
        </View>
      </ScrollView>

      <View style={{ padding: 12, paddingBottom: 18 + bottom, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', gap: 10, backgroundColor: '#fff' }}>
        {outOfStock ? <Button title="Rupture de stock" disabled style={{ flex: 1 }} /> : <>
          <Button title={variant ? 'Ajouter' : 'Choisir la taille'} icon="cart-plus" variant="outline" disabled={!variant} loading={adding} onPress={() => onAdd(false)} style={{ flex: 1 }} />
          <Button title="Acheter" icon="bolt" disabled={!variant || adding} onPress={() => onAdd(true)} style={{ flex: 1 }} />
        </>}
      </View>
    </View>
  );
}
