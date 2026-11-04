import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Icon } from '../../components/Icon';
import { Button, Card, Screen, styles as ui } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useFeedback } from '../../context/FeedbackContext';
import { colors } from '../../lib/theme';

function Row({ icon, label, onPress, color, right }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [ui.row, { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line2 }, pressed && { opacity: 0.6 }]}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={15} color={color || colors.goldDark} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, color: color || colors.ink }}>{label}</Text>
      {right}
      <Icon name="chevron-right" size={12} color={colors.muted} />
    </Pressable>
  );
}

export default function Compte() {
  const { user, logout } = useAuth();
  const { reload } = useCart();
  const { confirm, notify } = useFeedback();

  if (!user) {
    return (
      <Screen>
        <Card style={{ alignItems: 'center', padding: 24 }}>
          <Icon name="circle-user" size={54} color={colors.gold} />
          <Text style={[ui.h2, { marginTop: 10 }]}>Bienvenue sur Ivoire Style</Text>
          <Text style={[ui.muted, { textAlign: 'center', marginVertical: 8 }]}>Connectez-vous pour suivre vos commandes, vos favoris et votre panier.</Text>
          <Button title="Se connecter" icon="right-to-bracket" onPress={() => router.push('/connexion')} style={{ alignSelf: 'stretch', marginTop: 8 }} />
          <Button title="Créer un compte" icon="user-plus" variant="outline" onPress={() => router.push('/inscription')} style={{ alignSelf: 'stretch', marginTop: 10 }} />
        </Card>
        <Card>
          <Row icon="store" label="Je veux vendre sur Ivoire Style" onPress={() => router.push('/vendre')} />
          <Row icon="headset" label="Service client et FAQ" onPress={() => router.push('/aide')} />
        </Card>
      </Screen>
    );
  }

  const doLogout = async () => {
    if (!(await confirm({ title: 'Se déconnecter ?', confirmLabel: 'Me déconnecter' }))) return;
    await logout();
    await reload();
    notify.success('Vous êtes déconnecté. À bientôt !');
  };

  const shop = user.shop;
  return (
    <Screen>
      <Card style={[ui.row, { padding: 18 }]}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontWeight: '800', fontSize: 18, color: colors.ink }}>{user.first_name[0]}{user.last_name[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ui.h2}>{user.first_name} {user.last_name}</Text>
          <Text style={ui.small}>{user.email}</Text>
        </View>
      </Card>
      <Card>
        <Row icon="box-open" label="Mes commandes" onPress={() => router.push('/commandes')} />
        <Row icon="location-dot" label="Mes adresses" onPress={() => router.push('/adresses')} />
        <Row icon="heart" label="Mes favoris" onPress={() => router.push('/favoris')} />
        <Row icon="gift" label="Mes avantages" onPress={() => router.push('/avantages')} />
        <Row icon="bell" label="Notifications" onPress={() => router.push('/notifications')} />
        <Row icon="user-pen" label="Profil et mot de passe" onPress={() => router.push('/profil')} />
      </Card>
      <Card>
        {shop?.status === 'approved'
          ? <Row icon="store" label={`Espace vendeur · ${shop.name}`} onPress={() => router.push('/vendeur')} />
          : <Row icon="store" label={shop?.status === 'pending' ? 'Demande vendeur en cours' : 'Je veux vendre sur Ivoire Style'} onPress={() => router.push('/vendre')} />}
        <Row icon="headset" label="Service client et FAQ" onPress={() => router.push('/aide')} />
        <Row icon="right-from-bracket" label="Déconnexion" color={colors.danger} onPress={doLogout} />
      </Card>
    </Screen>
  );
}
