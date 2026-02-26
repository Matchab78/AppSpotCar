import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/styles/theme';
import { useAuth } from '../../src/context/AuthContext';

function FeedIcon({ color, size }: { color: string; size: number }) {
  return <Ionicons name="grid" size={size} color={color} />;
}
function SpotIcon({ color, size }: { color: string; size: number }) {
  return <Ionicons name="scan" size={size} color={color} />;
}
function RankIcon({ color, size }: { color: string; size: number }) {
  return <Ionicons name="podium" size={size} color={color} />;
}
function ProfileIcon({ color, size }: { color: string; size: number }) {
  return <Ionicons name="person" size={size} color={color} />;
}
function AdminIcon({ color, size }: { color: string; size: number }) {
  return <Ionicons name="shield" size={size} color={color} />;
}

export default function TabLayout() {
  const { user } = useAuth();
  const isAdmin = user?.is_admin === true;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{ title: 'Feed', tabBarIcon: FeedIcon }}
      />
      <Tabs.Screen
        name="camera"
        options={{ title: 'Spot', tabBarIcon: SpotIcon }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{ title: 'Rank', tabBarIcon: RankIcon }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profil', tabBarIcon: ProfileIcon }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: AdminIcon,
          href: isAdmin ? '/(tabs)/admin' : null,
        }}
      />
    </Tabs>
  );
}
