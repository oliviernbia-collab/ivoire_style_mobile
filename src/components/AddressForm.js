import { KeyboardAvoidingView, Modal, Platform, ScrollView, Switch, Text, View } from 'react-native';
import { Button, Chip, Field, styles as ui, useForm } from './ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { colors } from '../lib/theme';

const CITIES = ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Daloa', 'Korhogo', 'Man', 'Gagnoa', 'Grand-Bassam', 'Abengourou'];
// À Abidjan, la commune détermine le tarif de livraison de chaque boutique
const ABIDJAN_COMMUNES = ['Abobo', 'Adjamé', 'Attécoubé', 'Cocody', 'Koumassi', 'Marcory', 'Plateau', 'Port-Bouët', 'Treichville', 'Yopougon', 'Bingerville', 'Songon', 'Anyama'];

export default function AddressForm({ address, visible, onClose, onSaved }) {
  const { user } = useAuth();
  const { values, set, errors, submitting, submit } = useForm({
    label: address?.label || 'Domicile',
    recipient_name: address?.recipient_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
    phone: address?.phone || user?.phone || '',
    city: address?.city || 'Abidjan',
    commune: address?.commune || '',
    district: address?.district || '',
    street: address?.street || '',
    instructions: address?.instructions || '',
    is_default: Boolean(address?.is_default),
  });
  const onSubmit = submit(async (v) => {
    const res = address?.id ? await api.put(`/account/addresses/${address.id}`, v) : await api.post('/account/addresses', v);
    onSaved(res.data);
    return res;
  });
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 28 }} keyboardShouldPersistTaps="handled">
          <Text style={[ui.h2, { marginBottom: 16 }]}>{address?.id ? 'Modifier l’adresse' : 'Nouvelle adresse'}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {['Domicile', 'Bureau', 'Famille', 'Autre'].map((l) => <Chip key={l} label={l} on={values.label === l} onPress={() => set('label')(l)} />)}
          </View>
          <Field label="Destinataire" required value={values.recipient_name} onChangeText={set('recipient_name')} error={errors.recipient_name} />
          <Field label="Téléphone" required keyboardType="phone-pad" value={values.phone} onChangeText={set('phone')} error={errors.phone} />
          <Text style={ui.label}>Ville *</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {CITIES.map((c) => <Chip key={c} label={c} on={values.city === c} onPress={() => set('city')(c)} />)}
          </View>
          <Field placeholder="Autre ville" value={values.city} onChangeText={set('city')} error={errors.city} />
          {/abidjan/i.test(values.city) && (
            <>
              <Text style={ui.label}>Commune *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {ABIDJAN_COMMUNES.map((c) => <Chip key={c} label={c} on={values.commune === c} onPress={() => set('commune')(c)} />)}
              </View>
            </>
          )}
          <Field label={/abidjan/i.test(values.city) ? undefined : 'Commune'} value={values.commune} onChangeText={set('commune')} placeholder="Ex. : Cocody" error={errors.commune} />
          <Field label="Quartier" value={values.district} onChangeText={set('district')} placeholder="Ex. : Riviera 2" />
          <Field label="Rue ou repère" value={values.street} onChangeText={set('street')} placeholder="Ex. : derrière la pharmacie" />
          <Field label="Instructions au livreur" value={values.instructions} onChangeText={set('instructions')} />
          <View style={[ui.row, { marginBottom: 18 }]}>
            <Switch value={values.is_default} onValueChange={set('is_default')} trackColor={{ true: colors.gold }} thumbColor="#fff" />
            <Text style={ui.muted}>Adresse par défaut</Text>
          </View>
          <Button title="Enregistrer" icon="floppy-disk" onPress={onSubmit} loading={submitting} />
          <Button title="Annuler" variant="ghost" onPress={onClose} style={{ marginTop: 8 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
