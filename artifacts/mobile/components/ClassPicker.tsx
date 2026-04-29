import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { Turma } from '@/context/AppContext';

export const NO_CLASS_FILTER = '__no_class__';

interface ClassPickerProps {
  classes: Turma[];
  selectedClassId: string | null;
  onSelect: (id: string | null) => void;
  showAll?: boolean;
  showNoClass?: boolean;
}

export function ClassPicker({ classes, selectedClassId, onSelect, showAll = true, showNoClass = false }: ClassPickerProps) {
  if (classes.length === 0 && !showNoClass) return null;

  const isNoClassActive = selectedClassId === NO_CLASS_FILTER;
  const isAllActive = !selectedClassId;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {showAll && (
          <TouchableOpacity
            style={[styles.chip, isAllActive && styles.chipAllActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(null);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, isAllActive && styles.chipTextActive]}>
              Todas
            </Text>
          </TouchableOpacity>
        )}
        {showNoClass && (
          <TouchableOpacity
            style={[styles.chip, isNoClassActive && styles.chipAllActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(isNoClassActive ? null : NO_CLASS_FILTER);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, isNoClassActive && styles.chipTextActive]}>
              Sem turma
            </Text>
          </TouchableOpacity>
        )}
        {classes.map(turma => {
          const isActive = selectedClassId === turma.id;
          return (
            <TouchableOpacity
              key={turma.id}
              style={[
                styles.chip,
                isActive
                  ? { backgroundColor: turma.color, borderColor: turma.color }
                  : { borderColor: turma.color + '60' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(isActive ? null : turma.id);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {turma.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipAllActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },
});
