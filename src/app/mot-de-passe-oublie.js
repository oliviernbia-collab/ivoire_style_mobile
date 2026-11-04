import { Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Field, Screen, styles as ui, useForm } from '../components/ui';
import { useFeedback } from '../context/FeedbackContext';
import { api } from '../lib/api';

export default function MotDePasseOublie() {
  const { showResult } = useFeedback();
  const { values, set, errors, submitting, submit } = useForm({ email: '' });
  const onSubmit = submit(async (v) => {
    const res = await api.post('/auth/forgot-password', { email: v.email.trim() });
    await showResult({ type: 'info', icon: 'envelope', title: 'Vérifiez vos e-mails', message: res.message, confirmLabel: 'Compris' });
    router.back();
  }, { toastSuccess: false });
  return (
    <Screen>
      <Text style={[ui.muted, { marginBottom: 16 }]}>Saisissez votre e-mail : vous recevrez un lien pour choisir un nouveau mot de passe.</Text>
      <Field label="E-mail" icon="envelope" value={values.email} onChangeText={set('email')} error={errors.email} autoCapitalize="none" keyboardType="email-address" />
      <Button title="Envoyer le lien" icon="key" onPress={onSubmit} loading={submitting} />
    </Screen>
  );
}
