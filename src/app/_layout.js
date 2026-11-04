import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { FeedbackProvider } from '../context/FeedbackContext';
import { RealtimeProvider } from '../context/RealtimeContext';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <FeedbackProvider>
        <AuthProvider>
          <RealtimeProvider>
          <CartProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{
              headerTintColor: colors.ink,
              headerStyle: { backgroundColor: colors.bg },
              headerTitleStyle: { fontWeight: '700' },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.bg },
              headerBackButtonDisplayMode: 'minimal',
            }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="connexion" options={{ title: 'Connexion', presentation: 'modal' }} />
              <Stack.Screen name="inscription" options={{ title: 'Créer un compte', presentation: 'modal' }} />
              {/* Ouvert depuis la modale de connexion : présentation explicite en modale */}
              <Stack.Screen name="mot-de-passe-oublie" options={{ title: 'Mot de passe oublié', presentation: 'modal' }} />
              <Stack.Screen name="produit/[slug]" options={{ title: '' }} />
              <Stack.Screen name="boutique/[slug]" options={{ title: 'Boutique' }} />
              <Stack.Screen name="commande" options={{ title: 'Validation de la commande' }} />
              <Stack.Screen name="paiement/[id]" options={{ title: 'Paiement' }} />
              <Stack.Screen name="commandes/index" options={{ title: 'Mes commandes' }} />
              <Stack.Screen name="commandes/[id]" options={{ title: 'Commande' }} />
              <Stack.Screen name="adresses" options={{ title: 'Mes adresses' }} />
              <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
              <Stack.Screen name="profil" options={{ title: 'Mon profil' }} />
              <Stack.Screen name="vendre" options={{ title: 'Vendre sur Ivoire Style' }} />
              <Stack.Screen name="vendeur" options={{ title: 'Espace vendeur' }} />
              <Stack.Screen name="aide" options={{ title: 'Service client' }} />
              <Stack.Screen name="avantages" options={{ title: 'Mes avantages' }} />
            </Stack>
          </CartProvider>
          </RealtimeProvider>
        </AuthProvider>
      </FeedbackProvider>
    </SafeAreaProvider>
  );
}
