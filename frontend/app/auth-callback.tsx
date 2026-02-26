import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/styles/theme';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ session_id?: string }>();
  const { loginWithGoogle } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    let sessionId = params.session_id;

    // On web, check hash fragment
    if (!sessionId && Platform.OS === 'web') {
      const hash = window.location.hash;
      if (hash.includes('session_id=')) {
        sessionId = hash.split('session_id=')[1]?.split('&')[0];
      }
    }

    if (sessionId) {
      loginWithGoogle(sessionId)
        .then(() => router.replace('/(tabs)/feed'))
        .catch(() => router.replace('/'));
    } else {
      router.replace('/');
    }
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
});
