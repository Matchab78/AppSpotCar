import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Linking, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/styles/theme';

export default function AuthScreen() {
  const router = useRouter();
  const { user, loading, login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)/feed');
    }
  }, [user, loading]);

  // Handle Google OAuth redirect
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      if (event.url.includes('session_id=')) {
        const sessionId = event.url.split('session_id=')[1]?.split('&')[0];
        if (sessionId) {
          router.push(`/auth-callback?session_id=${sessionId}`);
        }
      }
    };
    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub.remove();
  }, []);

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!name.trim()) { setError('Le nom est requis'); setSubmitting(false); return; }
        await register(email, password, name);
      }
      router.replace('/(tabs)/feed');
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = Platform.OS === 'web'
      ? window.location.origin + '/auth-callback'
      : `${process.env.EXPO_PUBLIC_BACKEND_URL}/auth-callback`;
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    if (Platform.OS === 'web') {
      window.location.href = authUrl;
    } else {
      Linking.openURL(authUrl);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Logo Area */}
          <View style={styles.logoSection}>
  <Image
    source={require('../assets/images/spotdrive-logo.png')}
    style={{ width: 280, height: 160 }}
    resizeMode="contain"
  />
</View>

          {/* Form */}
          <View style={styles.formSection}>
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>NOM</Text>
                <TextInput
                  testID="auth-name-input"
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ton pseudo"
                  placeholderTextColor="#71717A"
                  autoCapitalize="words"
                />
              </View>
            )}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                testID="auth-email-input"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ton@email.com"
                placeholderTextColor="#71717A"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>MOT DE PASSE</Text>
              <TextInput
                testID="auth-password-input"
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#71717A"
                secureTextEntry
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              testID="auth-submit-btn"
              style={styles.primaryBtn}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {isLogin ? 'CONNEXION' : 'CRÉER MON COMPTE'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              testID="google-login-btn"
              style={styles.googleBtn}
              onPress={handleGoogleLogin}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
              <Text style={styles.googleBtnText}>CONTINUER AVEC GOOGLE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="auth-toggle-btn"
              onPress={() => { setIsLogin(!isLogin); setError(''); }}
              style={styles.toggleBtn}
            >
              <Text style={styles.toggleText}>
                {isLogin ? "Pas encore de compte ? " : "Déjà un compte ? "}
                <Text style={styles.toggleLink}>{isLogin ? "S'inscrire" : "Se connecter"}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoSection: { alignItems: 'center', marginBottom: 48 },
  logoIcon: {
    width: 80, height: 80, borderRadius: 20, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 40, fontWeight: '900', color: colors.textPrimary,
    letterSpacing: 4, textTransform: 'uppercase',
  },
  tagline: {
    fontSize: 12, fontWeight: '600', color: colors.primary,
    letterSpacing: 3, marginTop: 8, textTransform: 'uppercase',
  },
  formSection: { width: '100%' },
  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
  },
  input: {
    height: 52, backgroundColor: colors.surfaceHighlight, borderRadius: 12,
    paddingHorizontal: 16, color: colors.textPrimary, fontSize: 16,
    borderWidth: 1, borderColor: '#3F3F46',
  },
  errorText: { color: colors.error, fontSize: 14, marginBottom: 12, textAlign: 'center' },
  primaryBtn: {
    height: 52, borderRadius: 26, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  primaryBtnText: {
    color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 1.5,
  },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 12, marginHorizontal: 16, fontWeight: '600' },
  googleBtn: {
    height: 52, borderRadius: 26, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row',
    borderWidth: 1, borderColor: colors.border, gap: 10,
  },
  googleBtnText: {
    color: colors.textPrimary, fontWeight: '700', fontSize: 14, letterSpacing: 1,
  },
  toggleBtn: { marginTop: 24, alignItems: 'center', paddingBottom: 24 },
  toggleText: { color: colors.textSecondary, fontSize: 14 },
  toggleLink: { color: colors.primary, fontWeight: '700' },
});
