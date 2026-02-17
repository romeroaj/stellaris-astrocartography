/**
 * TimeScrubber — Cyclocartography time navigation component
 *
 * Provides:
 * - Left/right arrows for prev/next month
 * - Tappable date display that opens a month+year jump modal
 * - "Today" pill that appears when not on the current month
 * - Compact variant for inline use
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

interface TimeScrubberProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  monthlyIntensity?: Map<string, number>;
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

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export default function TimeScrubber({
  selectedDate,
  onDateChange,
  monthlyIntensity,
  compact = false,
}: TimeScrubberProps) {
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [jumpYear, setJumpYear] = useState(selectedDate.getFullYear());
  const today = new Date();

  const handlePrevMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDateChange(addMonths(selectedDate, -1));
  }, [selectedDate, onDateChange]);

  const handleNextMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDateChange(addMonths(selectedDate, 1));
  }, [selectedDate, onDateChange]);

  const handleJumpToMonthYear = useCallback((month: number, year: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDateChange(new Date(year, month, 15));
    setShowJumpModal(false);
  }, [onDateChange]);

  const handleToday = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDateChange(new Date());
  }, [onDateChange]);

  const getIntensityColor = (intensity: number): string => {
    if (intensity >= 0.8) return Colors.dark.primary;
    if (intensity >= 0.5) return Colors.dark.secondary;
    if (intensity >= 0.2) return Colors.dark.primary + "60";
    return "transparent";
  };

  const notToday = !isSameMonth(selectedDate, today);

  function renderJumpModal() {
    return (
      <Modal
        visible={showJumpModal}
        animationType="slide"
        presentationStyle="formSheet"
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

          {/* Today shortcut */}
          <View style={styles.modalFooter}>
            <Pressable
              style={styles.modalTodayBtn}
              onPress={() => { handleJumpToMonthYear(today.getMonth(), today.getFullYear()); }}
            >
              <Ionicons name="today-outline" size={16} color={Colors.dark.primary} />
              <Text style={styles.modalTodayText}>Back to Today</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Pressable style={styles.compactNav} onPress={handlePrevMonth}>
          <Ionicons name="chevron-back" size={18} color={Colors.dark.textSecondary} />
        </Pressable>

        <Pressable
          style={styles.compactDateDisplay}
          onPress={() => { setJumpYear(selectedDate.getFullYear()); setShowJumpModal(true); }}
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

        {notToday && (
          <Pressable style={styles.todayPill} onPress={handleToday}>
            <Text style={styles.todayPillText}>Today</Text>
          </Pressable>
        )}

        {renderJumpModal()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header: arrows + date display + today */}
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

        {notToday && (
          <Pressable style={styles.todayBtn} onPress={handleToday}>
            <Ionicons name="today-outline" size={14} color={Colors.dark.primary} />
            <Text style={styles.todayBtnText}>Today</Text>
          </Pressable>
        )}
      </View>

      {renderJumpModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
  todayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.dark.primary + "20",
  },
  todayBtnText: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.primary,
  },
  // ── Compact ──
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
  // ── Modal ──
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
    marginBottom: 28,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "Outfit_700Bold",
    color: Colors.dark.text,
  },
  modalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
  modalFooter: {
    marginTop: 28,
    alignItems: "center",
  },
  modalTodayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.dark.primaryMuted,
  },
  modalTodayText: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.dark.primary,
  },
});
