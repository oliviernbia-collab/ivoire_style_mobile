import { Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Field, Screen, styles as ui, useForm } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { colors } from '../lib/theme';

export default function Connexion() {
  const { login } = useAuth();
  const { reload } = useCart();
  const { values, set, errors, submitting, submit } = useForm({ login: '', password: '' });

  const onSubmit = submit(async (v) => {
    const res = await login(v.login.trim(), v.password);
    await reload();
    router.back();
    return { message: `Bon retour parmi nous, ${res.data.user.first_name} !` };
  });

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginBottom: 18 }}>
        <Image source={require('../../assets/logo.png')} style={{ width: 170, height: 140 }} resizeMode="contain" />
      </View>
      <Field label="E-mail ou téléphone" icon="envelope" value={values.login} onChangeText={set('login')} error={errors.login}
        autoCapitalize="none" keyboardType="email-address" autoComplete="username" />
      <Field label="Mot de passe" icon="lock" value={values.password} onChangeText={set('password')} error={errors.password}
        secureTextEntry autoComplete="current-password" onSubmitEditing={onSubmit} />
      <Pressable onPress={() => router.push('/mot-de-passe-oublie')} style={{ alignSelf: 'flex-end', marginBottom: 16 }}>
        <Text style={ui.link}>Mot de passe oublié ?</Text>
      </Pressable>
      <Button title="Se connecter" icon="right-to-bracket" onPress={onSubmit} loading={submitting} size="lg" />
      <Pressable onPress={() => router.replace('/inscription')} style={{ marginTop: 20, alignItems: 'center' }}>
        <Text style={ui.muted}>Pas encore de compte ? <Text style={{ color: colors.goldDark, fontWeight: '700' }}>Créer un compte</Text></Text>
      </Pressable>
    </Screen>
  );
}
