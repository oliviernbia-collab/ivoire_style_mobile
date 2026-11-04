import { useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import {
  Button, ErrorView, IconButton, Loader, ProductCard, SectionTitle, styles as ui, useFetch,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { fileUrl } from '../../lib/api';
import { colors, radius } from '../../lib/theme';

function Rail({ items }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
      {items.map((p) => <ProductCard key={p.id} p={p} width={160} />)}
    </ScrollView>
  );
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const { user, isSeller } = useAuth();
  const { cart } = useCart();
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useFetch('/home', null, [user?.id]);
  const sell = () => router.push(isSeller ? '/vendeur' : '/vendre');

  return (
    <ScrollView style={ui.screen} contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={colors.gold} />}>
      <View style={ui.between}>
        <Image source={require('../../../assets/logo.png')} style={{ width: 120, height: 98 }} resizeMode="contain" accessibilityLabel="Ivoire Style" />
        <View style={ui.row}>
          {user && <IconButton icon="bell" onPress={() => router.push('/notifications')} label="Notifications" />}
          <IconButton icon="cart-shopping" badge={cart.count} onPress={() => router.push('/panier')} label="Panier" />
        </View>
      </View>

      <View style={[ui.inputBox, { borderRadius: radius.pill, marginTop: 8 }]}>
        <Icon name="magnifying-glass" size={15} color={colors.muted} />
        <TextInput style={ui.input} value={q} onChangeText={setQ} placeholder="Robe, boubou, boutique…" placeholderTextColor="#A8A8A8"
          returnKeyType="search" onSubmitEditing={() => router.push({ pathname: '/catalogue', params: { q } })} />
      </View>

      {/* Bandeau principal + bouton vendeur */}
      <View style={{ marginTop: 18, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.goldLight, backgroundColor: colors.goldSoft, padding: 20 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.ink, lineHeight: 32 }}>
          Votre style,{'\n'}<Text style={{ color: colors.goldDark }}>votre signature.</Text>
        </Text>
        <Text style={[ui.muted, { marginTop: 8 }]}>Les créations des meilleures boutiques de Côte d’Ivoire, payées en Mobile Money et livrées chez vous.</Text>
        <Button title="Découvrir les collections" icon="bag-shopping" onPress={() => router.push('/catalogue')} style={{ marginTop: 16 }} />
        <Button title={isSeller ? 'Gérer ma boutique' : 'Je veux vendre sur Ivoire Style'} icon="store" variant="outline" onPress={sell} style={{ marginTop: 10 }} />
      </View>

      {loading ? <Loader /> : error ? <ErrorView message={error} onRetry={reload} /> : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 20 }} contentContainerStyle={{ gap: 14 }}>
            {data.categories.map((c) => (
              <Pressable key={c.id} style={{ alignItems: 'center', width: 74 }} onPress={() => router.push({ pathname: '/catalogue', params: { category: c.slug } })}>
                <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldLight, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={c.icon || 'tag'} size={22} color={colors.goldDark} />
                </View>
                <Text style={{ fontSize: 11, marginTop: 6, textAlign: 'center', color: colors.ink2 }} numberOfLines={2}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <SectionTitle title="Nouveautés" icon="fire" action="Voir tout" onAction={() => router.push({ pathname: '/catalogue', params: { sort: 'newest' } })} />
          <Rail items={data.newest} />

          {data.promos.length > 0 && <>
            <SectionTitle title="Promotions" icon="tags" action="Voir tout" onAction={() => router.push({ pathname: '/catalogue', params: { promo: '1' } })} />
            <Rail items={data.promos} />
          </>}

          <SectionTitle title="Populaires" icon="star" action="Voir tout" onAction={() => router.push({ pathname: '/catalogue', params: { sort: 'popular' } })} />
          <Rail items={data.popular} />

          {data.shops.length > 0 && <>
            <SectionTitle title="Boutiques à la une" icon="store" />
            {data.shops.map((s) => (
              <Pressable key={s.id} style={[ui.card, ui.row, { marginBottom: 10 }]} onPress={() => router.push(`/boutique/${s.slug}`)}>
                <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {s.logo_url ? <Image source={{ uri: fileUrl(s.logo_url) }} style={{ width: 52, height: 52 }} /> : <Text style={{ fontSize: 20, fontWeight: '800', color: colors.goldDark }}>{s.name[0]}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ui.h3}>{s.name}</Text>
                  <Text style={ui.small} numberOfLines={2}>{s.city} · {s.description}</Text>
                </View>
                <Icon name="chevron-right" size={13} color={colors.muted} />
              </Pressable>
            ))}
          </>}

          <View style={{ marginTop: 20, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.goldLight, padding: 20, alignItems: 'center' }}>
            <Icon name="store" size={30} color={colors.gold} />
            <Text style={[ui.h2, { marginTop: 8, textAlign: 'center' }]}>Vous avez une boutique de vêtements ?</Text>
            <Text style={[ui.muted, { textAlign: 'center', marginTop: 4 }]}>Inscription gratuite, paiements Mobile Money, tableau de bord des ventes.</Text>
            <Button title={isSeller ? 'Gérer ma boutique' : 'Je veux vendre sur Ivoire Style'} icon="store" onPress={sell} style={{ marginTop: 14, alignSelf: 'stretch' }} />
          </View>
        </>
      )}
    </ScrollView>
  );
}
