import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { Icon } from '../../components/Icon';
import { useCart } from '../../context/CartContext';
import { colors } from '../../lib/theme';

function TabIcon({ name, color, badge }) {
  return (
    <View>
      <Icon name={name} size={20} color={color} />
      {badge > 0 && (
        <View style={{ position: 'absolute', top: -6, right: -10, backgroundColor: colors.gold, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.ink }}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { cart } = useCart();
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.goldDark,
      tabBarInactiveTintColor: '#9A9A9A',
      tabBarStyle: { backgroundColor: '#fff', borderTopColor: colors.line, height: 62, paddingTop: 6 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
      headerStyle: { backgroundColor: '#fff' },
      headerShadowVisible: false,
      headerTitleStyle: { fontWeight: '800' },
      sceneStyle: { backgroundColor: '#fff' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Accueil', headerShown: false, tabBarIcon: ({ color }) => <TabIcon name="house" color={color} /> }} />
      <Tabs.Screen name="catalogue" options={{ title: 'Catalogue', tabBarIcon: ({ color }) => <TabIcon name="magnifying-glass" color={color} /> }} />
      <Tabs.Screen name="favoris" options={{ title: 'Favoris', tabBarIcon: ({ color }) => <TabIcon name="heart" color={color} /> }} />
      <Tabs.Screen name="panier" options={{ title: 'Panier', tabBarIcon: ({ color }) => <TabIcon name="cart-shopping" color={color} badge={cart.count} /> }} />
      <Tabs.Screen name="compte" options={{ title: 'Compte', tabBarIcon: ({ color }) => <TabIcon name="user" color={color} /> }} />
    </Tabs>
  );
}
