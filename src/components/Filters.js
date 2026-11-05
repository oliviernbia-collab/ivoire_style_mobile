import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Icon } from './Icon';
import { Chip, styles as ui } from './ui';
import { colors, radius } from '../lib/theme';

/** Recherche lancée à la validation du clavier (ou effacée par la croix). */
export function SearchBox({ value, onSubmit, placeholder }) {
  const [text, setText] = useState(value || '');
  // Valeur effacée depuis l'extérieur (« Tout effacer ») : le champ suit
  const [prev, setPrev] = useState(value);
  if (value !== prev) { setPrev(value); setText(value || ''); }
  return (
    <View style={[ui.inputBox, { borderRadius: radius.pill, marginBottom: 10 }]}>
      <Icon name="magnifying-glass" size={15} color={colors.muted} />
      <TextInput style={ui.input} value={text} onChangeText={setText} placeholder={placeholder} placeholderTextColor="#A8A8A8"
        returnKeyType="search" onSubmitEditing={() => onSubmit(text.trim() || undefined)} autoCorrect={false} />
      {text ? (
        <Pressable onPress={() => { setText(''); onSubmit(undefined); }} hitSlop={10} accessibilityLabel="Effacer la recherche">
          <Icon name="xmark" size={14} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Rangée de puces à choix unique, défilante. options : [[valeur, libellé, nombre?]]. */
export function ChipRow({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10, flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
      {options.map(([k, label, count]) => (
        <Chip key={k || 'all'} label={count != null ? `${label} (${count})` : label} on={(value || '') === k} onPress={() => onChange(k)} />
      ))}
    </ScrollView>
  );
}

export const PERIODS = [['', 'Toute période'], ['7', '7 jours'], ['30', '30 jours'], ['90', '3 mois'], ['365', '12 mois']];

/** Date de début (AAAA-MM-JJ) d'une période de N jours, ou undefined. */
export function periodFrom(days) {
  if (!days) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - Number(days));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
