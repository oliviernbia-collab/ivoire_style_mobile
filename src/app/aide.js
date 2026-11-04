import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { Button, Card, Screen, styles as ui, useFetch } from '../components/ui';
import { colors } from '../lib/theme';

const FAQ = [
  ['Comment passer commande ?', 'Choisissez taille et couleur, ajoutez au panier puis validez adresse, livraison et paiement.'],
  ['Quels moyens de paiement ?', 'Orange Money, MTN MoMo, Wave, Moov Money et le paiement à la livraison selon les cas.'],
  ['Délais de livraison ?', 'En général 24 à 72 h à Abidjan et 2 à 5 jours à l’intérieur du pays.'],
  ['Puis-je annuler ?', 'Oui, tant que la commande n’est pas en préparation. Après livraison, un retour est possible sous 7 jours.'],
  ['Comment devenir vendeur ?', 'Depuis l’accueil, touchez « Je veux vendre sur Ivoire Style » et remplissez la demande.'],
];

export default function Aide() {
  const { data: s } = useFetch('/settings/public');
  const [open, setOpen] = useState(0);
  const phone = s?.contact_phone || '+225 07 12176799';
  const email = s?.contact_email || 'contact@ivoirestyle.ci';
  return (
    <Screen>
      <Card style={{ gap: 10 }}>
        <Text style={ui.h3}>Nous contacter</Text>
        <Button title={`Appeler le ${phone}`} icon="phone" onPress={() => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)} />
        <Button title="WhatsApp" icon="comment" variant="outline" onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)} />
        <Button title={email} icon="envelope" variant="outline" onPress={() => Linking.openURL(`mailto:${email}`)} />
      </Card>
      <Text style={[ui.h3, { marginVertical: 10 }]}>Questions fréquentes</Text>
      {FAQ.map(([q, a], i) => (
        <Pressable key={q} style={ui.card} onPress={() => setOpen(open === i ? -1 : i)}>
          <View style={ui.between}><Text style={{ fontWeight: '600', flex: 1 }}>{q}</Text><Icon name={open === i ? 'chevron-up' : 'chevron-down'} size={12} color={colors.goldDark} /></View>
          {open === i && <Text style={[ui.muted, { marginTop: 8 }]}>{a}</Text>}
        </Pressable>
      ))}
    </Screen>
  );
}
