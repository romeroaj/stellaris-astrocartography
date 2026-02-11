import React, { useState, useRef } from "react";
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
  Animated as RNAnimated,
  Dimensions,
  FlatList,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { BirthData } from "@/lib/types";
import {
  saveProfile,
  setActiveProfileId,
  setFtuxSeen,
  createDemoProfile,
} from "@/lib/storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const FTUX_SLIDES = [
  {
    icon: "globe-outline" as const,
    title: "Your Map, Your Stars",
    desc: "Astrocartography maps your birth chart onto the globe, revealing where different planetary energies are strongest for you.",
    color: Colors.dark.primary,
  },
  {
    icon: "navigate-outline" as const,
    title: "Find Your Power Places",
    desc: "Discover where you'll thrive in your career, find love, unlock creativity, or experience deep personal transformation.",
    color: Colors.dark.secondary,
  },
  {
    icon: "sparkles-outline" as const,
    title: "10 Planets, 40 Lines",
    desc: "Each planet creates four unique lines across the earth. Tap any line to understand what it means for living, traveling, or working there.",
    color: "#43D9AD",
  },
];

type Step = "ftux" | "name" | "date" | "time" | "location";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ skipFtux?: string }>();
  const startStep: Step = params.skipFtux === "true" ? "name" : "ftux";

  const [step, setStep] = useState<Step>(startStep);
  const [ftuxIndex, setFtuxIndex] = useState(0);
  const [name, setName] = useState("");

  const [dateMonth, setDateMonth] = useState("");
  const [dateDay, setDateDay] = useState("");
  const [dateYear, setDateYear] = useState("");
  const [timeHour, setTimeHour] = useState("");
  const [timeMinute, setTimeMinute] = useState("");
  const [timeAmPm, setTimeAmPm] = useState<"AM" | "PM">("PM");

  const [locationQuery, setLocationQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    lat: number;
    lon: number;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<
    { name: string; lat: number; lon: number }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new RNAnimated.Value(1)).current;
  const ftuxListRef = useRef<FlatList>(null);

  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const minuteRef = useRef<TextInput>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const animateTransition = (nextStep: Step) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    RNAnimated.sequence([
      RNAnimated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(() => setStep(nextStep), 150);
  };

  const searchLocation = async () => {
    if (!locationQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          locationQuery
        )}&format=json&limit=5`,
        { headers: { "User-Agent": "StellarisMobileApp/1.0" } }
      );
      const data = await response.json();
      const results = data.map((item: any) => ({
        name: item.display_name.split(",").slice(0, 3).join(","),
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      }));
      setSearchResults(results);
    } catch {
      Alert.alert("Search Error", "Could not search for locations. Please try again.");
    } finally {
      setIsSearching(false);
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

  const getBirthDateString = () => {
    const m = parseInt(dateMonth).toString().padStart(2, "0");
    const d = parseInt(dateDay).toString().padStart(2, "0");
    const y = parseInt(dateYear);
    return `${y}-${m}-${d}`;
  };

  const getBirthTimeString = () => {
    let h = parseInt(timeHour);
    const m = parseInt(timeMinute);
    if (timeAmPm === "PM" && h < 12) h += 12;
    if (timeAmPm === "AM" && h === 12) h = 0;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const handleSave = async () => {
    if (!selectedLocation) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const profile: BirthData = {
        id,
        name: name.trim() || "My Chart",
        date: getBirthDateString(),
        time: getBirthTimeString(),
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lon,
        locationName: selectedLocation.name,
        createdAt: Date.now(),
      };
      await saveProfile(profile);
      await setActiveProfileId(id);
      await setFtuxSeen();
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Error", "Could not save your data. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const demo = createDemoProfile();
    await saveProfile(demo);
    await setActiveProfileId(demo.id);
    await setFtuxSeen();
    router.replace("/(tabs)");
  };

  const stepsForIndicator: Step[] = ["ftux", "name", "date", "time", "location"];
  const currentIdx = stepsForIndicator.indexOf(step);

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {stepsForIndicator.map((s, i) => (
        <View
          key={s}
          style={[styles.stepDot, i <= currentIdx && styles.stepDotActive]}
        />
      ))}
    </View>
  );

  const renderFtux = () => (
    <View style={styles.ftuxContainer}>
      <FlatList
        ref={ftuxListRef}
        data={FTUX_SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setFtuxIndex(idx);
        }}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <View style={[styles.ftuxSlide, { width: SCREEN_WIDTH - 48 }]}>
            <View style={[styles.ftuxIcon, { backgroundColor: item.color + "20" }]}>
              <Ionicons name={item.icon} size={56} color={item.color} />
            </View>
            <Text style={styles.ftuxTitle}>{item.title}</Text>
            <Text style={styles.ftuxDesc}>{item.desc}</Text>
          </View>
        )}
      />
      <View style={styles.ftuxDots}>
        {FTUX_SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.ftuxDot, i === ftuxIndex && styles.ftuxDotActive]}
          />
        ))}
      </View>
      <View style={styles.ftuxButtons}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          onPress={() => {
            if (ftuxIndex < FTUX_SLIDES.length - 1) {
              const nextIdx = ftuxIndex + 1;
              ftuxListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
              setFtuxIndex(nextIdx);
            } else {
              animateTransition("name");
            }
          }}
        >
          <Text style={styles.primaryButtonText}>
            {ftuxIndex < FTUX_SLIDES.length - 1 ? "Next" : "Get Started"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.dark.background} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.6 }]}
          onPress={handleSkip}
        >
          <Text style={styles.skipButtonText}>Skip, explore with demo data</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderName = () => (
    <View style={styles.formContent}>
      <Text style={styles.stepTitle}>What should we call you?</Text>
      <Text style={styles.stepSubtitle}>
        Enter your name or a label for this birth chart
      </Text>
      <TextInput
        style={styles.textInput}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={Colors.dark.textMuted}
        autoFocus
        returnKeyType="next"
        onSubmitEditing={() => name.trim() && animateTransition("date")}
      />
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          !name.trim() && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => name.trim() && animateTransition("date")}
        disabled={!name.trim()}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={20} color={Colors.dark.background} />
      </Pressable>
    </View>
  );

  const renderDate = () => (
    <View style={styles.formContent}>
      <Text style={styles.stepTitle}>When were you born?</Text>
      <Text style={styles.stepSubtitle}>
        Your birth date determines your planetary positions
      </Text>
      <View style={styles.dateInputRow}>
        <View style={styles.dateInputGroup}>
          <Text style={styles.dateLabel}>Month</Text>
          <TextInput
            style={styles.dateInput}
            value={dateMonth}
            onChangeText={(v) => {
              const clean = v.replace(/[^0-9]/g, "").slice(0, 2);
              setDateMonth(clean);
              if (clean.length === 2) dayRef.current?.focus();
            }}
            placeholder="MM"
            placeholderTextColor={Colors.dark.textMuted}
            keyboardType="number-pad"
            maxLength={2}
            autoFocus
          />
        </View>
        <Text style={styles.dateSeparator}>/</Text>
        <View style={styles.dateInputGroup}>
          <Text style={styles.dateLabel}>Day</Text>
          <TextInput
            ref={dayRef}
            style={styles.dateInput}
            value={dateDay}
            onChangeText={(v) => {
              const clean = v.replace(/[^0-9]/g, "").slice(0, 2);
              setDateDay(clean);
              if (clean.length === 2) yearRef.current?.focus();
            }}
            placeholder="DD"
            placeholderTextColor={Colors.dark.textMuted}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
        <Text style={styles.dateSeparator}>/</Text>
        <View style={[styles.dateInputGroup, { flex: 1.5 }]}>
          <Text style={styles.dateLabel}>Year</Text>
          <TextInput
            ref={yearRef}
            style={styles.dateInput}
            value={dateYear}
            onChangeText={(v) => {
              setDateYear(v.replace(/[^0-9]/g, "").slice(0, 4));
            }}
            placeholder="YYYY"
            placeholderTextColor={Colors.dark.textMuted}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>
      </View>
      {dateMonth && dateDay && dateYear && !isDateValid() && (
        <Text style={styles.errorText}>Please enter a valid date</Text>
      )}
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          !isDateValid() && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => isDateValid() && animateTransition("time")}
        disabled={!isDateValid()}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={20} color={Colors.dark.background} />
      </Pressable>
    </View>
  );

  const renderTime = () => (
    <View style={styles.formContent}>
      <Text style={styles.stepTitle}>What time were you born?</Text>
      <Text style={styles.stepSubtitle}>
        Birth time is crucial for accurate astrocartography lines. Check your birth certificate if unsure.
      </Text>
      <View style={styles.timeInputRow}>
        <View style={styles.dateInputGroup}>
          <Text style={styles.dateLabel}>Hour</Text>
          <TextInput
            style={styles.dateInput}
            value={timeHour}
            onChangeText={(v) => {
              const clean = v.replace(/[^0-9]/g, "").slice(0, 2);
              setTimeHour(clean);
              if (clean.length === 2) minuteRef.current?.focus();
            }}
            placeholder="HH"
            placeholderTextColor={Colors.dark.textMuted}
            keyboardType="number-pad"
            maxLength={2}
            autoFocus
          />
        </View>
        <Text style={styles.dateSeparator}>:</Text>
        <View style={styles.dateInputGroup}>
          <Text style={styles.dateLabel}>Min</Text>
          <TextInput
            ref={minuteRef}
            style={styles.dateInput}
            value={timeMinute}
            onChangeText={(v) => {
              setTimeMinute(v.replace(/[^0-9]/g, "").slice(0, 2));
            }}
            placeholder="MM"
            placeholderTextColor={Colors.dark.textMuted}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
        <View style={styles.amPmContainer}>
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
      {timeHour && timeMinute && !isTimeValid() && (
        <Text style={styles.errorText}>Enter a valid time (1-12 hours, 0-59 minutes)</Text>
      )}
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          !isTimeValid() && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => isTimeValid() && animateTransition("location")}
        disabled={!isTimeValid()}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={20} color={Colors.dark.background} />
      </Pressable>
    </View>
  );

  const renderLocation = () => (
    <View style={styles.formContent}>
      <Text style={styles.stepTitle}>Where were you born?</Text>
      <Text style={styles.stepSubtitle}>
        Your birth location anchors the planetary lines to the globe
      </Text>
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.textInput, { flex: 1 }]}
          value={locationQuery}
          onChangeText={setLocationQuery}
          placeholder="Search city or town..."
          placeholderTextColor={Colors.dark.textMuted}
          returnKeyType="search"
          onSubmitEditing={searchLocation}
        />
        <Pressable
          style={({ pressed }) => [styles.searchButton, pressed && { opacity: 0.7 }]}
          onPress={searchLocation}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color={Colors.dark.background} />
          ) : (
            <Ionicons name="search" size={20} color={Colors.dark.background} />
          )}
        </Pressable>
      </View>
      {searchResults.length > 0 && (
        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          {searchResults.map((result, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [
                styles.resultItem,
                selectedLocation?.name === result.name && styles.resultItemSelected,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedLocation(result);
              }}
            >
              <Ionicons
                name={selectedLocation?.name === result.name ? "checkmark-circle" : "location-outline"}
                size={20}
                color={
                  selectedLocation?.name === result.name
                    ? Colors.dark.primary
                    : Colors.dark.textSecondary
                }
              />
              <Text
                style={[
                  styles.resultText,
                  selectedLocation?.name === result.name && styles.resultTextSelected,
                ]}
                numberOfLines={2}
              >
                {result.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {selectedLocation && (
        <View style={styles.selectedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.dark.success} />
          <Text style={styles.selectedBadgeText}>{selectedLocation.name}</Text>
        </View>
      )}
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          !selectedLocation && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleSave}
        disabled={!selectedLocation || saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={Colors.dark.background} />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>See My Lines</Text>
            <Ionicons name="sparkles" size={20} color={Colors.dark.background} />
          </>
        )}
      </Pressable>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case "ftux": return renderFtux();
      case "name": return renderName();
      case "date": return renderDate();
      case "time": return renderTime();
      case "location": return renderLocation();
    }
  };

  return (
    <LinearGradient
      colors={["#0B1026", "#141A38", "#1C2451"]}
      style={styles.container}
    >
      <View style={[styles.inner, { paddingTop: topInset + 16, paddingBottom: bottomInset + 16 }]}>
        {step !== "ftux" && (
          <Pressable
            style={styles.backButton}
            onPress={() => {
              const idx = stepsForIndicator.indexOf(step);
              if (idx > 0) animateTransition(stepsForIndicator[idx - 1]);
            }}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
          </Pressable>
        )}
        {renderStepIndicator()}
        <RNAnimated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
          {renderStep()}
        </RNAnimated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24 },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.cardBorder,
  },
  stepDotActive: { backgroundColor: Colors.dark.primary },
  stepContent: { flex: 1 },
  ftuxContainer: { flex: 1 },
  ftuxSlide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 8,
  },
  ftuxIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  ftuxTitle: {
    fontSize: 28,
    fontFamily: "Outfit_700Bold",
    color: Colors.dark.text,
    textAlign: "center",
  },
  ftuxDesc: {
    fontSize: 16,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  ftuxDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  ftuxDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.cardBorder,
  },
  ftuxDotActive: { backgroundColor: Colors.dark.primary },
  ftuxButtons: { gap: 12 },
  formContent: { flex: 1, paddingTop: 12, gap: 16 },
  stepTitle: {
    fontSize: 28,
    fontFamily: "Outfit_700Bold",
    color: Colors.dark.text,
  },
  stepSubtitle: {
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 22,
  },
  textInput: {
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 17,
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
  dateInputGroup: { flex: 1, gap: 6 },
  dateLabel: {
    fontSize: 12,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  dateInput: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 22,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
    textAlign: "center",
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  dateSeparator: {
    fontSize: 24,
    fontFamily: "Outfit_300Light",
    color: Colors.dark.textMuted,
    marginBottom: 14,
  },
  amPmContainer: {
    flexDirection: "column",
    gap: 4,
    marginLeft: 4,
  },
  amPmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
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
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.textMuted,
  },
  amPmTextActive: { color: Colors.dark.primary },
  errorText: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.danger,
  },
  searchRow: { flexDirection: "row", gap: 12 },
  searchButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  resultsContainer: { maxHeight: 200 },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  resultItemSelected: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.primaryMuted,
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
  },
  resultTextSelected: { color: Colors.dark.text },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  selectedBadgeText: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
    color: Colors.dark.success,
  },
  primaryButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: "auto",
  },
  primaryButtonText: {
    fontSize: 17,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.background,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  skipButtonText: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textSecondary,
  },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonDisabled: { opacity: 0.4 },
});
