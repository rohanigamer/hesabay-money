import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Easing, TouchableOpacity, Pressable, Text, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from './ThemeContext';

const FeedbackContext = createContext(null);

const TOAST_ENTER_MS = 320;
const TOAST_EXIT_MS = 260;
const TOAST_STAGGER_MS = 80;
const MAX_VISIBLE_TOASTS = 3;
const DIALOG_OPEN_MS = 260;
const DIALOG_CLOSE_MS = 200;

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Normalize any error shape to { title, message, code? } for consistent handling */
function normalizeError(error, fallbackTitle = 'Something went wrong') {
  if (error == null) return { title: fallbackTitle, message: '' };
  if (typeof error === 'string') return { title: fallbackTitle, message: error };
  if (Array.isArray(error)) {
    const first = error[0];
    const rest = error.slice(1);
    const firstNorm = normalizeError(first, fallbackTitle);
    if (rest.length === 0) return firstNorm;
    const restMessages = rest.map((e) => normalizeError(e, '').message).filter(Boolean);
    const message = [firstNorm.message, ...restMessages].filter(Boolean).join('\n• ');
    return { title: firstNorm.title, message };
  }
  const msg = error.message || error.error || error.err || (error.code && String(error.code));
  const title = error.title || (error.code === 'auth/email-not-verified' ? 'Email not verified' : fallbackTitle);
  return { title, message: msg || '', code: error.code };
}

export function FeedbackProvider({ children }) {
  const { colors } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const dialogResolveRef = useRef(null);
  const dialogResultRef = useRef(null);
  const toastTimeoutsRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = toastTimeoutsRef.current.get(id);
    if (t) {
      if (t.enter) clearTimeout(t.enter);
      if (t.exit) clearTimeout(t.exit);
      toastTimeoutsRef.current.delete(id);
    }
  }, []);

  const toast = useCallback((t) => {
    const id = createId();
    const opts = typeof t === 'string' ? { message: t } : { ...t };
    const type = opts.type || 'info';
    const durationMs = typeof opts.durationMs === 'number' ? opts.durationMs : (type === 'error' ? 4500 : 3000);

    setToasts((prev) => {
      const next = [...prev, { id, createdAt: Date.now(), type, title: opts.title || '', message: opts.message || '', durationMs, exiting: false }];
      return next.slice(-(MAX_VISIBLE_TOASTS + 2));
    });

    const enterTimeout = setTimeout(() => {
      setToasts((prev) => prev.map((x) => (x.id === id ? { ...x, exiting: true } : x)));
      const exitTimeout = setTimeout(() => removeToast(id), TOAST_EXIT_MS + 80);
      toastTimeoutsRef.current.set(id, { enter: enterTimeout, exit: exitTimeout });
    }, durationMs);
  }, [removeToast]);

  const toastSuccess = useCallback((titleOrOpts, message) => {
    const opts = typeof titleOrOpts === 'string' ? { title: titleOrOpts, message } : { ...titleOrOpts, type: 'success' };
    toast({ ...opts, type: 'success' });
  }, [toast]);

  const toastError = useCallback((titleOrOpts, message) => {
    const opts = typeof titleOrOpts === 'string' ? { title: titleOrOpts, message } : { ...titleOrOpts, type: 'error' };
    toast({ ...opts, type: 'error', durationMs: 5000 });
  }, [toast]);

  const toastWarning = useCallback((titleOrOpts, message) => {
    const opts = typeof titleOrOpts === 'string' ? { title: titleOrOpts, message } : { ...titleOrOpts, type: 'warning' };
    toast({ ...opts, type: 'warning' });
  }, [toast]);

  const showDialog = useCallback((opts) => {
    return new Promise((resolve) => {
      dialogResolveRef.current = resolve;
      setDialog({
        title: opts?.title || '',
        message: opts?.message || '',
        confirmText: opts?.confirmText || 'OK',
        cancelText: opts?.cancelText,
        destructive: opts?.destructive === true,
        type: opts?.type,
      });
    });
  }, []);

  const closeDialog = useCallback((result) => {
    dialogResultRef.current = result;
    setDialog((prev) => (prev ? { ...prev, closing: true } : null));
  }, []);

  const dialogExited = useCallback(() => {
    const result = dialogResultRef.current;
    setDialog(null);
    dialogResultRef.current = null;
    const r = dialogResolveRef.current;
    dialogResolveRef.current = null;
    r?.(result);
  }, []);

  /** Show any error (Error, string, { message }, Firebase shape, or array). Option: { asDialog: true } for critical errors. */
  const showError = useCallback((error, fallbackTitleOrOpts = 'Something went wrong') => {
    const opts = typeof fallbackTitleOrOpts === 'object' && fallbackTitleOrOpts !== null
      ? fallbackTitleOrOpts
      : { fallbackTitle: fallbackTitleOrOpts };
    const fallbackTitle = opts.fallbackTitle || 'Something went wrong';
    const asDialog = opts.asDialog === true;

    const { title, message } = normalizeError(error, fallbackTitle);
    if (asDialog) {
      return showDialog({
        title,
        message: message || 'Please try again.',
        confirmText: 'OK',
        type: 'error',
      });
    }
    toastError({ title, message: message || undefined });
  }, [toastError, showDialog]);

  const api = useMemo(
    () => ({
      toast,
      toastSuccess,
      toastError,
      toastWarning,
      showError,
      confirm: (opts) => showDialog({ ...opts, cancelText: opts?.cancelText ?? 'Cancel' }),
      alert: (opts) => showDialog({ ...opts }),
      _state: { toasts, dialog, colors, insets },
      _actions: { closeDialog, dialogExited, setToasts, removeToast },
    }),
    [toast, toastSuccess, toastError, toastWarning, showError, showDialog, toasts, dialog, colors, insets, closeDialog, dialogExited, removeToast]
  );

  return <FeedbackContext.Provider value={api}>{children}</FeedbackContext.Provider>;
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider');
  return ctx;
}

