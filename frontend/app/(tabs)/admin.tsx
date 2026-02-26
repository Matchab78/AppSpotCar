import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, ScrollView, RefreshControl, Platform, Modal, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { colors, monoFont } from '../../src/styles/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type Tab = 'stats' | 'users' | 'spots';

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
  user_id: string;
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

// Cross-platform confirm that works on web + mobile
function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    const result = window.confirm(`${title}\n\n${message}`);
    if (result) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

const RARITY_COLORS: Record<string, string> = {
  common: '#71717A', sport: '#3B82F6', performance: '#8B5CF6',
  supercar: '#F59E0B', hypercar: '#EF4444', ultra_rare: '#EAB308',
};

export default function AdminScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [spots, setSpots] = useState<AdminSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Badge modal state
  const [badgeModal, setBadgeModal] = useState(false);
  const [badgeTargetUser, setBadgeTargetUser] = useState<AdminUser | null>(null);
  const [badgeId, setBadgeId] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${user?.token}` };
      if (activeTab === 'stats') {
        const res = await fetch(`${BACKEND_URL}/api/admin/stats`, { headers });
        if (res.ok) setStats(await res.json());
      } else if (activeTab === 'users') {
        const res = await fetch(`${BACKEND_URL}/api/admin/users`, { headers });
        if (res.ok) setUsers(await res.json());
      } else if (activeTab === 'spots') {
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
    confirmAction(
      'Supprimer utilisateur',
      `Supprimer ${name} et toutes ses données (spots, commentaires, sessions) ?`,
      async () => {
        setActionLoading(targetId);
        try {
          const res = await fetch(`${BACKEND_URL}/api/admin/users/${targetId}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${user?.token}` },
          });
          if (res.ok) {
            setUsers(prev => prev.filter(u => u.user_id !== targetId));
          } else {
            const err = await res.json().catch(() => ({}));
            if (Platform.OS === 'web') window.alert(err.detail || 'Erreur lors de la suppression');
            else Alert.alert('Erreur', err.detail || 'Erreur lors de la suppression');
          }
        } catch (e) {
          console.log('Delete user error:', e);
        } finally {
          setActionLoading(null);
        }
      }
    );
  };

  const handleBanUser = async (targetId: string, isBanned: boolean) => {
    setActionLoading(targetId);
    try {
      const endpoint = isBanned ? 'unban' : 'ban';
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${targetId}/${endpoint}`, {
        method: 'POST', headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.user_id === targetId ? { ...u, is_banned: !isBanned } : u));
      }
    } catch (e) {
      console.log('Ban/unban error:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSpot = (spotId: string, carName: string) => {
    confirmAction(
      'Supprimer spot',
      `Supprimer "${carName}" ? Les points seront retirés au propriétaire.`,
      async () => {
        setActionLoading(spotId);
        try {
          const res = await fetch(`${BACKEND_URL}/api/admin/spots/${spotId}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${user?.token}` },
          });
          if (res.ok) {
            setSpots(prev => prev.filter(s => s.spot_id !== spotId));
          } else {
            const err = await res.json().catch(() => ({}));
            if (Platform.OS === 'web') window.alert(err.detail || 'Erreur lors de la suppression');
            else Alert.alert('Erreur', err.detail || 'Erreur lors de la suppression');
          }
        } catch (e) {
          console.log('Delete spot error:', e);
        } finally {
          setActionLoading(null);
        }
      }
    );
  };

  const handleManageBadge = async (action: 'add' | 'remove') => {
    if (!badgeTargetUser || !badgeId.trim()) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${badgeTargetUser.user_id}/badges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token}` },
        body: JSON.stringify({ badge_id: badgeId.trim(), action }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(prev => prev.map(u =>
          u.user_id === badgeTargetUser.user_id ? { ...u, badges: data.badges } : u
        ));
        setBadgeModal(false);
        setBadgeId('');
      }
    } catch (e) {
      console.log('Badge error:', e);
    }
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="shield" size={22} color={colors.primary} />
        <Text style={styles.headerTitle}>ADMIN PANEL</Text>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow} contentContainerStyle={styles.tabsContent}>
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
                {[
                  { icon: 'people' as const, value: stats.total_users, label: 'UTILISATEURS', color: colors.secondary },
                  { icon: 'camera' as const, value: stats.total_spots, label: 'SPOTS', color: colors.primary },
                  { icon: 'chatbubbles' as const, value: stats.total_comments, label: 'COMMENTAIRES', color: colors.accent },
                  { icon: 'heart' as const, value: stats.total_likes, label: 'LIKES', color: colors.error },
                  { icon: 'ban' as const, value: stats.banned_users, label: 'BANNIS', color: '#F59E0B' },
                ].map((s, i) => (
                  <View key={i} style={styles.statCard}>
                    <Ionicons name={s.icon} size={28} color={s.color} />
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                ))}
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
                      <View style={{ flex: 1 }}>
                        <View style={styles.nameRow}>
                          <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
                          {item.is_admin && (
                            <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>ADMIN</Text></View>
                          )}
                          {item.is_banned && (
                            <View style={styles.bannedBadge}><Text style={styles.bannedBadgeText}>BANNI</Text></View>
                          )}
                        </View>
                        <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                      </View>
                    </View>
                    <Text style={styles.userPoints}>{item.total_points} pts</Text>
                  </View>
                  <View style={styles.userMeta}>
                    <Text style={styles.userMetaText}>
                      {item.spot_count} spots • {item.badges?.length || 0} badges
                    </Text>
                  </View>
                  {!item.is_admin && (
                    <View style={styles.userActions}>
                      <TouchableOpacity
                        testID={`ban-user-${item.user_id}`}
                        style={[styles.actionChip, item.is_banned ? styles.actionChipGreen : styles.actionChipYellow]}
                        onPress={() => handleBanUser(item.user_id, item.is_banned)}
                        disabled={actionLoading === item.user_id}
                      >
                        {actionLoading === item.user_id ? (
                          <ActivityIndicator size="small" color={item.is_banned ? colors.success : '#F59E0B'} />
                        ) : (
                          <>
                            <Ionicons name={item.is_banned ? 'checkmark-circle' : 'ban'} size={14} color={item.is_banned ? colors.success : '#F59E0B'} />
                            <Text style={[styles.actionChipText, { color: item.is_banned ? colors.success : '#F59E0B' }]}>
                              {item.is_banned ? 'DÉBANNIR' : 'BANNIR'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        testID={`badge-user-${item.user_id}`}
                        style={[styles.actionChip, styles.actionChipBlue]}
                        onPress={() => { setBadgeTargetUser(item); setBadgeModal(true); }}
                      >
                        <Ionicons name="ribbon" size={14} color={colors.secondary} />
                        <Text style={[styles.actionChipText, { color: colors.secondary }]}>BADGES</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        testID={`delete-user-${item.user_id}`}
                        style={[styles.actionChip, styles.actionChipRed]}
                        onPress={() => handleDeleteUser(item.user_id, item.name)}
                        disabled={actionLoading === item.user_id}
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
                    <View style={{ flex: 1 }}>
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
                    style={[styles.actionChip, styles.actionChipRed, { alignSelf: 'flex-start', marginTop: 8 }]}
                    onPress={() => handleDeleteSpot(item.spot_id, `${item.brand} ${item.model}`)}
                    disabled={actionLoading === item.spot_id}
                  >
                    {actionLoading === item.spot_id ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <>
                        <Ionicons name="trash" size={14} color={colors.error} />
                        <Text style={[styles.actionChipText, { color: colors.error }]}>SUPPRIMER</Text>
                      </>
                    )}
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

      {/* Badge Management Modal */}
      <Modal visible={badgeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>GÉRER BADGES</Text>
            <Text style={styles.modalSubtitle}>{badgeTargetUser?.name}</Text>

            {badgeTargetUser?.badges && badgeTargetUser.badges.length > 0 && (
              <View style={styles.currentBadges}>
                <Text style={styles.currentBadgesLabel}>Badges actuels :</Text>
                <Text style={styles.currentBadgesText}>{badgeTargetUser.badges.join(', ')}</Text>
              </View>
            )}

            <Text style={styles.availableBadgesLabel}>Badges disponibles :</Text>
            <Text style={styles.availableBadgesText}>
              first_spot, spotter_10, collector_50, photographer_100, legend_500, top_10, top_3, champion, supercar_hunter, german_expert, italian_stallion
            </Text>

            <TextInput
              testID="badge-id-input"
              style={styles.modalInput}
              value={badgeId}
              onChangeText={setBadgeId}
              placeholder="ID du badge (ex: champion)"
              placeholderTextColor="#71717A"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                testID="badge-add-btn"
                style={[styles.modalBtn, { backgroundColor: colors.success }]}
                onPress={() => handleManageBadge('add')}
              >
                <Text style={styles.modalBtnText}>AJOUTER</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="badge-remove-btn"
                style={[styles.modalBtn, { backgroundColor: colors.error }]}
                onPress={() => handleManageBadge('remove')}
              >
                <Text style={styles.modalBtnText}>RETIRER</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              testID="badge-modal-close"
              style={styles.modalCloseBtn}
              onPress={() => { setBadgeModal(false); setBadgeId(''); }}
            >
              <Text style={styles.modalCloseBtnText}>FERMER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  tabsRow: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 10 },
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  userName: { color: colors.textPrimary, fontWeight: '700', fontSize: 14 },
  adminBadge: { backgroundColor: colors.secondary + '30', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  adminBadgeText: { color: colors.secondary, fontSize: 9, fontWeight: '800' },
  bannedBadge: { backgroundColor: colors.error + '30', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  bannedBadgeText: { color: colors.error, fontSize: 9, fontWeight: '800' },
  userEmail: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  userPoints: { color: colors.accent, fontWeight: '900', fontSize: 14, fontFamily: monoFont },
  userMeta: { marginTop: 8 },
  userMetaText: { color: colors.textMuted, fontSize: 12 },
  userActions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  actionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  actionChipRed: { borderColor: colors.error + '50' },
  actionChipYellow: { borderColor: '#F59E0B50' },
  actionChipGreen: { borderColor: colors.success + '50' },
  actionChipBlue: { borderColor: colors.secondary + '50' },
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
  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalContent: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400,
    borderWidth: 1, borderColor: colors.border,
  },
  modalTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  modalSubtitle: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  currentBadges: { marginBottom: 12, backgroundColor: colors.surfaceHighlight, padding: 10, borderRadius: 8 },
  currentBadgesLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  currentBadgesText: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  availableBadgesLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  availableBadgesText: { color: colors.textSecondary, fontSize: 11, marginBottom: 12 },
  modalInput: {
    height: 44, backgroundColor: colors.surfaceHighlight, borderRadius: 10,
    paddingHorizontal: 14, color: colors.textPrimary, fontSize: 14,
    borderWidth: 1, borderColor: '#3F3F46', marginBottom: 14,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  modalCloseBtn: { marginTop: 14, alignItems: 'center', paddingVertical: 10 },
  modalCloseBtnText: { color: colors.textMuted, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
});
