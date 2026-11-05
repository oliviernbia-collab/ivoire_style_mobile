import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { api, fileUrl, videoPoster } from '../lib/api';
import { colors, radius } from '../lib/theme';
import { price as fmtPrice } from '../lib/format';
import { useCart } from '../context/CartContext';
import { useFeedback } from '../context/FeedbackContext';

// ------------------------------------------------------------------ Boutons
export function Button({ title, icon, onPress, variant = 'gold', size = 'md', loading, disabled, style, block = true }) {
  const v = BTN[variant];
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} accessibilityRole="button"
      style={({ pressed }) => [styles.btn, size === 'sm' && styles.btnSm, size === 'lg' && styles.btnLg, v.box,
        !block && { alignSelf: 'flex-start' }, (disabled || loading) && { opacity: 0.55 }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }, style]}>
      {loading ? <ActivityIndicator color={v.text} size="small" /> : icon ? <Icon name={icon} size={size === 'sm' ? 13 : 16} color={v.text} /> : null}
      <Text style={[styles.btnText, size === 'sm' && { fontSize: 13 }, { color: v.text }]}>{title}</Text>
    </Pressable>
  );
}

const BTN = {
  gold: { box: { backgroundColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 }, text: colors.ink },
  outline: { box: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.gold }, text: colors.goldDeep },
  ghost: { box: { backgroundColor: 'transparent' }, text: colors.ink2 },
  danger: { box: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#EFC2BD' }, text: colors.danger },
};

export function IconButton({ icon, onPress, color = colors.ink2, badge, regular, style, label }) {
  return (
    <Pressable onPress={onPress} style={[styles.iconBtn, style]} accessibilityLabel={label} hitSlop={6}>
      <Icon name={icon} size={17} color={color} regular={regular} />
      {badge > 0 && <View style={styles.badgeCount}><Text style={styles.badgeCountText}>{badge}</Text></View>}
    </Pressable>
  );
}