export function FeedbackOverlay() {
  const { _state, _actions } = useFeedback();
  const { toasts, dialog, colors, insets } = _state;
  const { closeDialog, dialogExited, removeToast } = _actions;

  return (
    <>
      <ToastStack toasts={toasts.slice(-MAX_VISIBLE_TOASTS)} colors={colors} topInset={insets.top} onDismiss={removeToast} />
      <ConfirmDialog
        visible={!!dialog}
        closing={!!dialog?.closing}
        colors={colors}
        title={dialog?.title}
        message={dialog?.message}
        confirmText={dialog?.confirmText}
        cancelText={dialog?.cancelText}
        destructive={dialog?.destructive}
        dialogType={dialog?.type}
        onConfirm={() => closeDialog(true)}
        onCancel={() => closeDialog(false)}
        onExited={dialogExited}
      />
    </>
  );
}

const TOAST_ICONS = { success: 'checkmark-circle', error: 'alert-circle', warning: 'warning', info: 'information-circle' };

function ToastStack({ toasts, colors, topInset, onDismiss }) {
  return (
    <View pointerEvents="box-none" style={[styles.toastStack, { top: topInset + 12 }]}>
      {toasts.map((t, index) => (
        <ToastItem key={t.id} toast={t} index={index} colors={colors} onDismiss={() => onDismiss(t.id)} />
      ))}
    </View>
  );
}

const easeOutCubic = Easing.bezier(0.33, 1, 0.68, 1);
const easeInCubic = Easing.bezier(0.32, 0, 0.67, 0);

function ToastItem({ toast, index, colors, onDismiss }) {
  const anim = useRef(new Animated.Value(0)).current;
  const hasTriggeredExitRef = useRef(false);

  const palette = useMemo(() => {
    const base = { bg: colors.surface, border: colors.border, title: colors.text, msg: colors.textSecondary, accent: colors.accent };
    if (toast.type === 'success') return { ...base, accent: colors.success };
    if (toast.type === 'warning') return { ...base, accent: colors.warning };
    if (toast.type === 'error') return { ...base, accent: colors.error };
    return base;
  }, [toast.type, colors]);

  React.useEffect(() => {
    if (toast.exiting) {
      if (hasTriggeredExitRef.current) return;
      hasTriggeredExitRef.current = true;
      Animated.timing(anim, {
        toValue: 0,
        duration: TOAST_EXIT_MS,
        easing: easeInCubic,
        useNativeDriver: true,
      }).start(() => onDismiss(toast.id));
    } else {
      const stagger = index * TOAST_STAGGER_MS;
      const timer = setTimeout(() => {
        Animated.timing(anim, {
          toValue: 1,
          duration: TOAST_ENTER_MS,
          easing: easeOutCubic,
          useNativeDriver: true,
        }).start();
      }, stagger);
      return () => clearTimeout(timer);
    }
  }, [toast.exiting, toast.id, index]);

  const title = toast.title || (toast.type === 'error' ? 'Error' : toast.type === 'success' ? 'Success' : 'Notice');
  const icon = TOAST_ICONS[toast.type] || 'information-circle';

  return (
    <Animated.View
      style={[
        styles.toastItem,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [toast.exiting ? 0 : -20, 0] }) },
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
          ],
        },
      ]}
    >
      <View style={[styles.toastAccent, { backgroundColor: palette.accent }]} />
      <View style={styles.toastBody}>
        <View style={styles.toastHeader}>
          <Ionicons name={icon} size={20} color={palette.accent} style={styles.toastIcon} />
          <Text style={[styles.toastTitle, { color: palette.title }]} numberOfLines={1}>{title}</Text>
        </View>
        {!!toast.message && (
          <Text style={[styles.toastMessage, { color: palette.msg }]} numberOfLines={3}>{toast.message}</Text>
        )}
        <Pressable onPress={() => onDismiss(toast.id)} hitSlop={8} style={styles.toastDismiss}>
          <Text style={[styles.toastDismissText, { color: colors.textTertiary }]}>Dismiss</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const easeOutCubicDialog = Easing.bezier(0.33, 1, 0.68, 1);
