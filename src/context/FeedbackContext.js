import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { colors, radius } from '../lib/theme';

/**
 * Retours après validation :
 *  - notify.success / error / info : bandeau (toast) en haut de l'écran
 *  - showResult : fenêtre avec grande icône pour les actions importantes
 *  - confirm : demande de confirmation (renvoie une promesse booléenne)
 */
const FeedbackContext = createContext(null);

const TONES = {
  success: { icon: 'circle-check', color: colors.success, bg: colors.successBg },
  error: { icon: 'circle-exclamation', color: colors.danger, bg: colors.dangerBg },
  warning: { icon: 'triangle-exclamation', color: colors.warning, bg: colors.warningBg },
  info: { icon: 'circle-info', color: colors.goldDark, bg: colors.goldSoft },
};

export function FeedbackProvider({ children }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [anim] = useState(() => new Animated.Value(0));
  const timer = useRef(null);

  const show = useCallback((type, message) => {
    clearTimeout(timer.current);
    setToast({ type, message });
    Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 3200);
  }, [anim]);

  const notify = {
    success: (m) => show('success', m),
    error: (m) => show('error', m),
    info: (m) => show('info', m),
    warning: (m) => show('warning', m),
  };

  const showResult = useCallback((opts) => new Promise((resolve) => {
    setDialog({ kind: 'result', type: 'success', confirmLabel: 'Continuer', ...opts, resolve });
  }), []);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    setDialog({ kind: 'confirm', type: 'warning', confirmLabel: 'Confirmer', cancelLabel: 'Annuler', ...opts, resolve });
  }), []);

  const close = (v) => { dialog?.resolve(v); setDialog(null); };
  const tone = toast ? TONES[toast.type] : null;
  const dTone = dialog ? TONES[dialog.type] : null;

  return (
    <FeedbackContext.Provider value={{ notify, showResult, confirm }}>
      {children}
      {toast && (
        <Animated.View pointerEvents="none" style={[styles.toast, {
          top: insets.top + 8, borderLeftColor: tone.color,
          opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
        }]}>
          <Icon name={tone.icon} size={18} color={tone.color} />
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
      <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => close(false)}>
        <View style={styles.backdrop}>
          {dialog && (
            <View style={styles.dialog}>
              <View style={[styles.bigIcon, { backgroundColor: dTone.bg }]}>
                <Icon name={dialog.icon || dTone.icon} size={36} color={dTone.color} />
              </View>
              <Text style={styles.title}>{dialog.title}</Text>
              {dialog.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
              <View style={styles.actions}>
                {dialog.kind === 'confirm' && (
                  <Pressable style={[styles.btn, styles.btnOutline]} onPress={() => close(false)}>
                    <Text style={styles.btnOutlineText}>{dialog.cancelLabel}</Text>
                  </Pressable>
                )}
                <Pressable style={[styles.btn, dialog.danger ? styles.btnDanger : styles.btnGold]} onPress={() => close(true)}>
                  <Text style={[styles.btnText, dialog.danger && { color: colors.danger }]}>{dialog.confirmLabel}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </FeedbackContext.Provider>
  );
}

export const useFeedback = () => useContext(FeedbackContext);

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', left: 12, right: 12, zIndex: 999, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: radius.md, padding: 14, borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  toastText: { flex: 1, color: colors.ink, fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: 'rgba(28,28,28,0.45)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 24, alignItems: 'center' },
  bigIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 19, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  message: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20, alignSelf: 'stretch' },
  btn: { flex: 1, minHeight: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  btnGold: { backgroundColor: colors.gold },
  btnDanger: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#EFC2BD' },
  btnOutline: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.gold },
  btnText: { fontWeight: '700', color: colors.ink, fontSize: 15 },
  btnOutlineText: { fontWeight: '700', color: colors.goldDeep, fontSize: 15 },
});
