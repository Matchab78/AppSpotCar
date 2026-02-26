import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  FlatList, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { colors, monoFont } from '../../src/styles/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const RARITY_COLORS: Record<string, string> = {
  common: '#71717A', sport: '#3B82F6', performance: '#8B5CF6',
  supercar: '#F59E0B', hypercar: '#EF4444', ultra_rare: '#EAB308',
};

interface Spot {
  spot_id: string;
  user_id: string;
  user_name: string;
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

interface Comment {
  comment_id: string;
  user_id: string;
  user_name: string;
  text: string;
  created_at: string;
}

export default function SpotDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const fetchSpot = useCallback(async () => {
    try {
      const [spotRes, commentsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/spots/${id}`, {
          headers: { Authorization: `Bearer ${user?.token}` },
        }),
        fetch(`${BACKEND_URL}/api/spots/${id}/comments`),
      ]);
      if (spotRes.ok) setSpot(await spotRes.json());
      if (commentsRes.ok) setComments(await commentsRes.json());
    } catch (e) {
      console.log('Spot fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [id, user?.token]);

  useEffect(() => { fetchSpot(); }, [fetchSpot]);

  const toggleLike = async () => {
    if (!spot) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/spots/${spot.spot_id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSpot(prev => prev ? { ...prev, liked_by_me: data.liked, like_count: data.like_count } : prev);
      }
    } catch (e) {}
  };

  const postComment = async () => {
    if (!commentText.trim() || !spot) return;
    setPosting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/spots/${spot.spot_id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments(prev => [newComment, ...prev]);
        setCommentText('');
        setSpot(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev);
      }
    } catch (e) {} finally {
      setPosting(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}j`;
  };

  if (loading || !spot) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const rarityColor = RARITY_COLORS[spot.rarity_tier] || '#71717A';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity testID="back-spot-btn" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SPOT DETAIL</Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={comments}
          keyExtractor={item => item.comment_id}
          ListHeaderComponent={
            <View>
              {/* Image */}
              {spot.image_base64 ? (
                <Image
                  source={{ uri: spot.image_base64.startsWith('data:') ? spot.image_base64 : `data:image/jpeg;base64,${spot.image_base64}` }}
                  style={styles.spotImage}
                  resizeMode="cover"
                />
              ) : null}

              {/* Info */}
              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <View>
                    <Text style={styles.carTitle}>{spot.brand} {spot.model}</Text>
                    <Text style={styles.yearText}>{spot.year}</Text>
                  </View>
                  <View style={[styles.rarityBadge, { borderColor: rarityColor }]}>
                    <Text style={[styles.rarityText, { color: rarityColor }]}>
                      {spot.rarity_tier?.toUpperCase().replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.userRow}>
                    <View style={styles.miniAvatar}>
                      <Text style={styles.miniAvatarText}>{spot.user_name?.charAt(0)?.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.spotUserName}>{spot.user_name}</Text>
                    <Text style={styles.timeText}>{timeAgo(spot.created_at)}</Text>
                  </View>
                  <View style={styles.pointsBadge}>
                    <Ionicons name="flash" size={14} color={colors.accent} />
                    <Text style={styles.pointsText}>+{spot.points}</Text>
                  </View>
                </View>

                {spot.location_name ? (
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={14} color={colors.secondary} />
                    <Text style={styles.locationText}>{spot.location_name}</Text>
                  </View>
                ) : null}

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity testID="detail-like-btn" style={styles.actionBtn} onPress={toggleLike}>
                    <Ionicons
                      name={spot.liked_by_me ? 'heart' : 'heart-outline'}
                      size={24}
                      color={spot.liked_by_me ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.actionText, spot.liked_by_me && { color: colors.primary }]}>
                      {spot.like_count} likes
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.actionBtn}>
                    <Ionicons name="chatbubble" size={20} color={colors.textSecondary} />
                    <Text style={styles.actionText}>{spot.comment_count} commentaires</Text>
                  </View>
                </View>
              </View>

              {/* Comments header */}
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>COMMENTAIRES</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View testID={`comment-${item.comment_id}`} style={styles.commentItem}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>{item.user_name?.charAt(0)?.toUpperCase()}</Text>
              </View>
              <View style={styles.commentContent}>
                <View style={styles.commentNameRow}>
                  <Text style={styles.commentName}>{item.user_name}</Text>
                  <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
                </View>
                <Text style={styles.commentText}>{item.text}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.noComments}>
              <Text style={styles.noCommentsText}>Pas encore de commentaires. Sois le premier !</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />

        {/* Comment Input */}
        <View style={styles.commentInputBar}>
          <TextInput
            testID="comment-input"
            style={styles.commentInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Ajouter un commentaire..."
            placeholderTextColor="#71717A"
          />
          <TouchableOpacity
            testID="send-comment-btn"
            style={[styles.sendBtn, !commentText.trim() && { opacity: 0.4 }]}
            onPress={postComment}
            disabled={posting || !commentText.trim()}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '900', color: colors.textPrimary, letterSpacing: 2 },
  spotImage: { width: '100%', height: 300 },
  infoSection: { padding: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  carTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '900', textTransform: 'uppercase' },
  yearText: { color: colors.textMuted, fontSize: 14, fontFamily: monoFont, marginTop: 2 },
  rarityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  rarityText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center', alignItems: 'center',
  },
  miniAvatarText: { color: colors.textPrimary, fontWeight: '800', fontSize: 12 },
  spotUserName: { color: colors.textPrimary, fontWeight: '600', fontSize: 14 },
  timeText: { color: colors.textMuted, fontSize: 12, fontFamily: monoFont },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pointsText: { color: colors.accent, fontWeight: '900', fontSize: 16, fontFamily: monoFont },
  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    backgroundColor: colors.surface, padding: 10, borderRadius: 8,
  },
  locationText: { color: colors.textSecondary, fontSize: 13, flex: 1 },
  actionsRow: {
    flexDirection: 'row', gap: 24, marginTop: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  commentsHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  commentsTitle: { fontSize: 13, fontWeight: '800', color: colors.textMuted, letterSpacing: 2 },
  listContent: { paddingBottom: 16 },
  commentItem: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 10,
  },
  commentAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center', alignItems: 'center',
  },
  commentAvatarText: { color: colors.textPrimary, fontWeight: '800', fontSize: 13 },
  commentContent: { flex: 1 },
  commentNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentName: { color: colors.textPrimary, fontWeight: '700', fontSize: 13 },
  commentTime: { color: colors.textMuted, fontSize: 11, fontFamily: monoFont },
  commentText: { color: colors.textSecondary, fontSize: 14, marginTop: 3 },
  noComments: { alignItems: 'center', paddingVertical: 24 },
  noCommentsText: { color: colors.textMuted, fontSize: 13 },
  commentInputBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, gap: 10,
  },
  commentInput: {
    flex: 1, height: 44, backgroundColor: colors.surfaceHighlight, borderRadius: 22,
    paddingHorizontal: 16, color: colors.textPrimary, fontSize: 14,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
});