const easeInCubicDialog = Easing.bezier(0.32, 0, 0.67, 0);

function ConfirmDialog({
  visible,
  closing,
  colors,
  title,
  message,
  confirmText,
  cancelText,
  destructive,
  dialogType,
  onConfirm,
  onCancel,
  onExited,
}) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const exitDoneRef = useRef(false);

  React.useEffect(() => {
    if (visible && !closing) {
      exitDoneRef.current = false;
      overlayOpacity.setValue(0);
      cardScale.setValue(0.92);
      cardOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: DIALOG_OPEN_MS,
          easing: easeOutCubicDialog,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: DIALOG_OPEN_MS,
          easing: easeOutCubicDialog,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: DIALOG_OPEN_MS * 0.85,
          easing: easeOutCubicDialog,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, closing]);

  React.useEffect(() => {
    if (visible && closing && onExited && !exitDoneRef.current) {
      exitDoneRef.current = true;
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: DIALOG_CLOSE_MS,
          easing: easeInCubicDialog,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 0.92,
          duration: DIALOG_CLOSE_MS,
          easing: easeInCubicDialog,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: DIALOG_CLOSE_MS * 0.9,
          easing: easeInCubicDialog,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onExited();
      });
    }
  }, [visible, closing, onExited]);

  if (!visible) return null;

  const radiusMd = colors.radius?.md ?? 12;
  const radiusLg = colors.radius?.lg ?? 16;
  const isError = destructive || dialogType === 'error';
  const accentColor = isError ? colors.error : colors.accent;
  const isClosing = !!closing;

  return (
    <View style={styles.dialogContainer}>
      <Pressable style={StyleSheet.absoluteFill} onPress={!isClosing && cancelText ? onCancel : undefined} />
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.dialogBackdrop, { opacity: overlayOpacity }]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          styles.dialogCard,
          {
            borderRadius: radiusLg,
            padding: 20,
            backgroundColor: colors.background,
            borderColor: colors.border,
            transform: [{ scale: cardScale }],
            opacity: cardOpacity,
          },
        ]}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          {(title || isError) && (
            <View style={styles.dialogTitleRow}>
              {isError && <Ionicons name="alert-circle" size={22} color={colors.error} style={styles.dialogIcon} />}
              {!!title && (
                <Text style={[styles.dialogTitle, { color: colors.text }]} numberOfLines={2}>{title}</Text>
              )}
            </View>
          )}
          {!!message && (
            <Text style={[styles.dialogMessage, { color: colors.textSecondary }]} selectable>{message}</Text>
          )}

          <View style={[styles.dialogActions, { marginTop: 22 }]}>
            {!!cancelText && (
              <TouchableOpacity
                onPress={isClosing ? undefined : onCancel}
                disabled={isClosing}
                style={[styles.dialogBtn, styles.dialogBtnCancel, { borderRadius: radiusMd, borderColor: colors.border, opacity: isClosing ? 0.7 : 1 }]}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={isClosing ? undefined : onConfirm}
              disabled={isClosing}
              style={[styles.dialogBtn, styles.dialogBtnConfirm, { borderRadius: radiusMd, backgroundColor: accentColor, opacity: isClosing ? 0.7 : 1 }]}
            >
              <Text style={[styles.dialogBtnText, { color: isError ? colors.onError : colors.onAccent }]}>
                {confirmText || 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  toastStack: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 999,
  },
  toastItem: {
    flexDirection: 'row',
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 56,
  },
  toastAccent: {
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  toastBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  toastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastIcon: {
    marginRight: 8,
  },
  toastTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  toastMessage: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  toastDismiss: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 2,
  },
  toastDismissText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dialogContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 1000,
  },
  dialogBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  dialogCard: {
    width: '100%',
    maxWidth: 320,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dialogTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dialogIcon: {
    marginRight: 8,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  dialogMessage: {
    fontSize: 14,
    lineHeight: 21,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
  },
  dialogBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  dialogBtnCancel: {
    borderWidth: 1,
  },
  dialogBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  dialogBtnConfirm: {},
});
