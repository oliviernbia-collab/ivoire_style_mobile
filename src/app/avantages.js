import { Share, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Icon } from '../components/Icon';
import { Badge, Button, Card, Empty, ErrorView, Loader, Screen, styles as ui, useFetch } from '../components/ui';
import { date, price } from '../lib/format';
import { colors, radius } from '../lib/theme';

/** Codes promo personnels offerts aux clients actifs. */
export default function Avantages() {
  const { data, loading, error, reload } = useFetch('/account/promotions');
  if (loading) return <Loader />;
  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data.length) {
    return <Empty icon="gift" title="Aucun avantage pour le moment" text="Nos clients les plus fidèles reçoivent régulièrement des codes promo personnels." />;
  }
  return (
    <Screen>
      {data.map((p) => (
        <Card key={p.id} style={{ backgroundColor: colors.goldSoft, borderColor: colors.goldLight }}>
          <View style={ui.between}>
            <Badge tone="gold" label={p.discount_type === 'percent' ? `-${Number(p.discount_value)} %` : `-${price(p.discount_value)}`} />
            {p.ends_at && <Text style={ui.small}>Jusqu’au {date(p.ends_at)}</Text>}
          </View>
          <Text style={[ui.h3, { marginTop: 8 }]}>{p.title}</Text>
          {p.description ? <Text style={[ui.small, { marginTop: 2 }]}>{p.description}</Text> : null}
          <Text style={[ui.small, { marginTop: 6 }]}>
            {Number(p.min_order_amount) > 0 ? `Dès ${price(p.min_order_amount)} d’achat · ` : ''}
            {p.remaining_uses} utilisation{p.remaining_uses > 1 ? 's' : ''} restante{p.remaining_uses > 1 ? 's' : ''}
          </Text>
          <View style={[ui.row, { marginTop: 10 }]}>
            <View style={{ flex: 1, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.gold, borderRadius: radius.sm, paddingVertical: 8, alignItems: 'center', backgroundColor: '#fff' }}>
              <Text style={{ fontSize: 17, fontWeight: '800', letterSpacing: 1, color: colors.ink }} selectable>{p.code}</Text>
            </View>
            <Button title="Partager" icon="share-nodes" variant="outline" size="sm" block={false}
              onPress={() => Share.share({ message: `Mon code Ivoire Style : ${p.code}` })} />
          </View>
          <Button title="J’en profite" icon="bag-shopping" size="sm" style={{ marginTop: 10 }} onPress={() => router.push('/catalogue')} />
        </Card>
      ))}
      <Text style={[ui.small, { textAlign: 'center' }]}><Icon name="circle-info" size={11} color={colors.muted} /> Saisissez le code à la validation de votre commande.</Text>
    </Screen>
  );
}
