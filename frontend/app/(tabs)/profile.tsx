import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, ScrollView, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { colors, monoFont } from '../../src/styles/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const BADGE_INFO: Record<string, { name: string; icon: string; color: string }> = {
  first_spot: { name: 'First Spot', icon: 'camera', color: '#22C55E' },
  spotter_10: { name: 'Spotter', icon: 'eye', color: '#3B82F6' },
  collector_50: { name: 'Collector', icon: 'star', color: '#EAB308' },
  photographer_100: { name: 'Photographer', icon: 'trophy', color: '#F59E0B' },
  legend_500: { name: 'Legend', icon: 'flame', color: '#EF4444' },
  top_10: { name: 'Top 10', icon: 'medal', color: '#94A3B8' },
  top_3: { name: 'Top 3', icon: 'podium', color: '#D97706' },
  champion: { name: 'Champion', icon: 'crown', color: '#EAB308' },
  supercar_hunter: { name: 'Supercar Hunter', icon: 'car-sport', color: '#EF4444' },
  german_expert: { name: 'German Expert', icon: 'flag', color: '#3B82F6' },
  italian_stallion: { name: 'Italian Stallion', icon: 'heart', color: '#22C55E' },
};

interface ProfileData {
  user_id: string;
  name: string;
  email: string;
  picture: string;
  total_points: number;
  spot_count: number;
  badges: string[];
  rank: number;
}

interface Spot {
  spot_id: string;
  image_base64: string;
  brand: string;
  model: string;
  rarity_tier: string;
  points: number;
}

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const [profileRes, spotsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/profile/${user.user_id}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
        fetch(`${BACKEND_URL}/api/spots/user/${user.user_id}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
      ]);
      if (profileRes.ok) setProfile(await profileRes.json());
      if (spotsRes.ok) setSpots(await spotsRes.json());
    } catch (e) {
      console.log('Profile error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
      fetchProfile();
    }, [fetchProfile])
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (loading || !profile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfile(); }} tintColor={colors.primary} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {profile.name?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          <View style={styles.rankBadge}>
            <Ionicons name="podium" size={14} color={colors.accent} />
            <Text style={styles.rankText}>RANK #{profile.rank}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{profile.total_points}</Text>
            <Text style={styles.statLabel}>POINTS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{profile.spot_count}</Text>
            <Text style={styles.statLabel}>SPOTS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{profile.badges?.length || 0}</Text>
            <Text style={styles.statLabel}>BADGES</Text>
          </View>
        </View>

        {/* Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BADGES</Text>
          {profile.badges && profile.badges.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
              {profile.badges.map(badgeId => {
                const info = BADGE_INFO[badgeId];
                if (!info) return null;
                return (
                  <View key={badgeId} style={[styles.badgeItem, { borderColor: info.color }]}>
                    <Ionicons name={info.icon as any} size={24} color={info.color} />
                    <Text style={[styles.badgeName, { color: info.color }]}>{info.name}</Text>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.noBadges}>
              <Ionicons name="ribbon-outline" size={32} color={colors.textMuted} />
              <Text style={styles.noBadgesText}>Spot des voitures pour débloquer des badges !</Text>
            </View>
          )}
        </View>

        {/* My Spots Gallery */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MES SPOTS ({spots.length})</Text>
          {spots.length > 0 ? (
            <View style={styles.grid}>
              {spots.map(spot => (
                <TouchableOpacity
                  testID={`my-spot-${spot.spot_id}`}
                  key={spot.spot_id}
                  style={styles.gridItem}
                  onPress={() => router.push(`/spot/${spot.spot_id}`)}
                  activeOpacity={0.9}
                >
                  {spot.image_base64 ? (
                    <Image
                      source={{ uri: spot.image_base64.startsWith('data:') ? spot.image_base64 : `data:image/jpeg;base64,${spot.image_base64}` }}
                      style={styles.gridImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.gridImage, { backgroundColor: colors.surfaceHighlight, justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="car-sport" size={24} color={colors.textMuted} />
                    </View>
                  )}
                  <Text style={styles.gridLabel} numberOfLines={1}>{spot.brand} {spot.model}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptySpots}>
              <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptySpotsText}>Aucun spot encore. Vas-y, scanne !</Text>
            </View>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity
          testID="logout-btn"
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>DÉCONNEXION</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  profileHeader: { alignItems: 'center', paddingTop: 24, paddingBottom: 16 },
  profileAvatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.primary,
  },
  profileAvatarText: { color: colors.textPrimary, fontSize: 32, fontWeight: '900' },
  profileName: { color: colors.textPrimary, fontSize: 24, fontWeight: '900', marginTop: 12, letterSpacing: 1 },
  profileEmail: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  rankBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
  },
  rankText: { color: colors.accent, fontSize: 13, fontWeight: '800', fontFamily: monoFont },
  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 8,
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { color: colors.textPrimary, fontSize: 24, fontWeight: '900', fontFamily: monoFont },
  statLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 14, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 2, marginBottom: 12,
  },
  badgesScroll: { flexDirection: 'row' },
  badgeItem: {
    width: 80, height: 80, borderRadius: 12, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
    borderWidth: 1, gap: 4,
  },
  badgeName: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },
  noBadges: {
    alignItems: 'center', paddingVertical: 24, backgroundColor: colors.surface,
    borderRadius: 12, gap: 8, borderWidth: 1, borderColor: colors.border,
  },
  noBadgesText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem: { width: '31%', borderRadius: 10, overflow: 'hidden' },
  gridImage: { width: '100%', aspectRatio: 1, borderRadius: 10 },
  gridLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  emptySpots: {
    alignItems: 'center', paddingVertical: 24, backgroundColor: colors.surface,
    borderRadius: 12, gap: 8, borderWidth: 1, borderColor: colors.border,
  },
  emptySpotsText: { color: colors.textMuted, fontSize: 13 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 16, marginTop: 32, marginBottom: 40,
    paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.error + '40',
  },
  logoutText: { color: colors.error, fontWeight: '700', fontSize: 14, letterSpacing: 1 },
});
