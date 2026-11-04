import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Icon } from './Icon';
import { Button } from './ui';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { api, fileUrl } from '../lib/api';
import { colors } from '../lib/theme';

const initials = (u) => `${u?.first_name?.[0] || ''}${u?.last_name?.[0] || ''}`.toUpperCase();

/** Avatar d'un utilisateur : sa photo de profil, sinon ses initiales. */
export function UserAvatar({ user, size = 56, uri }) {
  const src = uri || (user?.avatar_url ? fileUrl(user.avatar_url, { w: size * 3 }) : null);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {src
        ? <Image source={{ uri: src }} style={{ width: size, height: size }} accessibilityLabel="Photo de profil" />
        : <Text style={{ fontWeight: '800', fontSize: size * 0.32, color: colors.ink }}>{initials(user)}</Text>}
    </View>
  );
}

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 5;

/** Photo de profil modifiable : galerie ou appareil photo (recadrage carré), envoi, suppression. */
export function AvatarEditor() {
  const { user, setUser } = useAuth();
  const { notify, confirm } = useFeedback();
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const upload = async (asset) => {
    const type = asset.mimeType || 'image/jpeg';
    if (!TYPES.includes(type)) { notify.error('Formats acceptés : JPG, PNG ou WEBP'); return; }
    if (asset.fileSize && asset.fileSize > MAX_MB * 1024 * 1024) { notify.error(`Photo trop lourde (${MAX_MB} Mo maximum)`); return; }
    setPreview(asset.uri);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('avatar', { uri: asset.uri, name: asset.fileName || `profil.${type.split('/')[1]}`, type });
      const res = await api.put('/auth/me/avatar', fd);
      setUser(res.data);
      notify.success(res.message);
    } catch (e) {
      notify.error(e.message);
    } finally {
      setBusy(false);
      setPreview(null);
    }
  };

  const options = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 };
  const fromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync(options);
    if (!res.canceled) upload(res.assets[0]);
  };
  const fromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { notify.error('Autorisez l’accès à l’appareil photo dans les réglages du téléphone'); return; }
    const res = await ImagePicker.launchCameraAsync(options);
    if (!res.canceled) upload(res.assets[0]);
  };
  const remove = async () => {
    if (!(await confirm({ title: 'Retirer votre photo de profil ?', message: 'Vos initiales seront affichées à la place.', confirmLabel: 'Retirer', danger: true }))) return;
    setBusy(true);
    try {
      const res = await api.del('/auth/me/avatar');
      setUser(res.data);
      notify.success(res.message);
    } catch (e) { notify.error(e.message); } finally { setBusy(false); }
  };

  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <Pressable onPress={fromLibrary} disabled={busy} accessibilityRole="button"
        accessibilityLabel={user.avatar_url ? 'Changer la photo de profil' : 'Ajouter une photo de profil'}>
        <UserAvatar user={user} size={104} uri={preview} />
        <View style={{ position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.gold,
          alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' }}>
          {busy ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="camera" size={14} color="#fff" />}
        </View>
      </Pressable>
      <Text style={{ fontSize: 12, color: colors.muted }}>JPG, PNG ou WEBP, {MAX_MB} Mo maximum</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button title="Galerie" icon="image" size="sm" block={false} disabled={busy} onPress={fromLibrary} />
        <Button title="Appareil photo" icon="camera" size="sm" variant="outline" block={false} disabled={busy} onPress={fromCamera} />
        {user.avatar_url && <Button title="Retirer" icon="trash-can" size="sm" variant="ghost" block={false} disabled={busy} onPress={remove} />}
      </View>
    </View>
  );
}
