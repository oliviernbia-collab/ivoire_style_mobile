import { Pressable, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Field, Screen, styles as ui, useForm } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { colors } from '../lib/theme';

export default function Inscription() {
  const { register } = useAuth();
  const { showResult } = useFeedback();
  const { values, set, errors, submitting, submit } = useForm({
    first_name: '', last_name: '', email: '', phone: '', password: '', confirm: '', accept: false,
  });

  const onSubmit = submit(async (v) => {
    const { confirm: _c, accept: _a, ...form } = v;
    const res = await register(form);
    await showResult({ title: `Bienvenue ${res.data.user.first_name} !`, message: 'Votre compte Ivoire Style a été créé avec succès.', confirmLabel: 'Commencer' });
    router.back();
  }, {
    toastSuccess: false,
    validate: (v) => ({
      confirm: v.password !== v.confirm && 'Les mots de passe ne correspondent pas',
      accept: !v.accept && 'Veuillez accepter les conditions d’utilisation',
    }),
  });

  return (
    <Screen>
      <Text style={[ui.muted, { marginBottom: 16 }]}>Inscription gratuite en moins d’une minute.</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field style={{ flex: 1 }} label="Prénom" required value={values.first_name} onChangeText={set('first_name')} error={errors.first_name} autoComplete="given-name" />
        <Field style={{ flex: 1 }} label="Nom" required value={values.last_name} onChangeText={set('last_name')} error={errors.last_name} autoComplete="family-name" />
      </View>
      <Field label="E-mail" required icon="envelope" value={values.email} onChangeText={set('email')} error={errors.email} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Téléphone" required icon="phone" value={values.phone} onChangeText={set('phone')} error={errors.phone} keyboardType="phone-pad" hint="Ex. : 07 07 07 07 07" />
      <Field label="Mot de passe" required icon="lock" value={values.password} onChangeText={set('password')} error={errors.password} secureTextEntry hint="8 caractères min., lettres et chiffres" />
      <Field label="Confirmation" required icon="lock" value={values.confirm} onChangeText={set('confirm')} error={errors.confirm} secureTextEntry />
      <View style={[ui.row, { marginBottom: 6 }]}>
        <Switch value={values.accept} onValueChange={set('accept')} trackColor={{ true: colors.gold }} thumbColor="#fff" />
        <Text style={[ui.muted, { flex: 1 }]}>J’accepte les conditions d’utilisation et la politique de confidentialité.</Text>
      </View>
      {errors.accept && <Text style={ui.error}>{errors.accept}</Text>}
      <Button title="Créer mon compte" icon="user-plus" onPress={onSubmit} loading={submitting} size="lg" style={{ marginTop: 14 }} />
      <Pressable onPress={() => router.replace('/connexion')} style={{ marginTop: 20, alignItems: 'center' }}>
        <Text style={ui.muted}>Déjà inscrit ? <Text style={{ color: colors.goldDark, fontWeight: '700' }}>Se connecter</Text></Text>
      </Pressable>
    </Screen>
  );
}
