import { useEffect, useState } from 'react';
import { Image, Pressable, Switch, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Icon } from '../components/Icon';
import { Button, Card, Field, Loader, Screen, styles as ui, useFetch, useForm } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { api } from '../lib/api';
import { PaymentChips } from '../components/PaymentLogo';
import { PAYOUT_METHODS } from '../lib/format';
import { colors, radius } from '../lib/theme';

const BENEFITS = [
  ['store', 'Votre boutique en ligne, visible sur le web et l’application'],
  ['wallet', 'Paiements Mobile Money et reversements suivis'],
  ['chart-line', 'Tableau de bord : ventes, commandes, stocks'],
  ['truck-fast', 'Des clients dans toute la Côte d’Ivoire'],
];

function PhotoPicker({ label, file, onPick, icon, error, hint }) {
  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled) onPick(res.assets[0]);
  };
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={ui.label}>{label}</Text>
      <Pressable onPress={pick} style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: error ? colors.danger : file ? colors.gold : colors.line, borderRadius: radius.md, padding: 16, alignItems: 'center', backgroundColor: file ? colors.goldSoft : '#fff' }}>
        {file ? <Image source={{ uri: file.uri }} style={{ width: 90, height: 90, borderRadius: 10 }} /> : <Icon name={icon} size={26} color={colors.gold} />}
        <Text style={[ui.small, { marginTop: 8 }]}>{file ? 'Touchez pour changer' : 'Touchez pour choisir une photo'}</Text>
      </Pressable>
      {error ? <Text style={ui.error}>{error}</Text> : hint ? <Text style={ui.hint}>{hint}</Text> : null}
    </View>
  );
}

const asFile = (a, fallback) => ({ uri: a.uri, name: a.fileName || `${fallback}.jpg`, type: a.mimeType || 'image/jpeg' });

