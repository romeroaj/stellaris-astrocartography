import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { BirthData } from "@/lib/types";
import {
  getProfiles,
  getActiveProfileId,
  setActiveProfileId,
  deleteProfile,
  saveProfile,
} from "@/lib/storage";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [profiles, setProfiles] = useState<BirthData[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [editProfile, setEditProfile] = useState<BirthData | null>(null);
  const [editName, setEditName] = useState("");
  const [editMonth, setEditMonth] = useState("");
  const [editDay, setEditDay] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editHour, setEditHour] = useState("");
  const [editMinute, setEditMinute] = useState("");
  const [editAmPm, setEditAmPm] = useState<"AM" | "PM">("PM");
  const [editLocationQuery, setEditLocationQuery] = useState("");
  const [editLocation, setEditLocation] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [editSearchResults, setEditSearchResults] = useState<{ name: string; lat: number; lon: number }[]>([]);
  const [editSearching, setEditSearching] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const editDayRef = useRef<TextInput>(null);
  const editYearRef = useRef<TextInput>(null);
  const editMinRef = useRef<TextInput>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    const [profs, id] = await Promise.all([getProfiles(), getActiveProfileId()]);
    setProfiles(profs);
    setActiveId(id);
    setLoading(false);
  };

  const handleSetActive = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setActiveProfileId(id);
    setActiveId(id);
  };

  const handleDelete = (profile: BirthData) => {
    Alert.alert(
      "Delete Chart",
      `Remove ${profile.name}'s chart?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteProfile(profile.id);
            loadData();
          },
        },
      ]
    );
  };

  const openEdit = (profile: BirthData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditProfile(profile);
    setEditName(profile.name);

    const [y, m, d] = profile.date.split("-");
    setEditMonth(parseInt(m).toString());
    setEditDay(parseInt(d).toString());
    setEditYear(y);

    const [hStr, mStr] = profile.time.split(":");
    let h = parseInt(hStr);
    const min = parseInt(mStr);
    if (h >= 12) {
      setEditAmPm("PM");
      if (h > 12) h -= 12;
    } else {
      setEditAmPm("AM");
      if (h === 0) h = 12;
    }
    setEditHour(h.toString());
    setEditMinute(min.toString().padStart(2, "0"));

    setEditLocation({ name: profile.locationName, lat: profile.latitude, lon: profile.longitude });
    setEditLocationQuery("");
    setEditSearchResults([]);
  };

  const searchEditLocation = async () => {
    if (!editLocationQuery.trim()) return;
    setEditSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(editLocationQuery)}&format=json&limit=5`,
        { headers: { "User-Agent": "StellarisMobileApp/1.0" } }
      );
      const data = await response.json();
      setEditSearchResults(
        data.map((item: any) => ({
          name: item.display_name.split(",").slice(0, 3).join(","),
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        }))
      );
    } catch {
      Alert.alert("Error", "Could not search locations.");
    } finally {
      setEditSearching(false);
    }
  };

  const isEditDateValid = () => {
    const m = parseInt(editMonth);
    const d = parseInt(editDay);
    const y = parseInt(editYear);
    return m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= new Date().getFullYear();
  };

  const isEditTimeValid = () => {
    const h = parseInt(editHour);
    const m = parseInt(editMinute);
    return h >= 1 && h <= 12 && m >= 0 && m <= 59;
  };

  const handleEditSave = async () => {
    if (!editProfile || !editLocation || !isEditDateValid() || !isEditTimeValid()) return;
    setEditSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      let h24 = parseInt(editHour);
      const min = parseInt(editMinute);
      if (editAmPm === "PM" && h24 < 12) h24 += 12;
      if (editAmPm === "AM" && h24 === 12) h24 = 0;

      const updated: BirthData = {
        ...editProfile,
        name: editName.trim() || editProfile.name,
        date: `${parseInt(editYear)}-${parseInt(editMonth).toString().padStart(2, "0")}-${parseInt(editDay).toString().padStart(2, "0")}`,
        time: `${h24.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`,
        latitude: editLocation.lat,
        longitude: editLocation.lon,
        locationName: editLocation.name,
      };
      await saveProfile(updated);
      setEditProfile(null);
      loadData();
    } catch {
      Alert.alert("Error", "Could not save changes.");
    } finally {
      setEditSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime12 = (timeStr: string) => {
    const [hStr, mStr] = timeStr.split(":");
    let h = parseInt(hStr);
    const ampm = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${mStr} ${ampm}`;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={styles.screenTitle}>Charts</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {profiles.map((profile) => {
          const isActive = profile.id === activeId;
          return (
            <Pressable
              key={profile.id}
              style={({ pressed }) => [
                styles.profileCard,
                isActive && styles.profileCardActive,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => handleSetActive(profile.id)}
              onLongPress={() => handleDelete(profile)}
            >
              <LinearGradient
                colors={
                  isActive
                    ? [Colors.dark.primaryMuted, Colors.dark.card]
                    : [Colors.dark.card, Colors.dark.surface]
                }
                style={styles.profileGradient}
              >
                <View style={styles.profileTop}>
                  <View style={[styles.profileAvatar, isActive && styles.profileAvatarActive]}>
                    <Ionicons
                      name="person"
                      size={24}
                      color={isActive ? Colors.dark.primary : Colors.dark.textSecondary}
                    />
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{profile.name}</Text>
                    <Text style={styles.profileDate}>{formatDate(profile.date)}</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.6 }]}
                    onPress={() => openEdit(profile)}
                    hitSlop={8}
                  >
                    <Ionicons name="create-outline" size={20} color={Colors.dark.textSecondary} />
                  </Pressable>
                  {isActive && (
                    <View style={styles.activeBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.dark.primary} />
                      <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                  )}
                </View>
                <View style={styles.profileDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={14} color={Colors.dark.textMuted} />
                    <Text style={styles.detailText}>{formatTime12(profile.time)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="location-outline" size={14} color={Colors.dark.textMuted} />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {profile.locationName.split(",")[0]}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          );
        })}

        {profiles.length > 0 && (
          <Text style={styles.hint}>Long press a chart to delete it</Text>
        )}

        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({ pathname: "/onboarding", params: { skipFtux: "true" } });
          }}
        >
          <Ionicons name="add-circle-outline" size={24} color={Colors.dark.primary} />
          <Text style={styles.addButtonText}>Add New Chart</Text>
        </Pressable>

        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>About Astrocartography</Text>
          <Text style={styles.aboutText}>
            Astrocartography maps your birth chart onto the globe, showing where
            different planetary energies are strongest for you. Each planet
            creates four types of lines:
          </Text>
          <View style={styles.aboutList}>
            {[
              { title: "Midheaven (MC)", desc: "Where the planet culminates - affects your career and public image", color: Colors.dark.primary },
              { title: "Imum Coeli (IC)", desc: "Where the planet is at its lowest - affects home and private life", color: Colors.dark.secondary },
              { title: "Ascendant (ASC)", desc: "Where the planet rises - affects your personality and how others see you", color: "#43D9AD" },
              { title: "Descendant (DSC)", desc: "Where the planet sets - affects partnerships and relationships", color: "#F472B6" },
            ].map((item) => (
              <View key={item.title} style={styles.aboutItem}>
                <View style={[styles.aboutDot, { backgroundColor: item.color }]} />
                <View style={styles.aboutItemContent}>
                  <Text style={styles.aboutItemTitle}>{item.title}</Text>
                  <Text style={styles.aboutItemDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      <Modal
        visible={!!editProfile}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditProfile(null)}
      >
        <View style={[styles.modalContainer, { paddingTop: topInset }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setEditProfile(null)} hitSlop={12}>
              <Ionicons name="close" size={24} color={Colors.dark.text} />
            </Pressable>
            <Text style={styles.modalTitle}>Edit Chart</Text>
            <Pressable
              onPress={handleEditSave}
              disabled={editSaving || !isEditDateValid() || !isEditTimeValid() || !editLocation}
              hitSlop={12}
            >
              {editSaving ? (
                <ActivityIndicator size="small" color={Colors.dark.primary} />
              ) : (
                <Ionicons
                  name="checkmark"
                  size={24}
                  color={
                    isEditDateValid() && isEditTimeValid() && editLocation
                      ? Colors.dark.primary
                      : Colors.dark.textMuted
                  }
                />
              )}
            </Pressable>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.editLabel}>Name</Text>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Name"
                placeholderTextColor={Colors.dark.textMuted}
              />

              <Text style={styles.editLabel}>Birth Date</Text>
              <View style={styles.dateInputRow}>
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateSubLabel}>Month</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={editMonth}
                    onChangeText={(v) => {
                      const clean = v.replace(/[^0-9]/g, "").slice(0, 2);
                      setEditMonth(clean);
                      if (clean.length === 2) editDayRef.current?.focus();
                    }}
                    placeholder="MM"
                    placeholderTextColor={Colors.dark.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <Text style={styles.dateSep}>/</Text>
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateSubLabel}>Day</Text>
                  <TextInput
                    ref={editDayRef}
                    style={styles.dateInput}
                    value={editDay}
                    onChangeText={(v) => {
                      const clean = v.replace(/[^0-9]/g, "").slice(0, 2);
                      setEditDay(clean);
                      if (clean.length === 2) editYearRef.current?.focus();
                    }}
                    placeholder="DD"
                    placeholderTextColor={Colors.dark.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <Text style={styles.dateSep}>/</Text>
                <View style={[styles.dateInputGroup, { flex: 1.5 }]}>
                  <Text style={styles.dateSubLabel}>Year</Text>
                  <TextInput
                    ref={editYearRef}
                    style={styles.dateInput}
                    value={editYear}
                    onChangeText={(v) => setEditYear(v.replace(/[^0-9]/g, "").slice(0, 4))}
                    placeholder="YYYY"
                    placeholderTextColor={Colors.dark.textMuted}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              </View>

              <Text style={styles.editLabel}>Birth Time</Text>
              <View style={styles.timeInputRow}>
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateSubLabel}>Hour</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={editHour}
                    onChangeText={(v) => {
                      const clean = v.replace(/[^0-9]/g, "").slice(0, 2);
                      setEditHour(clean);
                      if (clean.length === 2) editMinRef.current?.focus();
                    }}
                    placeholder="HH"
                    placeholderTextColor={Colors.dark.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <Text style={styles.dateSep}>:</Text>
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateSubLabel}>Min</Text>
                  <TextInput
                    ref={editMinRef}
                    style={styles.dateInput}
                    value={editMinute}
                    onChangeText={(v) => setEditMinute(v.replace(/[^0-9]/g, "").slice(0, 2))}
                    placeholder="MM"
                    placeholderTextColor={Colors.dark.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={styles.amPmWrap}>
                  <Pressable
                    style={[styles.amPmBtn, editAmPm === "AM" && styles.amPmActive]}
                    onPress={() => setEditAmPm("AM")}
                  >
                    <Text style={[styles.amPmText, editAmPm === "AM" && styles.amPmTextActive]}>AM</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.amPmBtn, editAmPm === "PM" && styles.amPmActive]}
                    onPress={() => setEditAmPm("PM")}
                  >
                    <Text style={[styles.amPmText, editAmPm === "PM" && styles.amPmTextActive]}>PM</Text>
                  </Pressable>
                </View>
              </View>

              <Text style={styles.editLabel}>Birth Location</Text>
              {editLocation && (
                <View style={styles.currentLoc}>
                  <Ionicons name="location" size={16} color={Colors.dark.success} />
                  <Text style={styles.currentLocText} numberOfLines={1}>{editLocation.name}</Text>
                </View>
              )}
              <View style={styles.searchRow}>
                <TextInput
                  style={[styles.editInput, { flex: 1 }]}
                  value={editLocationQuery}
                  onChangeText={setEditLocationQuery}
                  placeholder="Search new location..."
                  placeholderTextColor={Colors.dark.textMuted}
                  returnKeyType="search"
                  onSubmitEditing={searchEditLocation}
                />
                <Pressable
                  style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.7 }]}
                  onPress={searchEditLocation}
                >
                  {editSearching ? (
                    <ActivityIndicator size="small" color={Colors.dark.background} />
                  ) : (
                    <Ionicons name="search" size={18} color={Colors.dark.background} />
                  )}
                </Pressable>
              </View>
              {editSearchResults.length > 0 && (
                <View>
                  {editSearchResults.map((r, i) => (
                    <Pressable
                      key={i}
                      style={({ pressed }) => [
                        styles.resultItem,
                        editLocation?.name === r.name && styles.resultItemSelected,
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setEditLocation(r);
                        setEditSearchResults([]);
                        setEditLocationQuery("");
                      }}
                    >
                      <Ionicons
                        name={editLocation?.name === r.name ? "checkmark-circle" : "location-outline"}
                        size={18}
                        color={editLocation?.name === r.name ? Colors.dark.primary : Colors.dark.textSecondary}
                      />
                      <Text
                        style={[styles.resultText, editLocation?.name === r.name && styles.resultTextSelected]}
                        numberOfLines={2}
                      >
                        {r.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  centered: { justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.dark.background,
  },
  screenTitle: {
    fontSize: 32,
    fontFamily: "Outfit_700Bold",
    color: Colors.dark.text,
  },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 20, gap: 12 },
  profileCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  profileCardActive: { borderColor: Colors.dark.primary },
  profileGradient: { padding: 18 },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarActive: { backgroundColor: Colors.dark.primaryMuted },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
  },
  profileDate: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  editBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.dark.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.primary,
  },
  profileDetails: {
    flexDirection: "row",
    gap: 20,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
  },
  hint: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    borderStyle: "dashed",
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.primary,
  },
  aboutSection: {
    marginTop: 24,
    backgroundColor: Colors.dark.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  aboutTitle: {
    fontSize: 20,
    fontFamily: "Outfit_700Bold",
    color: Colors.dark.text,
    marginBottom: 10,
  },
  aboutText: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 21,
    marginBottom: 16,
  },
  aboutList: { gap: 14 },
  aboutItem: { flexDirection: "row", gap: 12 },
  aboutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  aboutItemContent: { flex: 1 },
  aboutItemTitle: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
    marginBottom: 2,
  },
  aboutItemDesc: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 19,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
  },
  modalScroll: { flex: 1 },
  modalScrollContent: { paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  editLabel: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
    marginTop: 8,
  },
  editInput: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  dateInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  timeInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  dateInputGroup: { flex: 1, gap: 4 },
  dateSubLabel: {
    fontSize: 11,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  dateInput: {
    backgroundColor: Colors.dark.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 20,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
    textAlign: "center",
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  dateSep: {
    fontSize: 22,
    fontFamily: "Outfit_300Light",
    color: Colors.dark.textMuted,
    marginBottom: 12,
  },
  amPmWrap: {
    flexDirection: "column",
    gap: 4,
    marginLeft: 4,
  },
  amPmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    alignItems: "center",
  },
  amPmActive: {
    backgroundColor: Colors.dark.primaryMuted,
    borderColor: Colors.dark.primary,
  },
  amPmText: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.textMuted,
  },
  amPmTextActive: { color: Colors.dark.primary },
  currentLoc: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  currentLocText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.success,
  },
  searchRow: { flexDirection: "row", gap: 10 },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.dark.card,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  resultItemSelected: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.primaryMuted,
  },
  resultText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
  },
  resultTextSelected: { color: Colors.dark.text },
});
