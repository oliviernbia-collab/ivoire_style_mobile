import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Icon } from './Icon';
import { api, fileUrl } from '../lib/api';
import { PAYMENT_METHODS, PAYOUT_METHODS } from '../lib/format';
import { colors, radius } from '../lib/theme';

/** Catalogue des moyens de paiement (logos officiels sur Cloudinary), chargé une seule fois. */
let catalog = null;
function loadCatalog() {
  catalog = catalog || api.get('/settings/public')
    .then((r) => r.data.payment_providers || {})
    .catch(() => { catalog = null; return {}; });
  return catalog;
}

export function usePaymentProviders() {
  const [providers, setProviders] = useState({});
  useEffect(() => {
    let active = true;
    loadCatalog().then((p) => active && setProviders(p));
    return () => { active = false; };
  }, []);
  return providers;
}

export const paymentLabel = (code) => PAYMENT_METHODS[code]?.label || PAYOUT_METHODS[code] || code;

/** Logo officiel (ou icône Font Awesome pour la carte, la livraison, le virement). wide : version bandeau. */
export default function PaymentLogo({ code, size = 32, wide = false }) {
  const providers = usePaymentProviders();
  const p = providers[code];
  const width = wide ? size * 3 : size;
  const src = p && (wide ? p.logo_wide : p.logo);
  const box = { width, height: size, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' };
  if (src) {
    return <Image source={{ uri: fileUrl(src, { w: width * 3 }) }} style={box} resizeMode="contain" accessibilityLabel={paymentLabel(code)} />;
  }
  return (
    <View style={[box, { backgroundColor: colors.line2, alignItems: 'center', justifyContent: 'center' }]} accessibilityLabel={paymentLabel(code)}>
      <Icon name={p?.icon || 'wallet'} size={size * 0.45} color={p?.color || PAYMENT_METHODS[code]?.color || colors.ink2} />
    </View>
  );
}

/** Logo + libellé. */
export function PaymentLabel({ code, size = 22, textStyle }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <PaymentLogo code={code} size={size} />
      <Text style={[{ color: colors.ink2, fontSize: 13 }, textStyle]}>{paymentLabel(code)}</Text>
    </View>
  );
}

/** Choix d'un moyen (paiement ou reversement) sous forme de puces avec logos. */
export function PaymentChips({ codes, value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {codes.map((c) => {
        const on = value === c;
        return (
          <Pressable key={c} onPress={() => onChange(c)} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingLeft: 5, paddingRight: 12,
              borderRadius: radius.pill, borderWidth: 1.5, borderColor: on ? colors.gold : colors.line, backgroundColor: on ? colors.goldLight : '#fff',
            }}>
            <PaymentLogo code={c} size={26} />
            <Text style={{ fontSize: 13, color: on ? colors.goldDeep : colors.ink2, fontWeight: on ? '700' : '400' }}>{paymentLabel(c)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
