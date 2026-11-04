import { FontAwesome6 } from '@react-native-vector-icons/fontawesome6';
import { colors } from '../lib/theme';

/** Icône Font Awesome 6 (solid par défaut, « regular » pour les contours). */
export function Icon({ name, size = 18, color = colors.ink2, regular = false, style }) {
  return <FontAwesome6 name={name} size={size} color={color} iconStyle={regular ? 'regular' : 'solid'} style={style} />;
}
