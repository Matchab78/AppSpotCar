import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { colors, monoFont } from '../../src/styles/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const RARITY_COLORS: Record<string, string> = {
  common: '#71717A',
  sport: '#3B82F6',
  performance: '#8B5CF6',
  supercar: '#F59E0B',
  hypercar: '#EF4444',
  ultra_rare: '#EAB308',
};

const RARITY_LABELS: Record<string, string> = {
  common: 'COMMON',
  sport: 'SPORT',
  performance: 'PERFORMANCE',
  supercar: 'SUPERCAR',
  hypercar: 'HYPERCAR',
  ultra_rare: 'ULTRA RARE',
};

interface Spot {
  spot_id: string;
  user_id: string;
  user_name: string;
  user_picture: string;
  image_base64: string;
  brand: string;
  model: string;
  year: number;
  rarity_tier: string;
  location_name: string;
  points: number;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  created_at: string;
}

export default function FeedScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/spots`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSpots(data);
      }
    } catch (e) {
      console.log('Feed fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.token]);

  useFocusEffect(
    useCallback(() => {
      fetchFeed();
    }, [fetchFeed])
  );

  const toggleLike = async (spotId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/spots/${spotId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSpots(prev =>
          prev.map(s => s.spot_id === spotId
            ? { ...s, liked_by_me: data.liked, like_count: data.like_count }
            : s
          )
        );
      }
    } catch (e) {}
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}j`;
  };

  const renderSpot = ({ item }: { item: Spot }) => {
    const rarityColor = RARITY_COLORS[item.rarity_tier] || '#71717A';
    return (
      <TouchableOpacity
        testID={`spot-card-${item.spot_id}`}
        style={styles.spotCard}
        onPress={() => router.push(`/spot/${item.spot_id}`)}
        activeOpacity={0.9}
      >
        {/* Header */}
        <View style={styles.spotHeader}>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.user_name?.charAt(0)?.toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{item.user_name}</Text>
              <Text style={styles.timeText}>{timeAgo(item.created_at)}</Text>
            </View>
          </View>
          <View style={[styles.rarityBadge, { borderColor: rarityColor }]}>
            <Text style={[styles.rarityText, { color: rarityColor }]}>
              {RARITY_LABELS[item.rarity_tier] || 'COMMON'}
            </Text>
          </View>
        </View>

        {/* Image */}
        {item.image_base64 ? (
          <Image
            source={{ uri: item.image_base64.startsWith('data:') ? item.image_base64 : `data:image/jpeg;base64,${item.image_base64}` }}
            style={styles.spotImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="car-sport" size={48} color={colors.textMuted} />
          </View>
        )}

        {/* Car Info */}
        <View style={styles.carInfo}>
          <Text style={styles.carTitle}>
            {item.brand} {item.model}
          </Text>
          <View style={styles.carMeta}>
            <Text style={styles.yearText}>{item.year}</Text>
            <View style={styles.pointsBadge}>
              <Ionicons name="flash" size={12} color={colors.accent} />
              <Text style={styles.pointsText}>+{item.points} PTS</Text>
            </View>
          </View>
          {item.location_name ? (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={12} color={colors.textMuted} />
              <Text style={styles.locationText}>{item.location_name}</Text>
            </View>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            testID={`like-btn-${item.spot_id}`}
            style={styles.actionBtn}
            onPress={() => toggleLike(item.spot_id)}
          >
            <Ionicons
              name={item.liked_by_me ? 'heart' : 'heart-outline'}
              size={22}
              color={item.liked_by_me ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.actionText, item.liked_by_me && { color: colors.primary }]}>
              {item.like_count}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID={`comment-btn-${item.spot_id}`}
            style={styles.actionBtn}
            onPress={() => router.push(`/spot/${item.spot_id}`)}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.actionText}>{item.comment_count}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>STREET.OS</Text>
        <View style={styles.headerBadge}>
          <Ionicons name="flash" size={14} color={colors.accent} />
          <Text style={styles.headerPoints}>{user?.total_points || 0}</Text>
        </View>
      </View>

      <FlatList
        testID="feed-list"
        data={spots}
        keyExtractor={item => item.spot_id}
        renderItem={renderSpot}
        contentContainerStyle={spots.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFeed(); }} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="car-sport-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>AUCUN SPOT</Text>
            <Text style={styles.emptyText}>Sois le premier à spotter une voiture !</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, letterSpacing: 2 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  headerPoints: { color: colors.accent, fontWeight: '800', fontSize: 14, fontFamily: monoFont },
  listContent: { paddingBottom: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  spotCard: {
    backgroundColor: colors.surface, marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  spotHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: colors.textPrimary, fontWeight: '800', fontSize: 14 },
  userName: { color: colors.textPrimary, fontWeight: '700', fontSize: 14 },
  timeText: { color: colors.textMuted, fontSize: 11, fontFamily: monoFont },
  rarityBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  rarityText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  spotImage: { width: '100%', height: 260 },
  imagePlaceholder: {
    width: '100%', height: 200, backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center', alignItems: 'center',
  },
  carInfo: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  carTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', textTransform: 'uppercase' },
  carMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  yearText: { color: colors.textMuted, fontSize: 13, fontFamily: monoFont },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pointsText: { color: colors.accent, fontSize: 12, fontWeight: '800', fontFamily: monoFont },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  locationText: { color: colors.textMuted, fontSize: 12 },
  actionsRow: {
    flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, gap: 20,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  emptyState: { alignItems: 'center', gap: 12 },
  emptyTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', letterSpacing: 2 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
});
