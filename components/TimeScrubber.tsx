/**
 * TimeScrubber — Cyclocartography time navigation component
 *
 * Provides:
 * - Horizontal date slider for scrubbing through time
 * - Quick jump buttons (Today, +1M, +6M, +1Y)
 * - Month/year display with prev/next navigation
 * - Tap to open a date-jump modal (specific month + year)
 * - Visual indicators for activation intensity across the timeline
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

interface TimeScrubberProps {
  /** The currently selected date */
  selectedDate: Date;
  /** Called when the user changes the date */
  onDateChange: (date: Date) => void;
  /** Optional: activation intensity per month (0-1) for the heatmap dots */
  monthlyIntensity?: Map<string, number>;
  /** Whether to show the compact (inline) or expanded view */
  compact?: boolean;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const QUICK_JUMPS = [
  { label: "Today", offset: 0 },
  { label: "+1M", offset: 1 },
  { label: "+3M", offset: 3 },
  { label: "+6M", offset: 6 },
  { label: "+1Y", offset: 12 },
];

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function TimeScrubber({
  selectedDate,
  onDateChange,
  monthlyIntensity,
  compact = false,
}: TimeScrubberProps) {
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [jumpYear, setJumpYear] = useState(selectedDate.getFullYear());
  const scrollRef = useRef<ScrollView>(null);
  const today = new Date();

  // Generate 25 months: 12 past + current + 12 future
  const months = React.useMemo(() => {
    const result: Date[] = [];
    for (let i = -12; i <= 12; i++) {
      result.push(addMonths(today, i));
    }
    return result;
  }, []);

  const handleMonthSelect = useCallback((date: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDate = new Date(date.getFullYear(), date.getMonth(), 15);
    onDateChange(newDate);
  }, [onDateChange]);

  const handlePrevMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDateChange(addMonths(selectedDate, -1));
  }, [selectedDate, onDateChange]);

  const handleNextMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDateChange(addMonths(selectedDate, 1));
  }, [selectedDate, onDateChange]);

  const handleQuickJump = useCallback((offsetMonths: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (offsetMonths === 0) {
      onDateChange(new Date());
    } else {
      onDateChange(addMonths(new Date(), offsetMonths));
    }
  }, [onDateChange]);

  const handleJumpToMonthYear = useCallback((month: number, year: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDateChange(new Date(year, month, 15));
    setShowJumpModal(false);
  }, [onDateChange]);

  const getIntensityColor = (intensity: number): string => {
    if (intensity >= 0.8) return Colors.dark.primary;
    if (intensity >= 0.5) return Colors.dark.secondary;
    if (intensity >= 0.2) return Colors.dark.primary + "60";
    return "transparent";
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Pressable style={styles.compactNav} onPress={handlePrevMonth}>
          <Ionicons name="chevron-back" size={18} color={Colors.dark.textSecondary} />
        </Pressable>

        <Pressable
          style={styles.compactDateDisplay}
          onPress={() => setShowJumpModal(true)}
        >
          <Ionicons name="time-outline" size={14} color={Colors.dark.primary} />
          <Text style={styles.compactDateText}>
            {FULL_MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </Text>
          <Ionicons name="chevron-down" size={12} color={Colors.dark.textMuted} />
        </Pressable>

        <Pressable style={styles.compactNav} onPress={handleNextMonth}>
          <Ionicons name="chevron-forward" size={18} color={Colors.dark.textSecondary} />
        </Pressable>

        {!isSameMonth(selectedDate, today) && (
          <Pressable
            style={styles.todayPill}
            onPress={() => handleQuickJump(0)}
          >
            <Text style={styles.todayPillText}>Today</Text>
          </Pressable>
        )}

        {renderJumpModal()}
      </View>
    );
  }

  function renderJumpModal() {
    return (
      <Modal
        visible={showJumpModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowJumpModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Jump to Date</Text>
            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => setShowJumpModal(false)}
            >
              <Ionicons name="close" size={22} color={Colors.dark.text} />
            </Pressable>
          </View>

          {/* Year selector */}
          <View style={styles.yearSelector}>
            <Pressable
              style={styles.yearArrow}
              onPress={() => { setJumpYear((y) => y - 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Ionicons name="chevron-back" size={22} color={Colors.dark.textSecondary} />
            </Pressable>
            <Text style={styles.yearText}>{jumpYear}</Text>
            <Pressable
              style={styles.yearArrow}
              onPress={() => { setJumpYear((y) => y + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Ionicons name="chevron-forward" size={22} color={Colors.dark.textSecondary} />
            </Pressable>
          </View>

          {/* Month grid */}
          <View style={styles.monthGrid}>
            {FULL_MONTHS.map((month, idx) => {
              const isSelected = selectedDate.getFullYear() === jumpYear && selectedDate.getMonth() === idx;
              const isCurrentMonth = today.getFullYear() === jumpYear && today.getMonth() === idx;
              const key = `${jumpYear}-${String(idx + 1).padStart(2, "0")}`;
              const intensity = monthlyIntensity?.get(key) || 0;

              return (
                <Pressable
                  key={month}
                  style={[
                    styles.monthCell,
                    isSelected && styles.monthCellSelected,
                    isCurrentMonth && !isSelected && styles.monthCellCurrent,
                  ]}
                  onPress={() => handleJumpToMonthYear(idx, jumpYear)}
                >
                  <Text style={[
                    styles.monthCellText,
                    isSelected && styles.monthCellTextSelected,
                    isCurrentMonth && !isSelected && styles.monthCellTextCurrent,
                  ]}>
                    {MONTHS[idx]}
                  </Text>
                  {intensity > 0 && (
                    <View style={[styles.intensityDot, { backgroundColor: getIntensityColor(intensity) }]} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Quick jump shortcuts */}
          <View style={styles.modalQuickJumps}>
            <Pressable
              style={styles.modalQuickJumpBtn}
              onPress={() => { handleJumpToMonthYear(today.getMonth(), today.getFullYear()); }}
            >
              <Ionicons name="today-outline" size={16} color={Colors.dark.primary} />
              <Text style={styles.modalQuickJumpText}>Back to Today</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header: Current date + jump button */}
      <View style={styles.headerRow}>
        <Pressable style={styles.navBtn} onPress={handlePrevMonth}>
          <Ionicons name="chevron-back" size={20} color={Colors.dark.textSecondary} />
        </Pressable>

        <Pressable
          style={styles.dateDisplay}
          onPress={() => {
            setJumpYear(selectedDate.getFullYear());
            setShowJumpModal(true);
          }}
        >
          <Ionicons name="time-outline" size={16} color={Colors.dark.primary} />
          <Text style={styles.dateText}>
            {FULL_MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </Text>
          <Ionicons name="chevron-down" size={14} color={Colors.dark.textMuted} />
        </Pressable>

        <Pressable style={styles.navBtn} onPress={handleNextMonth}>
          <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
        </Pressable>
      </View>

      {/* Month timeline strip */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineContent}
        style={styles.timeline}
      >
        {months.map((date) => {
          const isSelected = isSameMonth(date, selectedDate);
          const isToday = isSameMonth(date, today);
          const key = monthKey(date);
          const intensity = monthlyIntensity?.get(key) || 0;

          return (
            <Pressable
              key={key}
              style={[
                styles.timelineItem,
                isSelected && styles.timelineItemSelected,
                isToday && !isSelected && styles.timelineItemToday,
              ]}
              onPress={() => handleMonthSelect(date)}
            >
              <Text style={[
                styles.timelineMonth,
                isSelected && styles.timelineMonthSelected,
                isToday && !isSelected && styles.timelineMonthToday,
              ]}>
                {MONTHS[date.getMonth()]}
              </Text>
              <Text style={[
                styles.timelineYear,
                isSelected && styles.timelineYearSelected,
              ]}>
                {date.getFullYear()}
              </Text>
              {intensity > 0 && (
                <View style={[
                  styles.timelineDot,
                  { backgroundColor: getIntensityColor(intensity) },
                ]} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Quick jump buttons */}
      <View style={styles.quickJumps}>
        {QUICK_JUMPS.map((jump) => {
          const isActive = jump.offset === 0 && isSameMonth(selectedDate, today);
          return (
            <Pressable
              key={jump.label}
              style={[styles.quickJumpBtn, isActive && styles.quickJumpBtnActive]}
              onPress={() => handleQuickJump(jump.offset)}
            >
              <Text style={[styles.quickJumpText, isActive && styles.quickJumpTextActive]}>
                {jump.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {renderJumpModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Full layout ──
  container: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dateDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.dark.primaryMuted,
  },
  dateText: {
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
  },
  // ── Timeline strip ──
  timeline: {
    flexGrow: 0,
    marginHorizontal: -16,
  },
  timelineContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  timelineItem: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface,
    minWidth: 52,
  },
  timelineItemSelected: {
    backgroundColor: Colors.dark.primary,
  },
  timelineItemToday: {
    borderWidth: 1,
    borderColor: Colors.dark.primary + "60",
  },
  timelineMonth: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  timelineMonthSelected: {
    color: Colors.dark.background,
  },
  timelineMonthToday: {
    color: Colors.dark.primary,
  },
  timelineYear: {
    fontSize: 10,
    fontFamily: "Outfit_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 1,
  },
  timelineYearSelected: {
    color: Colors.dark.background + "CC",
  },
  timelineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 3,
  },
  // ── Quick jumps ──
  quickJumps: {
    flexDirection: "row",
    gap: 8,
  },
  quickJumpBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: Colors.dark.surface,
  },
  quickJumpBtnActive: {
    backgroundColor: Colors.dark.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.dark.primary + "40",
  },
  quickJumpText: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  quickJumpTextActive: {
    color: Colors.dark.primary,
  },
  // ── Compact layout ──
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  compactNav: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  compactDateDisplay: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.dark.primaryMuted,
  },
  compactDateText: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.text,
  },
  todayPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.dark.primary + "20",
  },
  todayPillText: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.primary,
  },
  // ── Jump modal ──
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "web" ? 40 : 60,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: "Outfit_700Bold",
    color: Colors.dark.text,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.card,
    alignItems: "center",
    justifyContent: "center",
  },
  yearSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginBottom: 24,
  },
  yearArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.card,
    alignItems: "center",
    justifyContent: "center",
  },
  yearText: {
    fontSize: 28,
    fontFamily: "Outfit_700Bold",
    color: Colors.dark.primary,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  monthCell: {
    width: "30%",
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  monthCellSelected: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  monthCellCurrent: {
    borderColor: Colors.dark.primary + "60",
  },
  monthCellText: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  monthCellTextSelected: {
    color: Colors.dark.background,
  },
  monthCellTextCurrent: {
    color: Colors.dark.primary,
  },
  intensityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  modalQuickJumps: {
    marginTop: 32,
    alignItems: "center",
  },
  modalQuickJumpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.dark.primaryMuted,
  },
  modalQuickJumpText: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.primary,
  },
});