// ------------------------------------------------------------------ Formulaires
export function Field({ label, error, hint, required, icon, style, secureTextEntry, ...input }) {
  const [focus, setFocus] = useState(false);
  // Champs mot de passe : l'œil permet d'afficher / masquer la saisie
  const [revealed, setRevealed] = useState(false);
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label && <Text style={styles.label}>{label}{required && <Text style={{ color: colors.danger }}> *</Text>}</Text>}
      <View style={[styles.inputBox, focus && { borderColor: colors.gold }, error && { borderColor: colors.danger }]}>
        {icon && <Icon name={icon} size={15} color={colors.muted} />}
        <TextInput placeholderTextColor="#A8A8A8" style={[styles.input, input.multiline && { minHeight: 90, textAlignVertical: 'top', paddingTop: 10 }]}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          secureTextEntry={secureTextEntry && !revealed} autoCapitalize={secureTextEntry ? 'none' : input.autoCapitalize} autoCorrect={secureTextEntry ? false : input.autoCorrect}
          {...input} />
        {secureTextEntry && (
          <Pressable onPress={() => setRevealed((r) => !r)} hitSlop={10} accessibilityRole="button"
            accessibilityLabel={revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
            <Icon name={revealed ? 'eye-slash' : 'eye'} size={17} color={revealed ? colors.goldDark : colors.muted} />
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}><Icon name="circle-exclamation" size={11} color={colors.danger} /> {error}</Text>
        : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({ label, on, onPress, icon, swatch }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      {swatch && <View style={[styles.swatch, { backgroundColor: swatch }]} />}
      {icon && <Icon name={icon} size={12} color={on ? colors.goldDeep : colors.gold} />}
      <Text style={[styles.chipText, on && { color: colors.goldDeep, fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

/** Choix exclusif. visual : élément affiché à la place de l'icône (ex. logo d'opérateur). */
export function Choice({ label, sub, icon, iconColor, visual, on, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, on && styles.choiceOn]} accessibilityRole="radio" accessibilityState={{ checked: !!on }}>
      <View style={[styles.radio, on && { borderColor: colors.gold }]}>{on && <View style={styles.radioDot} />}</View>
      {visual || (icon && <View style={styles.choiceIc}><Icon name={icon} size={16} color={iconColor || colors.ink2} /></View>)}
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600', color: colors.ink }}>{label}</Text>
        {sub ? <Text style={styles.small}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

// ------------------------------------------------------------------ Affichage
export function Card({ children, style }) { return <View style={[styles.card, style]}>{children}</View>; }

export function Badge({ label, tone }) {
  const t = TONE[tone] || { bg: colors.line2, fg: colors.ink2 };
  return <View style={[styles.badge, { backgroundColor: t.bg }]}><Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text></View>;
}
const TONE = {
  success: { bg: colors.successBg, fg: colors.success }, danger: { bg: colors.dangerBg, fg: colors.danger },
  warning: { bg: colors.warningBg, fg: colors.warning }, info: { bg: colors.infoBg, fg: colors.info }, gold: { bg: colors.goldLight, fg: colors.goldDeep },
};
export const StatusBadge = ({ map, value }) => { const [l, t] = map[value] || [value, '']; return <Badge label={l} tone={t} />; };

export function Price({ value, old, size = 15 }) {
  return (
    <Text>
      <Text style={{ fontWeight: '800', color: colors.ink, fontSize: size }}>{fmtPrice(value)}</Text>
      {old && Number(old) > Number(value) ? <Text style={styles.priceOld}>  {fmtPrice(old)}</Text> : null}
    </Text>
  );
}

/** Image produit (w : largeur demandée à Cloudinary ; une vidéo affiche son aperçu). */
export function ProductImage({ uri, style, w = 600 }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) return <View style={[styles.placeholder, style]}><Icon name="shirt" size={30} color={colors.gold} /></View>;
  const src = /\/video\/upload\//.test(uri) ? videoPoster(uri, w) : fileUrl(uri, { w });
  return <Image source={{ uri: src }} style={[{ backgroundColor: colors.goldSoft }, style]} resizeMode="cover" onError={() => setFailed(true)} />;
}

export function Stars({ value = 0, count, size = 11 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={size} regular={i > Math.round(value)} color={colors.gold} />)}
      {count !== undefined && <Text style={[styles.small, { marginLeft: 4 }]}>({count})</Text>}
    </View>
  );
}

export function Loader({ label = 'Chargement…' }) {
  return <View style={styles.center}><ActivityIndicator color={colors.gold} size="large" /><Text style={[styles.small, { marginTop: 10 }]}>{label}</Text></View>;
}

export function Empty({ icon, title, text, action, onAction }) {
  return (
    <View style={styles.center}>
      <View style={styles.emptyIc}><Icon name={icon} size={34} color={colors.gold} /></View>
      <Text style={styles.h2}>{title}</Text>
      {text ? <Text style={[styles.muted, { textAlign: 'center', marginTop: 6 }]}>{text}</Text> : null}
      {action ? <Button title={action} onPress={onAction} style={{ marginTop: 18, paddingHorizontal: 28 }} block={false} /> : null}
    </View>
  );
}

export function ErrorView({ message, onRetry }) {
  return <Empty icon={message?.includes('Connexion') ? 'wifi' : 'circle-exclamation'} title="Oups…" text={message} action={onRetry ? 'Réessayer' : null} onAction={() => onRetry()} />;
}

export function SectionTitle({ title, icon, action, onAction }) {
  return (
    <View style={styles.sectionHead}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon && <Icon name={icon} size={16} color={colors.gold} />}
        <Text style={styles.h2}>{title}</Text>
      </View>
      {action && <Pressable onPress={onAction}><Text style={styles.link}>{action} <Icon name="arrow-right" size={11} color={colors.goldDark} /></Text></Pressable>}
    </View>
  );
}

// ------------------------------------------------------------------ Produit
export function ProductCard({ p, width }) {
  const { favorites, toggleFavorite } = useCart();
  const fav = favorites.has(p.id);
  const off = p.on_sale ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0;
  return (
    <Pressable style={[styles.pCard, width && { width }]} onPress={() => router.push(`/produit/${p.slug}`)}>
      <View>
        <ProductImage uri={p.image} style={{ width: '100%', aspectRatio: 4 / 5 }} />
        {off > 0 && <View style={styles.saleTag}><Text style={styles.saleText}>-{off}%</Text></View>}
        {!p.in_stock && <View style={[styles.saleTag, { backgroundColor: '#fff', top: off > 0 ? 36 : 8 }]}><Text style={[styles.saleText, { color: colors.danger }]}>Rupture</Text></View>}
        <IconButton icon="heart" regular={!fav} color={fav ? '#D64545' : colors.ink2} onPress={() => toggleFavorite(p.id)}
          style={{ position: 'absolute', top: 8, right: 8, width: 34, height: 34 }} label="Favori" />
      </View>
      <View style={{ padding: 10, gap: 3 }}>
        <Text style={styles.small} numberOfLines={1}><Icon name="store" size={10} color={colors.muted} /> {p.shop_name}</Text>
        <Text style={styles.pName} numberOfLines={2}>{p.name}</Text>
        {p.rating_count > 0 && <Stars value={Number(p.rating_avg)} count={p.rating_count} />}
        <Price value={p.price} old={p.on_sale ? p.compare_at_price : null} size={14} />
      </View>
    </Pressable>
  );
}

export function Grid({ data, renderItem, columns = 2, gap = 12 }) {
  const rows = [];
  for (let i = 0; i < data.length; i += columns) rows.push(data.slice(i, i + columns));
  return (
    <View style={{ gap }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap }}>
          {r.map((item) => <View key={item.id} style={{ flex: 1 }}>{renderItem(item)}</View>)}
          {r.length < columns && Array.from({ length: columns - r.length }).map((_, j) => <View key={`f${j}`} style={{ flex: 1 }} />)}
        </View>
      ))}
    </View>
  );
}

