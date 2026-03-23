import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

function getLast14Days() {
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function formatDayLabel(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

function formatDayOfWeek(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00');
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[date.getDay()];
}

export default function DiaryScreen() {
  const insets = useSafeAreaInsets();
  const { students, attendance } = useApp();
  const days = useMemo(() => getLast14Days(), []);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const getStatus = (studentId: string, date: string) => {
    const record = attendance.find(a => a.studentId === studentId && a.date === date);
    if (!record) return 'present';
    return record.present ? 'present' : 'absent';
  };

  const getAbsentDaysCount = (studentId: string) => {
    return days.filter(d => getStatus(studentId, d) === 'absent').length;
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Diário</Text>
        <Text style={styles.headerSub}>Últimos 14 dias</Text>
      </View>

      {students.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum aluno cadastrado</Text>
          <Text style={styles.emptySubtitle}>Adicione alunos na aba Chamada</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tableWrapper}
        >
          <View>
            <View style={styles.headerRow}>
              <View style={styles.nameColumn}>
                <Text style={styles.columnLabel}>Aluno</Text>
              </View>
              {days.map(day => (
                <View key={day} style={styles.dayColumn}>
                  <Text style={styles.dayOfWeek}>{formatDayOfWeek(day)}</Text>
                  <Text style={styles.dayLabel}>{formatDayLabel(day)}</Text>
                </View>
              ))}
              <View style={styles.totalColumn}>
                <Text style={styles.columnLabel}>Faltas</Text>
              </View>
            </View>
            <ScrollView
              style={styles.bodyScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: bottomPadding + 100 }}
            >
              {students.map((student, index) => (
                <View
                  key={student.id}
                  style={[
                    styles.studentRow,
                    index % 2 === 0 ? styles.rowEven : styles.rowOdd,
                  ]}
                >
                  <View style={styles.nameColumn}>
                    <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
                  </View>
                  {days.map(day => {
                    const status = getStatus(student.id, day);
                    return (
                      <View key={day} style={styles.dayColumn}>
                        <View style={[
                          styles.cell,
                          status === 'absent' ? styles.cellAbsent : styles.cellPresent,
                        ]}>
                          {status === 'absent' ? (
                            <Ionicons name="close" size={14} color={Colors.danger} />
                          ) : (
                            <Ionicons name="checkmark" size={14} color={Colors.success} />
                          )}
                        </View>
                      </View>
                    );
                  })}
                  <View style={styles.totalColumn}>
                    <View style={[
                      styles.totalBadge,
                      getAbsentDaysCount(student.id) > 0 ? styles.totalBadgeDanger : styles.totalBadgeOk,
                    ]}>
                      <Text style={[
                        styles.totalText,
                        getAbsentDaysCount(student.id) > 0 ? styles.totalTextDanger : styles.totalTextOk,
                      ]}>
                        {getAbsentDaysCount(student.id)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tableWrapper: {
    paddingHorizontal: 0,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
    paddingVertical: 10,
  },
  bodyScroll: {
    flex: 1,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rowEven: {
    backgroundColor: Colors.surface,
  },
  rowOdd: {
    backgroundColor: Colors.background,
  },
  nameColumn: {
    width: 130,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  dayColumn: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalColumn: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  columnLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dayOfWeek: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
  },
  dayLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  studentName: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.text,
  },
  cell: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellPresent: {
    backgroundColor: Colors.successLight,
  },
  cellAbsent: {
    backgroundColor: Colors.dangerLight,
  },
  totalBadge: {
    width: 32,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalBadgeDanger: {
    backgroundColor: Colors.dangerLight,
  },
  totalBadgeOk: {
    backgroundColor: Colors.successLight,
  },
  totalText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  totalTextDanger: {
    color: Colors.danger,
  },
  totalTextOk: {
    color: Colors.success,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
