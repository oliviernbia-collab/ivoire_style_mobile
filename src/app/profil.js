import { Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Field, Screen, styles as ui, useForm } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { api } from '../lib/api';

export default function Profil() {
  const { user, setUser, logout } = useAuth();
  const { confirm, showResult } = useFeedback();
  const profile = useForm({ first_name: user?.first_name || '', last_name: user?.last_name || '', phone: user?.phone || '' });
  const pwd = useForm({ current_password: '', new_password: '', confirm: '' });

  const saveProfile = profile.submit(async (v) => {
    const res = await api.patch('/auth/me', v);
    setUser(res.data);
    return res;
  });
  const savePwd = pwd.submit(async (v) => {
    const res = await api.post('/auth/change-password', { current_password: v.current_password, new_password: v.new_password });
    pwd.setValues({ current_password: '', new_password: '', confirm: '' });
    return res;
  }, { validate: (v) => ({ confirm: v.new_password !== v.confirm && 'Les mots de passe ne correspondent pas' }) });

  const remove = async () => {
    const ok = await confirm({ type: 'error', title: 'Supprimer votre compte ?', message: 'Vos données personnelles seront anonymisées. Cette action est définitive.', confirmLabel: 'Supprimer', danger: true });
    if (!ok) return;
    await api.del('/auth/me');
    await logout();
    await showResult({ type: 'info', title: 'Compte supprimé', message: 'Merci d’avoir utilisé Ivoire Style.' });
    router.replace('/');
  };

  if (!user) return null;
  return (
    <Screen>
      <Card>
        <Text style={[ui.h3, { marginBottom: 12 }]}>Informations personnelles</Text>
        <Field label="Prénom" value={profile.values.first_name} onChangeText={profile.set('first_name')} error={profile.errors.first_name} />
        <Field label="Nom" value={profile.values.last_name} onChangeText={profile.set('last_name')} error={profile.errors.last_name} />
        <Field label="E-mail" value={user.email} editable={false} hint="L’e-mail ne peut pas être modifié" />
        <Field label="Téléphone" keyboardType="phone-pad" value={profile.values.phone} onChangeText={profile.set('phone')} error={profile.errors.phone} />
        <Button title="Enregistrer" icon="floppy-disk" onPress={saveProfile} loading={profile.submitting} />
      </Card>
      <Card>
        <Text style={[ui.h3, { marginBottom: 12 }]}>Mot de passe</Text>
        <Field label="Mot de passe actuel" secureTextEntry value={pwd.values.current_password} onChangeText={pwd.set('current_password')} error={pwd.errors.current_password} />
        <Field label="Nouveau mot de passe" secureTextEntry value={pwd.values.new_password} onChangeText={pwd.set('new_password')} error={pwd.errors.new_password} hint="8 caractères min., lettres et chiffres" />
        <Field label="Confirmation" secureTextEntry value={pwd.values.confirm} onChangeText={pwd.set('confirm')} error={pwd.errors.confirm} />
        <Button title="Modifier le mot de passe" icon="key" onPress={savePwd} loading={pwd.submitting} />
      </Card>
      <Button title="Supprimer mon compte" icon="trash-can" variant="danger" onPress={remove} />
    </Screen>
  );
}