export function Screen({ children, scroll = true, style, refreshControl }) {
  const { bottom } = useSafeAreaInsets();
  if (!scroll) return <View style={[styles.screen, style]}>{children}</View>;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[{ padding: 16, paddingBottom: 40 + bottom }, style]} refreshControl={refreshControl} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

// ------------------------------------------------------------------ Hooks
export function useFetch(path, params, deps = []) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify([params || {}, ...deps]);
  useEffect(() => {
    if (!path) return undefined;
    let active = true;
    api.get(path, params)
      .then((res) => active && setState({ data: res.data, meta: res.meta || null, loading: false, error: null }))
      .catch((e) => active && setState({ data: null, meta: null, loading: false, error: e.message }));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key, nonce]);
  /** reload(true) recharge sans afficher l'indicateur de chargement. */
  const reload = useCallback((silent = false) => {
    if (silent !== true) setState((s) => ({ ...s, loading: true, error: null }));
    setNonce((n) => n + 1);
  }, []);
  return { ...state, reload };
}

/** Formulaire avec erreurs par champ renvoyées par l'API et retour utilisateur. */
export function useForm(initial) {
  const { notify } = useFeedback();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const set = (k) => (v) => { setValues((s) => ({ ...s, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined })); };
  const submit = (fn, { toastSuccess = true, validate } = {}) => async () => {
    const ce = validate ? Object.fromEntries(Object.entries(validate(values)).filter(([, v]) => v)) : {};
    if (Object.keys(ce).length) { setErrors(ce); notify.error(Object.values(ce)[0]); return; }
    setSubmitting(true); setErrors({});
    try {
      const res = await fn(values);
      if (toastSuccess && res?.message) notify.success(res.message);
      return res;
    } catch (e) {
      setErrors(e.errors || {});
      notify.error(e.message);
    } finally { setSubmitting(false); }
  };
  return { values, setValues, set, errors, submitting, submit };
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, minHeight: 300 },
  h1: { fontSize: 24, fontWeight: '800', color: colors.ink },
  h2: { fontSize: 18, fontWeight: '700', color: colors.ink },
  h3: { fontSize: 15, fontWeight: '700', color: colors.ink },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  small: { color: colors.muted, fontSize: 12 },
  link: { color: colors.goldDark, fontWeight: '600', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  btn: { minHeight: 48, borderRadius: radius.pill, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnSm: { minHeight: 36, paddingHorizontal: 14 },
  btnLg: { minHeight: 54 },
  btnText: { fontWeight: '700', fontSize: 15 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(255,255,255,0.96)', alignItems: 'center', justifyContent: 'center' },
  badgeCount: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' },
  badgeCountText: { fontSize: 10, fontWeight: '800', color: colors.ink },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink2, marginBottom: 6 },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 12, backgroundColor: '#fff' },
  input: { flex: 1, minHeight: 46, fontSize: 15, color: colors.ink },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#fff' },
  chipOn: { borderColor: colors.gold, backgroundColor: colors.goldLight },
  chipText: { fontSize: 13, color: colors.ink2 },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: '#fff', marginBottom: 10 },
  choiceOn: { borderColor: colors.gold, backgroundColor: colors.goldSoft },
  choiceIc: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.line2, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold },
  card: { backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 14 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  priceOld: { color: colors.muted, textDecorationLine: 'line-through', fontSize: 12 },
  placeholder: { backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  emptyIc: { width: 86, height: 86, borderRadius: 43, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  pCard: { backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  pName: { fontSize: 14, fontWeight: '500', color: colors.ink, minHeight: 36 },
  saleTag: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.orange, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  saleText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 12 },
});
