import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, ScrollView, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { colors, monoFont } from '../../src/styles/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type Tab = 'stats' | 'users' | 'spots' | 'comments';

interface AdminUser {
  user_id: string;
  email: string;
  name: string;
  total_points: number;
  spot_count: number;
  badges: string[];
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
}

interface AdminSpot {
  spot_id: string;
  user_name: string;
  brand: string;
  model: string;
  rarity_tier: string;
  points: number;
  like_count: number;
  comment_count: number;
  created_at: string;
}

interface Stats {
  total_users: number;
  total_spots: number;
  total_comments: number;
  total_likes: number;
  banned_users: number;
  rarity_distribution: Record<string, number>;
}

export default function AdminScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [spots, setSpots] = useState<AdminSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${user?.token}` };
      if (activeTab === 'stats') {
        const res = await fetch(`${BACKEND_URL}/api/admin/stats`, { headers });
        if (res.ok) setStats(await res.json());
      } else if (activeTab === 'users') {
        const res = await fetch(`${BACKEND_URL}/api/admin/users`, { headers });
        if (res.ok) setUsers(await res.json());
      } else if (activeTab === 'spots' || activeTab === 'comments') {
        const res = await fetch(`${BACKEND_URL}/api/spots?limit=100`, { headers });
        if (res.ok) setSpots(await res.json());
      }
    } catch (e) {
      console.log('Admin fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, user?.token]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [fetchData]));

  const handleDeleteUser = (targetId: string, name: string) => {
    Alert.alert('Supprimer utilisateur', `Supprimer ${name} et toutes ses données ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          const res = await fetch(`${BACKEND_URL}/api/admin/users/${targetId}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${user?.token}` },
          });
          if (res.ok) { setUsers(prev => prev.filter(u => u.user_id !== targetId)); }
        }
      },
    ]);
  };

  const handleBanUser = async (targetId: string, isBanned: boolean) => {
    const endpoint = isBanned ? 'unban' : 'ban';
    const res = await fetch(`${BACKEND_URL}/api/admin/users/${targetId}/${endpoint}`, {
      method: 'POST', headers: { Authorization: `Bearer ${user?.token}` },
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.user_id === targetId ? { ...u, is_banned: !isBanned } : u));
    }
  };

  const handleDeleteSpot = (spotId: string) => {
    Alert.alert('Supprimer spot', 'Supprimer ce spot et retirer les points ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          const res = await fetch(`${BACKEND_URL}/api/admin/spots/${spotId}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${user?.token}` },
          });
          if (res.ok) { setSpots(prev => prev.filter(s => s.spot_id !== spotId)); }
        }
      },
    ]);
  };

  if (!user?.is_admin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="lock-closed" size={48} color={colors.error} />
          <Text style={styles.errorText}>ACCÈS REFUSÉ</Text>
        </View>
      </SafeAreaView>
    );
  }

  const RARITY_COLORS: Record<string, string> = {
    common: '#71717A', sport: '#3B82F6', performance: '#8B5CF6',
    supercar: '#F59E0B', hypercar: '#EF4444', ultra_rare: '#EAB308',
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="shield" size={22} color={colors.primary} />
        <Text style={styles.headerTitle}>ADMIN PANEL</Text>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
        {(['stats', 'users', 'spots'] as Tab[]).map(tab => (
          <TouchableOpacity
            testID={`admin-tab-${tab}`}
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => { setActiveTab(tab); setLoading(true); }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'stats' ? 'STATS' : tab === 'users' ? 'UTILISATEURS' : 'SPOTS'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <>
          {/* STATS TAB */}
          {activeTab === 'stats' && stats && (
            <ScrollView
              contentContainerStyle={styles.statsContainer}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
            >
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Ionicons name="people" size={28} color={colors.secondary} />
                  <Text style={styles.statValue}>{stats.total_users}</Text>
                  <Text style={styles.statLabel}>UTILISATEURS</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="camera" size={28} color={colors.primary} />
                  <Text style={styles.statValue}>{stats.total_spots}</Text>
                  <Text style={styles.statLabel}>SPOTS</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="chatbubbles" size={28} color={colors.accent} />
                  <Text style={styles.statValue}>{stats.total_comments}</Text>
                  <Text style={styles.statLabel}>COMMENTAIRES</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="heart" size={28} color={colors.error} />
                  <Text style={styles.statValue}>{stats.total_likes}</Text>
                  <Text style={styles.statLabel}>LIKES</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="ban" size={28} color="#F59E0B" />
                  <Text style={styles.statValue}>{stats.banned_users}</Text>
                  <Text style={styles.statLabel}>BANNIS</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>DISTRIBUTION RARETÉ</Text>
              <View style={styles.rarityList}>
                {Object.entries(stats.rarity_distribution).map(([tier, count]) => (
                  <View key={tier} style={styles.rarityRow}>
                    <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[tier] || '#71717A' }]} />
                    <Text style={styles.rarityName}>{tier.toUpperCase().replace('_', ' ')}</Text>
                    <Text style={styles.rarityCount}>{count}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <FlatList
              testID="admin-users-list"
              data={users}
              keyExtractor={item => item.user_id}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
              renderItem={({ item }) => (
                <View style={[styles.userCard, item.is_banned && styles.userCardBanned]}>
                  <View style={styles.userCardHeader}>
                    <View style={styles.userInfo}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
                      </View>
                      <View>
                        <View style={styles.nameRow}>
                          <Text style={styles.userName}>{item.name}</Text>
                          {item.is_admin && (
                            <View style={styles.adminBadge}>
                              <Text style={styles.adminBadgeText}>ADMIN</Text>
                            </View>
                          )}
                          {item.is_banned && (
                            <View style={styles.bannedBadge}>
                              <Text style={styles.bannedBadgeText}>BANNI</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.userEmail}>{item.email}</Text>
                      </View>
                    </View>
                    <Text style={styles.userPoints}>{item.total_points} pts</Text>
                  </View>
                  <View style={styles.userMeta}>
                    <Text style={styles.userMetaText}>{item.spot_count} spots • {item.badges?.length || 0} badges</Text>
                  </View>
                  {!item.is_admin && (
                    <View style={styles.userActions}>
                      <TouchableOpacity
                        testID={`ban-user-${item.user_id}`}
                        style={[styles.actionChip, item.is_banned ? styles.actionChipGreen : styles.actionChipYellow]}
                        onPress={() => handleBanUser(item.user_id, item.is_banned)}
                      >
                        <Ionicons name={item.is_banned ? 'checkmark-circle' : 'ban'} size={14} color={item.is_banned ? colors.success : '#F59E0B'} />
                        <Text style={[styles.actionChipText, { color: item.is_banned ? colors.success : '#F59E0B' }]}>
                          {item.is_banned ? 'UNBAN' : 'BAN'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        testID={`delete-user-${item.user_id}`}
                        style={[styles.actionChip, styles.actionChipRed]}
                        onPress={() => handleDeleteUser(item.user_id, item.name)}
                      >
                        <Ionicons name="trash" size={14} color={colors.error} />
                        <Text style={[styles.actionChipText, { color: colors.error }]}>SUPPRIMER</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.centered}><Text style={styles.emptyText}>Aucun utilisateur</Text></View>
              }
            />
          )}

          {/* SPOTS TAB */}
          {activeTab === 'spots' && (
            <FlatList
              testID="admin-spots-list"
              data={spots}
              keyExtractor={item => item.spot_id}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
              renderItem={({ item }) => (
                <View style={styles.spotCard}>
                  <View style={styles.spotCardHeader}>
                    <View>
                      <Text style={styles.spotCarName}>{item.brand} {item.model}</Text>
                      <Text style={styles.spotUser}>par {item.user_name}</Text>
                    </View>
                    <View style={[styles.rarityTag, { borderColor: RARITY_COLORS[item.rarity_tier] || '#71717A' }]}>
                      <Text style={[styles.rarityTagText, { color: RARITY_COLORS[item.rarity_tier] || '#71717A' }]}>
                        {item.rarity_tier?.toUpperCase().replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.spotMeta}>
                    <Text style={styles.spotMetaText}>
                      {item.points} pts • {item.like_count} likes • {item.comment_count} comments
                    </Text>
                  </View>
                  <TouchableOpacity
                    testID={`delete-spot-${item.spot_id}`}
                    style={[styles.actionChip, styles.actionChipRed, { alignSelf: 'flex-start' }]}
                    onPress={() => handleDeleteSpot(item.spot_id)}
                  >
                    <Ionicons name="trash" size={14} color={colors.error} />
                    <Text style={[styles.actionChipText, { color: colors.error }]}>SUPPRIMER LE SPOT</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.centered}><Text style={styles.emptyText}>Aucun spot</Text></View>
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { color: colors.error, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, letterSpacing: 2 },
  tabsRow: { flexGrow: 0, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.surfaceHighlight, marginRight: 8,
  },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  tabTextActive: { color: '#fff' },
  statsContainer: { padding: 16, paddingBottom: 32 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%', backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border,
  },
  statValue: { color: colors.textPrimary, fontSize: 28, fontWeight: '900', fontFamily: monoFont },
  statLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  sectionTitle: {
    fontSize: 13, fontWeight: '800', color: colors.textMuted, letterSpacing: 2, marginTop: 24, marginBottom: 12,
  },
  rarityList: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  rarityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  rarityDot: { width: 10, height: 10, borderRadius: 5 },
  rarityName: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', flex: 1 },
  rarityCount: { color: colors.textPrimary, fontSize: 16, fontWeight: '900', fontFamily: monoFont },
  listContent: { padding: 16, paddingBottom: 32 },
  userCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  userCardBanned: { borderColor: colors.error + '60', opacity: 0.7 },
  userCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: colors.textPrimary, fontWeight: '800', fontSize: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { color: colors.textPrimary, fontWeight: '700', fontSize: 14 },
  adminBadge: { backgroundColor: colors.secondary + '30', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  adminBadgeText: { color: colors.secondary, fontSize: 9, fontWeight: '800' },
  bannedBadge: { backgroundColor: colors.error + '30', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  bannedBadgeText: { color: colors.error, fontSize: 9, fontWeight: '800' },
  userEmail: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  userPoints: { color: colors.accent, fontWeight: '900', fontSize: 14, fontFamily: monoFont },
  userMeta: { marginTop: 8 },
  userMetaText: { color: colors.textMuted, fontSize: 12 },
  userActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  actionChipRed: { borderColor: colors.error + '50' },
  actionChipYellow: { borderColor: '#F59E0B50' },
  actionChipGreen: { borderColor: colors.success + '50' },
  actionChipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  spotCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  spotCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spotCarName: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', textTransform: 'uppercase' },
  spotUser: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  rarityTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  rarityTagText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  spotMeta: { marginTop: 8 },
  spotMetaText: { color: colors.textMuted, fontSize: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
