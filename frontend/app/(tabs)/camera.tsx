import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { colors, monoFont } from '../../src/styles/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const RARITY_COLORS: Record<string, string> = {
  common: '#71717A', sport: '#3B82F6', performance: '#8B5CF6',
  supercar: '#F59E0B', hypercar: '#EF4444', ultra_rare: '#EAB308',
};

export default function CameraScreen() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [rarityTier, setRarityTier] = useState('common');
  const [points, setPoints] = useState(5);
  const [confidence, setConfidence] = useState(0);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationName, setLocationName] = useState('');
  const [step, setStep] = useState<'pick' | 'recognize' | 'edit' | 'done'>('pick');

  const pickImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission requise', 'Autorise l\'accès à la caméra');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission requise', 'Autorise l\'accès à la galerie');
          return;
        }
      }

      const pickerFn = useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const result = await pickerFn({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
        allowsEditing: true,
        aspect: [16, 9],
      });

      if (!result.canceled && result.assets[0]) {
        setImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
        setStep('recognize');
        getLocation();
      }
    } catch (e) {
      console.log('Image pick error:', e);
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      // Reverse geocode
      const addresses = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (addresses[0]) {
        const a = addresses[0];
        setLocationName([a.street, a.city, a.country].filter(Boolean).join(', '));
      }
    } catch (e) {
      console.log('Location error:', e);
    }
  };

  const recognizeCar = async () => {
    if (!imageBase64) return;
    setRecognizing(true);
    try {
      const base64Data = imageBase64.includes('base64,')
        ? imageBase64.split('base64,')[1]
        : imageBase64;
      const res = await fetch(`${BACKEND_URL}/api/recognize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ image_base64: base64Data }),
      });
      if (res.ok) {
        const data = await res.json();
        setBrand(data.brand || '');
        setModel(data.model || '');
        setYear(String(data.year || ''));
        setRarityTier(data.rarity_tier || 'common');
        setPoints(data.points || 5);
        setConfidence(data.confidence || 0);
        setStep('edit');
      }
    } catch (e) {
      console.log('Recognition error:', e);
      Alert.alert('Erreur', 'La reconnaissance a échoué. Remplis les infos manuellement.');
      setStep('edit');
    } finally {
      setRecognizing(false);
    }
  };

  const skipRecognition = () => {
    setStep('edit');
  };

  const publishSpot = async () => {
    if (!imageBase64 || !brand.trim()) {
      Alert.alert('Erreur', 'Ajoute au moins la marque de la voiture');
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/spots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          brand: brand.trim(),
          model: model.trim(),
          year: parseInt(year) || 2024,
          rarity_tier: rarityTier,
          latitude,
          longitude,
          location_name: locationName,
          points,
        }),
      });
      if (res.ok) {
        await refreshUser();
        setStep('done');
        setTimeout(() => {
          resetForm();
          router.push('/(tabs)/feed');
        }, 1500);
      }
    } catch (e) {
      Alert.alert('Erreur', 'La publication a échoué');
    } finally {
      setPublishing(false);
    }
  };

  const resetForm = () => {
    setImageBase64(null);
    setBrand(''); setModel(''); setYear('');
    setRarityTier('common'); setPoints(5); setConfidence(0);
    setLatitude(null); setLongitude(null); setLocationName('');
    setStep('pick');
  };

  const rarityColor = RARITY_COLORS[rarityTier] || '#71717A';

  // PICK STEP
  if (step === 'pick') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>NOUVEAU SPOT</Text>
        </View>
        <View style={styles.pickSection}>
          <View style={styles.hudFrame}>
            <Ionicons name="scan-outline" size={100} color={colors.primary} />
            <Text style={styles.hudText}>SCANNER UN VÉHICULE</Text>
          </View>
          <TouchableOpacity
            testID="camera-btn"
            style={styles.primaryBtn}
            onPress={() => pickImage(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={22} color="#fff" />
            <Text style={styles.primaryBtnText}>PRENDRE UNE PHOTO</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="gallery-btn"
            style={styles.secondaryBtn}
            onPress={() => pickImage(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="images" size={22} color={colors.textPrimary} />
            <Text style={styles.secondaryBtnText}>CHOISIR DANS LA GALERIE</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // RECOGNIZE STEP
  if (step === 'recognize') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={resetForm} testID="back-btn">
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>IDENTIFICATION</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {imageBase64 && (
            <Image source={{ uri: imageBase64 }} style={styles.previewImage} resizeMode="cover" />
          )}
          {recognizing ? (
            <View style={styles.recognizingSection}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.recognizingText}>IA EN COURS D'ANALYSE...</Text>
              <Text style={styles.recognizingSubtext}>Identification de la marque et du modèle</Text>
            </View>
          ) : (
            <View style={styles.recognizeActions}>
  <TouchableOpacity
    testID="manual-btn"
    style={styles.primaryBtn}
    onPress={skipRecognition}
    activeOpacity={0.8}
  >
    <Ionicons name="pencil" size={20} color="#fff" />
    <Text style={styles.primaryBtnText}>REMPLIR LES INFOS</Text>
  </TouchableOpacity>
</View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // DONE
  if (step === 'done') {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="checkmark-circle" size={80} color={colors.success} />
        <Text style={styles.doneTitle}>SPOT PUBLIÉ !</Text>
        <Text style={styles.donePoints}>+{points} PTS</Text>
      </SafeAreaView>
    );
  }

  // EDIT STEP
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep('recognize')} testID="back-edit-btn">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DÉTAILS DU SPOT</Text>
        <View style={{ width: 24 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {imageBase64 && (
            <Image source={{ uri: imageBase64 }} style={styles.previewImageSmall} resizeMode="cover" />
          )}

          {confidence > 0 && (
            <View style={styles.confidenceRow}>
              <Ionicons name="sparkles" size={14} color={colors.secondary} />
              <Text style={styles.confidenceText}>
                Confiance IA : {Math.round(confidence * 100)}%
              </Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>MARQUE</Text>
            <TextInput
              testID="brand-input"
              style={styles.input}
              value={brand}
              onChangeText={setBrand}
              placeholder="Ex: Ferrari"
              placeholderTextColor="#71717A"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>MODÈLE</Text>
            <TextInput
              testID="model-input"
              style={styles.input}
              value={model}
              onChangeText={setModel}
              placeholder="Ex: 488 GTB"
              placeholderTextColor="#71717A"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>ANNÉE</Text>
            <TextInput
              testID="year-input"
              style={styles.input}
              value={year}
              onChangeText={setYear}
              placeholder="Ex: 2023"
              placeholderTextColor="#71717A"
              keyboardType="numeric"
            />
          </View>

          {/* Rarity Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>RARETÉ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rarityScroll}>
              {Object.entries(RARITY_COLORS).map(([tier, color]) => (
                <TouchableOpacity
                  testID={`rarity-${tier}`}
                  key={tier}
                  style={[
                    styles.rarityChip,
                    { borderColor: color },
                    rarityTier === tier && { backgroundColor: color + '20' },
                  ]}
                  onPress={() => {
                    setRarityTier(tier);
                    const pts: Record<string, number> = {
                      common: 5, sport: 15, performance: 30,
                      supercar: 50, hypercar: 100, ultra_rare: 200,
                    };
                    setPoints(pts[tier] || 5);
                  }}
                >
                  <Text style={[styles.rarityChipText, { color }]}>
                    {tier.toUpperCase().replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Location */}
          {locationName ? (
           <View style={styles.formGroup}>
  <Text style={styles.formLabel}>LOCALISATION</Text>
  <TextInput
    style={styles.input}
    value={locationName}
    onChangeText={setLocationName}
    placeholder="Ex: Paris, France"
    placeholderTextColor="#71717A"
  />
</View>
          ) : null}

          {/* Points preview */}
          <View style={styles.pointsPreview}>
            <Text style={styles.pointsPreviewLabel}>POINTS</Text>
            <View style={styles.pointsPreviewValue}>
              <Ionicons name="flash" size={20} color={colors.accent} />
              <Text style={styles.pointsPreviewNum}>+{points}</Text>
            </View>
          </View>

          <TouchableOpacity
            testID="publish-btn"
            style={[styles.primaryBtn, { marginTop: 16 }]}
            onPress={publishSpot}
            disabled={publishing}
            activeOpacity={0.8}
          >
            {publishing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="rocket" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>PUBLIER LE SPOT</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: '900', color: colors.textPrimary, letterSpacing: 2 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  pickSection: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, gap: 20 },
  hudFrame: {
    width: 200, height: 200, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.primary, borderRadius: 20, borderStyle: 'dashed',
    marginBottom: 32,
  },
  hudText: {
    color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 2, marginTop: 12,
    fontFamily: monoFont,
  },
  primaryBtn: {
    height: 52, borderRadius: 26, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row',
    gap: 10, width: '100%',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 1 },
  secondaryBtn: {
    height: 52, borderRadius: 26, backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row',
    gap: 10, borderWidth: 1, borderColor: '#3F3F46', width: '100%',
  },
  secondaryBtnText: { color: colors.textPrimary, fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
  previewImage: { width: '100%', height: 250, borderRadius: 16 },
  previewImageSmall: { width: '100%', height: 180, borderRadius: 12, marginBottom: 16 },
  recognizingSection: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  recognizingText: { color: colors.primary, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  recognizingSubtext: { color: colors.textMuted, fontSize: 13 },
  recognizeActions: { paddingTop: 24, gap: 12 },
  confidenceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16,
    backgroundColor: colors.surface, padding: 10, borderRadius: 8,
  },
  confidenceText: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
  formGroup: { marginBottom: 16 },
  formLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 1.5, marginBottom: 6,
  },
  input: {
    height: 48, backgroundColor: colors.surfaceHighlight, borderRadius: 12,
    paddingHorizontal: 16, color: colors.textPrimary, fontSize: 16,
    borderWidth: 1, borderColor: '#3F3F46',
  },
  rarityScroll: { flexDirection: 'row' },
  rarityChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, marginRight: 8,
  },
  rarityChipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  locationBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, padding: 12, borderRadius: 10,
    marginBottom: 16, borderWidth: 1, borderColor: colors.border,
  },
  locationBannerText: { color: colors.textSecondary, fontSize: 13, flex: 1 },
  pointsPreview: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  pointsPreviewLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  pointsPreviewValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pointsPreviewNum: { color: colors.accent, fontSize: 24, fontWeight: '900', fontFamily: monoFont },
  doneTitle: { color: colors.textPrimary, fontSize: 28, fontWeight: '900', marginTop: 16, letterSpacing: 2 },
  donePoints: { color: colors.accent, fontSize: 36, fontWeight: '900', marginTop: 8, fontFamily: monoFont },
});
