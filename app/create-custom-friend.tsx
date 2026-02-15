/**
 * Create or edit a custom friend/partner (premium feature).
 * Birth chart for someone without a Stellaris account.
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { authFetch } from "@/lib/auth";

type Step = "name" | "date" | "time" | "location";

export default function CreateCustomFriendScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ editId?: string }>();
  const isEdit = !!params.editId;

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [dateMonth, setDateMonth] = useState("");
  const [dateDay, setDateDay] = useState("");
  const [dateYear, setDateYear] = useState("");
  const [timeHour, setTimeHour] = useState("");
  const [timeMinute, setTimeMinute] = useState("");
  const [timeAmPm, setTimeAmPm] = useState<"AM" | "PM">("PM");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [searchResults, setSearchResults] = useState<{ name: string; lat: number; lon: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const minuteRef = useRef<TextInput>(null);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    if (isEdit && params.editId) {
      (async () => {
        const res = await authFetch<{ customFriend: any }>("GET", `/api/custom-friends/${params.editId}`);
        if (res.data?.customFriend) {
          const cf = res.data.customFriend;
          setName(cf.name);
          const [y, m, d] = (cf.birthDate || "").split("-");
          if (m) setDateMonth(parseInt(m, 10).toString());
          if (d) setDateDay(parseInt(d, 10).toString());
          if (y) setDateYear(y);
          const [hStr, mStr] = (cf.birthTime || "12:00").split(":");
          let h = parseInt(hStr || "12", 10);
          if (h >= 12) {
            setTimeAmPm("PM");
            if (h > 12) h -= 12;
          } else {
            setTimeAmPm("AM");
            if (h === 0) h = 12;
          }
          setTimeHour(h.toString());
          setTimeMinute((parseInt(mStr || "0", 10)).toString().padStart(2, "0"));
          setSelectedLocation({
            name: cf.locationName || "",
            lat: cf.latitude ?? 0,
            lon: cf.longitude ?? 0,
          });
        }
      })();
    }
  }, [isEdit, params.editId]);

  const searchLocation = async () => {
    if (!locationQuery.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=5`,
        { headers: { "User-Agent": "StellarisMobileApp/1.0" } }
      );
      const data = await response.json();
      setSearchResults(
        data.map((item: any) => ({
          name: item.display_name.split(",").slice(0, 3).join(","),
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        }))
      );
    } catch {
      Alert.alert("Search Error", "Could not search for locations.");
    } finally {
      setSearching(false);
    }
  };

  const isDateValid = () => {
    const m = parseInt(dateMonth);
    const d = parseInt(dateDay);
    const y = parseInt(dateYear);
    return m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= new Date().getFullYear();
  };

  const isTimeValid = () => {
    const h = parseInt(timeHour);
    const m = parseInt(timeMinute);
    return h >= 1 && h <= 12 && m >= 0 && m <= 59;
  };

  const getBirthDate = () => {
    const m = parseInt(dateMonth).toString().padStart(2, "0");
    const d = parseInt(dateDay).toString().padStart(2, "0");
    const y = parseInt(dateYear);
    return `${y}-${m}-${d}`;
  };

  const getBirthTime = () => {
    let h = parseInt(timeHour);
    const m = parseInt(timeMinute);
    if (timeAmPm === "PM" && h < 12) h += 12;
    if (timeAmPm === "AM" && h === 12) h = 0;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const handleSave = async () => {
    if (!selectedLocation || !isDateValid() || !isTimeValid() || !name.trim()) {
      Alert.alert("Missing info", "Please fill in name, birth date, time, and location.");
      return;
    }
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const payload = {
        name: name.trim(),
        birthDate: getBirthDate(),
        birthTime: getBirthTime(),
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lon,
        locationName: selectedLocation.name,
      };
      if (isEdit && params.editId) {
        const res = await authFetch("PUT", `/api/custom-friends/${params.editId}`, payload);
        if (res.error) throw new Error(res.error);
      } else {
        const res = await authFetch<{ customFriend: any }>("POST", "/api/custom-friends", payload);
        if (res.error) throw new Error(res.error);
      }
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEdit ? "Edit Custom Friend" : "Create Custom Friend or Partner"}
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={saving || !name.trim() || !isDateValid() || !isTimeValid() || !selectedLocation}
          hitSlop={12}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.dark.primary} />
          ) : (
            <Ionicons
              name="checkmark"
              size={24}
              color={
                name.trim() && isDateValid() && isTimeValid() && selectedLocation
                  ? Colors.dark.primary
                  : Colors.dark.textMuted
              }
            />
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor={Colors.dark.textMuted}
            autoFocus={!isEdit}
          />

          <Text style={styles.label}>Birth Date</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateGroup}>
              <Text style={styles.dateSubLabel}>Month</Text>
              <TextInput
                style={styles.dateInput}
                value={dateMonth}
                onChangeText={(v) => {
                  setDateMonth(v.replace(/[^0-9]/g, "").slice(0, 2));
                  if (v.replace(/[^0-9]/g, "").length === 2) dayRef.current?.focus();
                }}
                placeholder="MM"
                placeholderTextColor={Colors.dark.textMuted}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <Text style={styles.dateSep}>/</Text>
            <View style={styles.dateGroup}>
              <Text style={styles.dateSubLabel}>Day</Text>
              <TextInput
                ref={dayRef}
                style={styles.dateInput}
                value={dateDay}
                onChangeText={(v) => {
                  setDateDay(v.replace(/[^0-9]/g, "").slice(0, 2));
                  if (v.replace(/[^0-9]/g, "").length === 2) yearRef.current?.focus();
                }}
                placeholder="DD"
                placeholderTextColor={Colors.dark.textMuted}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <Text style={styles.dateSep}>/</Text>
            <View style={[styles.dateGroup, { flex: 1.5 }]}>
              <Text style={styles.dateSubLabel}>Year</Text>
              <TextInput
                ref={yearRef}
                style={styles.dateInput}
                value={dateYear}
                onChangeText={(v) => setDateYear(v.replace(/[^0-9]/g, "").slice(0, 4))}
                placeholder="YYYY"
                placeholderTextColor={Colors.dark.textMuted}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>

          <Text style={styles.label}>Birth Time</Text>
          <View style={styles.timeRow}>
            <View style={styles.dateGroup}>
              <Text style={styles.dateSubLabel}>Hour</Text>
              <TextInput
                style={styles.dateInput}
                value={timeHour}
                onChangeText={(v) => {
                  setTimeHour(v.replace(/[^0-9]/g, "").slice(0, 2));
                  if (v.replace(/[^0-9]/g, "").length === 2) minuteRef.current?.focus();
                }}
                placeholder="HH"
                placeholderTextColor={Colors.dark.textMuted}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <Text style={styles.dateSep}>:</Text>
            <View style={styles.dateGroup}>
              <Text style={styles.dateSubLabel}>Min</Text>
              <TextInput
                ref={minuteRef}
                style={styles.dateInput}
                value={timeMinute}
                onChangeText={(v) => setTimeMinute(v.replace(/[^0-9]/g, "").slice(0, 2))}
                placeholder="MM"
                placeholderTextColor={Colors.dark.textMuted}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <View style={styles.amPmWrap}>
              <Pressable
                style={[styles.amPmBtn, timeAmPm === "AM" && styles.amPmActive]}
                onPress={() => setTimeAmPm("AM")}
              >
                <Text style={[styles.amPmText, timeAmPm === "AM" && styles.amPmTextActive]}>AM</Text>
              </Pressable>
              <Pressable
                style={[styles.amPmBtn, timeAmPm === "PM" && styles.amPmActive]}
                onPress={() => setTimeAmPm("PM")}
              >
                <Text style={[styles.amPmText, timeAmPm === "PM" && styles.amPmTextActive]}>PM</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.label}>Birth Location</Text>
          {selectedLocation && (
            <View style={styles.currentLoc}>
              <Ionicons name="location" size={16} color={Colors.dark.success} />
              <Text style={styles.currentLocText} numberOfLines={1}>{selectedLocation.name}</Text>
            </View>
          )}
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={locationQuery}
              onChangeText={setLocationQuery}
              placeholder="Search location..."
              placeholderTextColor={Colors.dark.textMuted}
              returnKeyType="search"
              onSubmitEditing={searchLocation}
            />
            <Pressable style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.7 }]} onPress={searchLocation}>
              {searching ? (
                <ActivityIndicator size="small" color={Colors.dark.background} />
              ) : (
                <Ionicons name="search" size={18} color={Colors.dark.background} />
              )}
            </Pressable>
          </View>
          {searchResults.length > 0 && (
            <View>
              {searchResults.map((r, i) => (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    styles.resultItem,
                    selectedLocation?.name === r.name && styles.resultItemSelected,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedLocation(r);
                    setSearchResults([]);
                    setLocationQuery("");
                  }}
                >
                  <Ionicons
                    name={selectedLocation?.name === r.name ? "checkmark-circle" : "location-outline"}
                    size={18}
                    color={selectedLocation?.name === r.name ? Colors.dark.primary : Colors.dark.textSecondary}
                  />
                  <Text style={[styles.resultText, selectedLocation?.name === r.name && styles.resultTextSelected]} numberOfLines={2}>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, gap: 12 },
  label: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
    marginTop: 8,
  },
  input: {
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
  dateRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  timeRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  dateGroup: { flex: 1, gap: 4 },
  dateSubLabel: {
    fontSize: 11,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.textSecondary,
    textTransform: "uppercase" as const,
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
  dateSep: { fontSize: 22, fontFamily: "Outfit_300Light", color: Colors.dark.textMuted, marginBottom: 12 },
  amPmWrap: { flexDirection: "column", gap: 4, marginLeft: 4 },
  amPmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  amPmActive: { backgroundColor: Colors.dark.primaryMuted, borderColor: Colors.dark.primary },
  amPmText: { fontSize: 12, fontFamily: "Outfit_600SemiBold", color: Colors.dark.textMuted },
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
  currentLocText: { flex: 1, fontSize: 13, fontFamily: "Outfit_500Medium", color: Colors.dark.success },
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
  resultItemSelected: { borderColor: Colors.dark.primary, backgroundColor: Colors.dark.primaryMuted },
  resultText: { flex: 1, fontSize: 13, fontFamily: "Outfit_400Regular", color: Colors.dark.textSecondary },
  resultTextSelected: { color: Colors.dark.text },
});
