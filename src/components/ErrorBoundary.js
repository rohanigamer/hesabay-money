import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import i18n from '../utils/i18n';

const defaultColors = { background: '#0f0f12', text: '#fff', textSecondary: '#888', accent: '#007AFF' };

/**
 * Catches JavaScript errors in child tree and shows a fallback UI instead of a blank screen.
 * Production-ready: users see a friendly message and can try again.
 */
class ErrorBoundaryInner extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const c = this.props.colors || defaultColors;
      return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
          <Text style={[styles.emoji]}>⚠️</Text>
          <Text style={[styles.title, { color: c.text }]}>{i18n.t('somethingWentWrong')}</Text>
          <Text style={[styles.message, { color: c.textSecondary }]}>
            {i18n.t('tryAgain')}
          </Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: c.accent }]} onPress={this.handleRetry} activeOpacity={0.8}>
            <Text style={styles.buttonText}>{i18n.t('tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function ErrorBoundary({ children }) {
  const { colors } = React.useContext(ThemeContext);
  return <ErrorBoundaryInner colors={colors}>{children}</ErrorBoundaryInner>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 15, textAlign: 'center', marginBottom: 24, maxWidth: 280 },
  button: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
