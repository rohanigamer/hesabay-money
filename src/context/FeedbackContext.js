import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Easing, TouchableOpacity, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from './ThemeContext';

const FeedbackContext = createContext(null);

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function FeedbackProvider({ children }) {
  const { colors } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  // Toast state
  const [toasts, setToasts] = useState([]);

  // Dialog state
  const [dialog, setDialog] = useState(null);
  const dialogResolveRef = useRef(null);

  const toast = useCallback((t) => {
    const id = createId();
    const createdAt = Date.now();
    const durationMs = typeof t?.durationMs === 'number' ? t.durationMs : 2600;

    setToasts((prev) => [
      ...prev,
      {
        id,
        createdAt,
        type: t?.type || 'info', // info | success | warning | error
        title: t?.title || '',
        message: t?.message || '',
        durationMs,
      },
    ]);

    // Auto-remove
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, durationMs + 350);
  }, []);

  const showDialog = useCallback((opts) => {
    return new Promise((resolve) => {
      dialogResolveRef.current = resolve;
      setDialog({
        title: opts?.title || '',
        message: opts?.message || '',
        confirmText: opts?.confirmText || 'OK',
        cancelText: opts?.cancelText, // optional
        destructive: opts?.destructive === true,
      });
    });
  }, []);

  const closeDialog = useCallback((result) => {
    setDialog(null);
    const r = dialogResolveRef.current;
    dialogResolveRef.current = null;
    r?.(result);
  }, []);

  const api = useMemo(
    () => ({
      toast,
      confirm: (opts) => showDialog({ ...opts, cancelText: opts?.cancelText ?? 'Cancel' }),
      alert: (opts) => showDialog({ ...opts }),
      _state: { toasts, dialog, colors, insets },
      _actions: { closeDialog, setToasts },
    }),
    [toast, showDialog, toasts, dialog, colors, insets, closeDialog]
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
  const { closeDialog, setToasts } = _actions;

  return (
    <>
      {/* Toast stack */}
      <ToastStack
        toasts={toasts}
        colors={colors}
        topInset={insets.top}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      {/* Dialog */}
      <ConfirmDialog
        visible={!!dialog}
        colors={colors}
        title={dialog?.title}
        message={dialog?.message}
        confirmText={dialog?.confirmText}
        cancelText={dialog?.cancelText}
        destructive={dialog?.destructive}
        onConfirm={() => closeDialog(true)}
        onCancel={() => closeDialog(false)}
      />
    </>
  );
}

function ToastStack({ toasts, colors, topInset, onDismiss }) {
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: topInset + 10,
        zIndex: 999,
      }}
    >
      {toasts.slice(-3).map((t) => (
        <ToastItem key={t.id} toast={t} colors={colors} onDismiss={() => onDismiss(t.id)} />
      ))}
    </Animated.View>
  );
}

function ToastItem({ toast, colors, onDismiss }) {
  const anim = useRef(new Animated.Value(0)).current;

  const palette = useMemo(() => {
    const base = {
      bg: colors.surface,
      border: colors.border,
      title: colors.text,
      msg: colors.textSecondary,
      accent: colors.accent,
    };
    if (toast.type === 'success') return { ...base, accent: colors.success };
    if (toast.type === 'warning') return { ...base, accent: colors.warning };
    if (toast.type === 'error') return { ...base, accent: colors.error };
    return base;
  }, [toast.type, colors]);

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    return () => {};
  }, [anim]);

  return (
    <Animated.View
      style={{
        marginHorizontal: 14,
        marginBottom: 10,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        backgroundColor: palette.bg,
        borderColor: palette.border,
        transform: [
          {
            translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }),
          },
        ],
        opacity: anim,
        shadowColor: colors.shadow,
        shadowOpacity: 1,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          borderTopLeftRadius: 14,
          borderBottomLeftRadius: 14,
          backgroundColor: palette.accent,
        }}
      />

      <Animated.Text style={{ color: palette.title, fontWeight: '700', marginLeft: 8 }}>
        {toast.title || (toast.type === 'error' ? 'Something went wrong' : 'Notice')}
      </Animated.Text>
      {!!toast.message && (
        <Animated.Text style={{ color: palette.msg, marginTop: 2, marginLeft: 8 }}>
          {toast.message}
        </Animated.Text>
      )}
      {/* Tap to dismiss */}
      <Pressable onPress={onDismiss} style={{ marginTop: 6, marginLeft: 8 }}>
        <Text style={{ color: colors.textTertiary, fontSize: 12 }}>Dismiss</Text>
      </Pressable>
    </Animated.View>
  );
}

function ConfirmDialog({
  visible,
  colors,
  title,
  message,
  confirmText,
  cancelText,
  destructive,
  onConfirm,
  onCancel,
}) {
  if (!visible) return null;
  return (
    <Pressable
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 1000,
      }}
      onPress={cancelText ? onCancel : undefined}
    >
      <Pressable
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: colors.radius?.lg ?? 18,
          padding: 20,
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
        }}
        onPress={(e) => e.stopPropagation()}
      >
        {!!title && <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>{title}</Text>}
        {!!message && (
          <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 22 }}>
            {message}
          </Text>
        )}

        <Animated.View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
          {!!cancelText && (
            <TouchableOpacity
              onPress={onCancel}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 14,
                borderRadius: colors.radius?.md ?? 14,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>{cancelText}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onConfirm}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 14,
              borderRadius: colors.radius?.md ?? 14,
              backgroundColor: destructive ? colors.error : colors.accent,
            }}
          >
            <Text style={{ color: destructive ? colors.onError : colors.onAccent, fontWeight: '800' }}>
              {confirmText || 'OK'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Pressable>
  );
}

