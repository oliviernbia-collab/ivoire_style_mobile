import { useState } from 'react';
import { Text, View } from 'react-native';
import AddressForm from '../components/AddressForm';
import { Badge, Button, Card, Empty, ErrorView, Loader, Screen, styles as ui, useFetch } from '../components/ui';
import { useFeedback } from '../context/FeedbackContext';
import { api } from '../lib/api';

export default function Adresses() {
  const { data, loading, error, reload } = useFetch('/account/addresses');
  const { confirm, notify } = useFeedback();
  const [editing, setEditing] = useState(null);

  const del = async (a) => {
    if (!(await confirm({ title: 'Supprimer cette adresse ?', message: `${a.label} – ${a.city}`, confirmLabel: 'Supprimer', danger: true }))) return;
    try { const res = await api.del(`/account/addresses/${a.id}`); notify.success(res.message); reload(); } catch (e) { notify.error(e.message); }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorView message={error} onRetry={reload} />;
  return (
    <Screen>
      {data.length === 0 && <Empty icon="location-dot" title="Aucune adresse" text="Ajoutez une adresse pour accélérer vos commandes." />}
      {data.map((a) => (
        <Card key={a.id}>
          <View style={ui.between}><Text style={ui.h3}>{a.label}</Text>{a.is_default ? <Badge label="Par défaut" tone="gold" /> : null}</View>
          <Text style={[ui.muted, { marginVertical: 6 }]}>{a.recipient_name} · {a.phone}{'\n'}{[a.street, a.district, a.commune, a.city].filter(Boolean).join(', ')}</Text>
          <View style={ui.row}>
            <Button title="Modifier" icon="pen" size="sm" variant="outline" block={false} onPress={() => setEditing(a)} />
            <Button title="Supprimer" icon="trash-can" size="sm" variant="danger" block={false} onPress={() => del(a)} />
          </View>
        </Card>
      ))}
      <Button title="Nouvelle adresse" icon="plus" onPress={() => setEditing({})} />
      {editing && <AddressForm visible address={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </Screen>
  );
}