export default function Vendre() {
  const { user, ready, setUser } = useAuth();
  const { showResult } = useFeedback();
  const shop = user?.shop;
  const rejected = shop?.status === 'rejected';
  const prev = useFetch(rejected ? '/seller/shop' : null);
  const [logo, setLogo] = useState(null);
  const [doc, setDoc] = useState(null);
  const { values, set, setValues, errors, submitting, submit } = useForm({
    shop_name: '', responsible_name: user ? `${user.first_name} ${user.last_name}` : '', phone: user?.phone || '', email: user?.email || '',
    city: 'Abidjan', commune: '', address: '', description: '', rccm: '', payout_method: 'orange_money', payout_account: user?.phone || '', payout_holder: user ? `${user.first_name} ${user.last_name}` : '', accept_terms: false,
  });
  // Après un refus : pré-remplissage avec la demande précédente
  useEffect(() => {
    const s = prev.data;
    if (!s) return;
    setValues((v) => ({ ...v, shop_name: s.name, responsible_name: s.responsible_name, phone: s.phone, email: s.email, city: s.city, commune: s.commune || '', address: s.address || '', description: s.description || '', rccm: s.rccm || '', payout_method: s.payout_method || 'orange_money', payout_account: s.payout_account || '', payout_holder: s.payout_holder || v.payout_holder }));
  }, [prev.data, setValues]);

  if (!ready) return <Loader />;

  if (!user) {
    return (
      <Screen>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Icon name="handshake" size={40} color={colors.gold} />
          <Text style={[ui.h1, { textAlign: 'center', marginTop: 10 }]}>Je veux vendre sur Ivoire Style</Text>
          <Text style={[ui.muted, { textAlign: 'center', marginTop: 8 }]}>Créez votre compte (ou connectez-vous), puis envoyez votre demande d’ouverture de boutique. Validation sous 48 h.</Text>
        </View>
        {BENEFITS.map(([i, t]) => (
          <View key={t} style={[ui.row, { marginBottom: 12 }]}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name={i} size={16} color={colors.goldDark} /></View>
            <Text style={{ flex: 1, color: colors.ink2 }}>{t}</Text>
          </View>
        ))}
        <Button title="Créer mon compte" icon="user-plus" onPress={() => router.push('/inscription')} style={{ marginTop: 10 }} />
        <Button title="J’ai déjà un compte" icon="right-to-bracket" variant="outline" onPress={() => router.push('/connexion')} style={{ marginTop: 10 }} />
      </Screen>
    );
  }
  if (shop?.status === 'approved') return <Redirect href="/vendeur" />;
  if (shop && !rejected) {
    return (
      <Screen>
        <View style={{ alignItems: 'center', paddingTop: 30 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.warningBg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={shop.status === 'pending' ? 'hourglass-half' : 'ban'} size={34} color={colors.warning} />
          </View>
          <Text style={[ui.h2, { marginTop: 14, textAlign: 'center' }]}>{shop.status === 'pending' ? 'Demande en cours de validation' : 'Boutique suspendue'}</Text>
          <Text style={[ui.muted, { textAlign: 'center', marginTop: 8 }]}>
            {shop.status === 'pending' ? `La boutique « ${shop.name} » est en cours de vérification. Vous serez notifié dès sa validation.` : shop.rejection_reason}
          </Text>
          <Button title="Mes notifications" icon="bell" variant="outline" onPress={() => router.push('/notifications')} style={{ marginTop: 20, alignSelf: 'stretch' }} />
        </View>
      </Screen>
    );
  }

  const onSubmit = submit(async (v) => {
    const fd = new FormData();
    Object.entries(v).forEach(([k, val]) => fd.append(k, String(val ?? '')));
    if (logo) fd.append('logo', asFile(logo, 'logo'));
    if (doc) fd.append('document', asFile(doc, 'justificatif'));
    const res = await api.post('/seller/apply', fd);
    setUser(res.data.user);
    await showResult({ icon: 'paper-plane', title: 'Demande envoyée !', message: 'Notre équipe vérifie votre boutique sous 48 h. Vous serez notifié dès sa validation.', confirmLabel: 'Compris' });
  }, {
    toastSuccess: false,
    validate: (v) => ({
      document: !doc && !rejected && 'Ajoutez une photo de votre pièce d’identité ou RCCM',
      accept_terms: !v.accept_terms && 'Vous devez accepter les conditions vendeurs',
    }),
  });

  return (
    <Screen>
      {rejected && <Card style={{ backgroundColor: colors.dangerBg, borderColor: '#F2C7C2' }}><Text style={{ color: colors.danger }}>Votre précédente demande a été refusée. Motif : {shop.rejection_reason}. Corrigez puis renvoyez-la.</Text></Card>}
      <Text style={[ui.muted, { marginBottom: 14 }]}>Présentez votre boutique : chaque vendeur est vérifié pour garantir la confiance des clients.</Text>
      <Card>
        <Text style={[ui.h3, { marginBottom: 12 }]}><Icon name="store" size={14} color={colors.gold} />  Votre boutique</Text>
        <Field label="Nom commercial" required value={values.shop_name} onChangeText={set('shop_name')} error={errors.shop_name} placeholder="Ex. : Maison Akwaba" />
        <Field label="Responsable" required value={values.responsible_name} onChangeText={set('responsible_name')} error={errors.responsible_name} />
        <Field label="Description" required multiline value={values.description} onChangeText={set('description')} error={errors.description} hint="Spécialité, style, atouts (20 caractères min.)" />
        <PhotoPicker label="Logo (facultatif)" icon="image" file={logo} onPick={setLogo} />
        <Field label="N° RCCM (facultatif)" value={values.rccm} onChangeText={set('rccm')} />
      </Card>
      <Card>
        <Text style={[ui.h3, { marginBottom: 12 }]}><Icon name="id-card" size={14} color={colors.gold} />  Coordonnées</Text>
        <Field label="Téléphone" required keyboardType="phone-pad" value={values.phone} onChangeText={set('phone')} error={errors.phone} />
        <Field label="E-mail professionnel" required keyboardType="email-address" autoCapitalize="none" value={values.email} onChangeText={set('email')} error={errors.email} />
        <Field label="Ville" required value={values.city} onChangeText={set('city')} error={errors.city} />
        <Field label="Commune" value={values.commune} onChangeText={set('commune')} />
        <Field label="Adresse de l’atelier" value={values.address} onChangeText={set('address')} />
      </Card>
      <Card>
        <Text style={[ui.h3, { marginBottom: 12 }]}><Icon name="file-shield" size={14} color={colors.gold} />  Justificatif et reversements</Text>
        <PhotoPicker label="Pièce d’identité ou RCCM *" icon="id-card" file={doc} onPick={setDoc} error={errors.document}
          hint={rejected ? 'Facultatif si déjà fournie' : 'Stockée de façon privée et sécurisée'} />
        <Text style={ui.label}>Mode de reversement</Text>
        <View style={{ marginBottom: 12 }}>
          <PaymentChips codes={Object.keys(PAYOUT_METHODS)} value={values.payout_method} onChange={set('payout_method')} />
        </View>
        <Field label="Numéro / compte de reversement" required value={values.payout_account} onChangeText={set('payout_account')} error={errors.payout_account} />
        <Field label="Nom du titulaire du compte" value={values.payout_holder} onChangeText={set('payout_holder')} error={errors.payout_holder} />
        <Text style={[ui.small, { color: colors.goldDeep }]}>Vous fixez votre prix : la plateforme ajoute 5 % payés par le client et retient 5 % de commission sur votre prix au reversement. Vous gérez vos livraisons (frais pour vous) ; l’argent payé en ligne vous est reversé automatiquement après livraison.</Text>
      </Card>
      <View style={[ui.row, { marginBottom: 6 }]}>
        <Switch value={values.accept_terms} onValueChange={set('accept_terms')} trackColor={{ true: colors.gold }} thumbColor="#fff" />
        <Text style={[ui.muted, { flex: 1 }]}>J’accepte les conditions vendeurs et certifie l’exactitude des informations.</Text>
      </View>
      {errors.accept_terms && <Text style={ui.error}>{errors.accept_terms}</Text>}
      <Button title="Envoyer ma demande" icon="paper-plane" size="lg" onPress={onSubmit} loading={submitting} style={{ marginTop: 14 }} />
    </Screen>
  );
}
