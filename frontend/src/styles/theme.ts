import { StyleSheet, Platform } from 'react-native';

export const colors = {
  background: '#09090B',
  surface: '#18181B',
  surfaceHighlight: '#27272A',
  border: '#27272A',
  primary: '#EF4444',
  secondary: '#3B82F6',
  accent: '#EAB308',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#52525B',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
};

export const monoFont = Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' });

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headingXL: {
    fontSize: 36,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.textPrimary,
  },
  headingLG: {
    fontSize: 24,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textPrimary,
  },
  headingMD: {
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textPrimary,
  },
  bodyBase: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  labelMono: {
    fontSize: 12,
    fontFamily: monoFont,
    textTransform: 'uppercase',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    height: 48,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  btnPrimary: {
    height: 48,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: colors.primary,
  },
  btnSecondary: {
    height: 48,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  btnText: {
    fontWeight: '700',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textPrimary,
  },
});
