import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { Turma } from '@/context/AppContext';

interface ClassPickerProps {
  classes: Turma[];
  selectedClassId: string | null;
  onSelect: (id: string | null) => void;
  showAll?: boolean;
}

export function ClassPicker({ classes, selectedClassId, onSelect, showAll = true }: ClassPickerProps) {
  if (classes.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {showAll && (
          <TouchableOpacity
            style={[styles.chip, !selectedClassId && styles.chipActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(null);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, !selectedClassId && styles.chipTextActive]}>
              Todas
            </Text>
          </TouchableOpacity>
        )}
        {classes.map(turma => (
          <TouchableOpacity
            key={turma.id}
            style={[styles.chip, selectedClassId === turma.id && styles.chipActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(selectedClassId === turma.id ? null : turma.id);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, selectedClassId === turma.id && styles.chipTextActive]}>
              {turma.name}
            </Text>
          </TouchableOpacity>
        ))}
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
  chipActive: {
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
