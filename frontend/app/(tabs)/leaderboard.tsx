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
  total_points: number;
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

  const getRankIcon = (rank: number) => {
    if (rank === 1) return { icon: 'trophy' as const, color: '#EAB308' };
    if (rank === 2) return { icon: 'medal' as const, color: '#94A3B8' };
    if (rank === 3) return { icon: 'medal' as const, color: '#D97706' };
    return null;
  };

  const renderItem = ({ item }: { item: LeaderboardUser }) => {
    const rankInfo = getRankIcon(item.rank);
    const isMe = item.user_id === user?.user_id;
    return (
      <View
        testID={`leaderboard-row-${item.rank}`}
        style={[styles.row, isMe && styles.rowHighlight]}
      >
        <View style={styles.rankSection}>
          {rankInfo ? (
            <Ionicons name={rankInfo.icon} size={24} color={rankInfo.color} />
          ) : (
            <Text style={styles.rankNum}>{item.rank}</Text>
          )}
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
        </View>
        <View style={styles.infoSection}>
          <Text style={[styles.userName, isMe && styles.userNameMe]}>
            {item.name} {isMe ? '(toi)' : ''}
          </Text>
          <Text style={styles.statsText}>
            {item.spot_count} spots • {item.badges?.length || 0} badges
          </Text>
        </View>
        <View style={styles.pointsSection}>
          <Text style={styles.pointsNum}>{item.total_points}</Text>
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

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <View style={styles.podium}>
          {[leaderboard[1], leaderboard[0], leaderboard[2]].map((u, i) => {
            if (!u) return null;
            const podiumRank = [2, 1, 3][i];
            const isFirst = podiumRank === 1;
            return (
              <View key={u.user_id} style={[styles.podiumItem, isFirst && styles.podiumFirst]}>
                <View style={[styles.podiumAvatar, isFirst && styles.podiumAvatarFirst]}>
                  <Text style={[styles.podiumAvatarText, isFirst && { fontSize: 22 }]}>
                    {u.name?.charAt(0)?.toUpperCase()}
                  </Text>
                </View>
                {isFirst && <Ionicons name="trophy" size={20} color="#EAB308" style={{ marginTop: 4 }} />}
                <Text style={styles.podiumName} numberOfLines={1}>{u.name}</Text>
                <Text style={styles.podiumPoints}>{u.total_points}</Text>
                <View style={[styles.podiumBar, { height: isFirst ? 60 : podiumRank === 2 ? 40 : 24 }]} />
              </View>
            );
          })}
        </View>
      )}

      <FlatList
        testID="leaderboard-list"
        data={leaderboard.slice(3)}
        keyExtractor={item => item.user_id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLeaderboard(); }} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          leaderboard.length <= 3 ? null : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Pas encore assez de joueurs</Text>
            </View>
          )
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
  myRankBadge: {
    backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
  },
  myRankText: { color: '#fff', fontWeight: '900', fontSize: 16, fontFamily: monoFont },
  podium: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16, gap: 12,
  },
  podiumItem: { alignItems: 'center', flex: 1 },
  podiumFirst: { marginBottom: 16 },
  podiumAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.border,
  },
  podiumAvatarFirst: {
    width: 64, height: 64, borderRadius: 32, borderColor: '#EAB308', borderWidth: 3,
  },
  podiumAvatarText: { color: colors.textPrimary, fontWeight: '800', fontSize: 18 },
  podiumName: { color: colors.textPrimary, fontSize: 12, fontWeight: '700', marginTop: 6 },
  podiumPoints: { color: colors.accent, fontSize: 14, fontWeight: '900', fontFamily: monoFont, marginTop: 2 },
  podiumBar: {
    width: '80%', backgroundColor: colors.surfaceHighlight, borderRadius: 4, marginTop: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowHighlight: {
    backgroundColor: colors.primary + '15', borderRadius: 12,
    paddingHorizontal: 8, marginHorizontal: -8,
  },
  rankSection: { width: 36, alignItems: 'center' },
  rankNum: { color: colors.textMuted, fontSize: 16, fontWeight: '800', fontFamily: monoFont },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  avatarText: { color: colors.textPrimary, fontWeight: '800', fontSize: 16 },
  infoSection: { flex: 1, marginLeft: 12 },
  userName: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  userNameMe: { color: colors.primary },
  statsText: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  pointsSection: { alignItems: 'flex-end' },
  pointsNum: { color: colors.accent, fontSize: 18, fontWeight: '900', fontFamily: monoFont },
  pointsLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  emptyState: { alignItems: 'center', paddingTop: 24 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
