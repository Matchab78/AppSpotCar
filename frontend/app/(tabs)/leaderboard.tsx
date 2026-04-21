import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { colors, monoFont } from '../../src/styles/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface LeaderboardUser {
  user_id: string;
  name: string;
  picture: string;
  monthly_points: number;
  spot_count: number;
  badges: string[];
  rank: number;
}

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [myRank, setMyRank] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/leaderboard`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard);
        setMyRank(data.my_rank);
      }
    } catch (e) {
      console.log('Leaderboard error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.token]);

  useFocusEffect(
    useCallback(() => {
      fetchLeaderboard();
    }, [fetchLeaderboard])
  );

  const renderItem = ({ item }: { item: LeaderboardUser }) => {
    const isMe = item.user_id === user?.user_id;
    return (
      <View style={[styles.row, isMe && styles.rowHighlight]}>
        <Text style={styles.rankNum}>#{item.rank}</Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
        </View>
        <View style={styles.infoSection}>
          <Text style={[styles.userName, isMe && styles.userNameMe]}>
            {item.name} {isMe ? '(toi)' : ''}
          </Text>
          <View style={styles.statsRow}>
            <Ionicons name="camera" size={11} color={colors.textMuted} />
            <Text style={styles.statsText}>{item.spot_count} spots</Text>
            <Ionicons name="ribbon" size={11} color={colors.textMuted} style={{ marginLeft: 8 }} />
            <Text style={styles.statsText}>{item.badges?.length || 0} badges</Text>
          </View>
        </View>
        <View style={styles.pointsSection}>
          <Ionicons name="flash" size={14} color={colors.accent} />
          <Text style={styles.pointsNum}>{item.monthly_points || 0}</Text>
          <Text style={styles.pointsLabel}>PTS</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const top3 = leaderboard.slice(0, 3);
  const podiumOrder = [top3[1], top3[0], top3[2]];
  const podiumColors = ['#94A3B8', '#EAB308', '#D97706'];
  const podiumHeights = [80, 110, 60];
  const podiumRanks = [2, 1, 3];
  const podiumIcons = ['medal', 'trophy', 'medal'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CLASSEMENT</Text>
        {myRank > 0 && (
          <View style={styles.myRankBadge}>
            <Text style={styles.myRankText}>#{myRank}</Text>
          </View>
        )}
      </View>

      {/* Podium */}
      {leaderboard.length >= 3 && (
        <View style={styles.podiumContainer}>
          {podiumOrder.map((u, i) => {
            if (!u) return null;
            const color = podiumColors[i];
            const height = podiumHeights[i];
            const isFirst = podiumRanks[i] === 1;
            return (
              <View key={u.user_id} style={styles.podiumItem}>
                {/* Icon */}
                <Ionicons name={podiumIcons[i] as any} size={isFirst ? 28 : 20} color={color} />
                {/* Avatar */}
                <View style={[styles.podiumAvatar, { borderColor: color, width: isFirst ? 68 : 52, height: isFirst ? 68 : 52, borderRadius: isFirst ? 34 : 26 }]}>
                  <Text style={[styles.podiumAvatarText, { fontSize: isFirst ? 24 : 18 }]}>
                    {u.name?.charAt(0)?.toUpperCase()}
                  </Text>
                </View>
                {/* Name */}
                <Text style={[styles.podiumName, { color }]} numberOfLines={1}>{u.name}</Text>
                {/* Points */}
                <View style={styles.podiumPointsRow}>
                  <Ionicons name="flash" size={12} color={colors.accent} />
                  <Text style={styles.podiumPoints}>{u.total_points}</Text>
                </View>
                {/* Spots + Badges */}
                <Text style={styles.podiumStats}>{u.spot_count} spots · {u.badges?.length || 0} badges</Text>
                {/* Bar */}
                <View style={[styles.podiumBar, { height, borderColor: color, borderTopColor: color }]}>
                  <Text style={[styles.podiumRankText, { color }]}>#{podiumRanks[i]}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>SUITE DU CLASSEMENT</Text>
        <View style={styles.dividerLine} />
      </View>

      <FlatList
        data={leaderboard.slice(3)}
        keyExtractor={item => item.user_id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLeaderboard(); }} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Pas encore d'autres joueurs</Text>
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
  myRankBadge: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  myRankText: { color: '#fff', fontWeight: '900', fontSize: 16, fontFamily: monoFont },
  podiumContainer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 0, gap: 8,
  },
  podiumItem: { flex: 1, alignItems: 'center', gap: 4 },
  podiumAvatar: {
    borderWidth: 2.5, backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center', alignItems: 'center',
  },
  podiumAvatarText: { color: colors.textPrimary, fontWeight: '800' },
  podiumName: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },
  podiumPointsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  podiumPoints: { color: colors.accent, fontSize: 13, fontWeight: '900', fontFamily: monoFont },
  podiumStats: { color: colors.textMuted, fontSize: 10, textAlign: 'center' },
  podiumBar: {
    width: '100%', borderWidth: 1, borderBottomWidth: 0,
    backgroundColor: colors.surfaceHighlight, borderRadius: 4,
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  podiumRankText: { fontSize: 18, fontWeight: '900', fontFamily: monoFont },
  divider: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10,
  },
  rowHighlight: { backgroundColor: colors.primary + '15', borderRadius: 12, paddingHorizontal: 8, marginHorizontal: -8 },
  rankNum: { color: colors.textMuted, fontSize: 14, fontWeight: '800', fontFamily: monoFont, width: 32, textAlign: 'center' },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: colors.textPrimary, fontWeight: '800', fontSize: 16 },
  infoSection: { flex: 1 },
  userName: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  userNameMe: { color: colors.primary },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  statsText: { color: colors.textMuted, fontSize: 11 },
  pointsSection: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  pointsNum: { color: colors.accent, fontSize: 16, fontWeight: '900', fontFamily: monoFont },
  pointsLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  emptyState: { alignItems: 'center', paddingTop: 24 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});