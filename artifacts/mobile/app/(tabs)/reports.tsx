import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useApp, Student, Activity } from '@/context/AppContext';

function StudentReportCard({ student, onPress }: { student: Student; onPress: () => void }) {
  const { activities, getDeliveriesForStudent } = useApp();
  const deliveries = getDeliveriesForStudent(student.id);

  const deliveredCount = deliveries.filter(d => d.delivered).length;
  const total = activities.length;
  const rate = total > 0 ? Math.round((deliveredCount / total) * 100) : 100;

  const color = rate >= 80 ? Colors.success : rate >= 50 ? Colors.warning : Colors.danger;

  return (
    <TouchableOpacity style={styles.studentCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.avatarCircle, { backgroundColor: Colors.primaryLight }]}>
        <Text style={styles.avatarText}>{student.name[0].toUpperCase()}</Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{student.name}</Text>
        <Text style={styles.studentStats}>
          {deliveredCount} de {total} atividades entregues
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${rate}%` as any, backgroundColor: color }]} />
        </View>
      </View>
      <View style={[styles.rateBadge, { backgroundColor: color + '20' }]}>
        <Text style={[styles.rateText, { color }]}>{rate}%</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

function ActivityStatusRow({ activity, delivered }: { activity: Activity; delivered: boolean }) {
  const isHomework = activity.type === 'homework';
  const accentColor = isHomework ? Colors.homework : Colors.classwork;

  function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  }

  return (
    <View style={[styles.activityRow, delivered && styles.activityRowDelivered]}>
      <View style={[styles.activityDot, { backgroundColor: accentColor + '30' }]}>
        <Ionicons
          name={isHomework ? 'home-outline' : 'school-outline'}
          size={14}
          color={accentColor}
        />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityName} numberOfLines={1}>{activity.description}</Text>
        <Text style={styles.activityMeta}>{activity.subject} · {formatDate(activity.date)}</Text>
      </View>
      <View style={[styles.statusBadge, delivered ? styles.badgeDelivered : styles.badgePending]}>
        {delivered ? (
          <Ionicons name="checkmark" size={14} color={Colors.success} />
        ) : (
          <Ionicons name="time-outline" size={14} color={Colors.warning} />
        )}
        <Text style={[styles.badgeText, delivered ? styles.badgeTextDelivered : styles.badgeTextPending]}>
          {delivered ? 'Entregue' : 'Pendente'}
        </Text>
      </View>
    </View>
  );
}

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { students, activities, getDeliveriesForStudent } = useApp();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const studentDeliveries = useMemo(() => {
    if (!selectedStudent) return [];
    const deliveries = getDeliveriesForStudent(selectedStudent.id);
    return activities.map(a => ({
      activity: a,
      delivered: deliveries.find(d => d.activityId === a.id)?.delivered ?? false,
    }));
  }, [selectedStudent, activities, getDeliveriesForStudent]);

  const deliveredCount = studentDeliveries.filter(d => d.delivered).length;

  if (selectedStudent) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedStudent(null)} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerMid}>
            <Text style={styles.headerTitle} numberOfLines={1}>{selectedStudent.name}</Text>
            <Text style={styles.headerSub}>Relatório de entregas</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{deliveredCount}</Text>
            <Text style={styles.summaryLabel}>Entregues</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: Colors.warning }]}>{activities.length - deliveredCount}</Text>
            <Text style={styles.summaryLabel}>Pendentes</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{activities.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>

        {studentDeliveries.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-outline" size={48} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Nenhuma atividade</Text>
            <Text style={styles.emptySubtitle}>Adicione atividades na aba Atividades</Text>
          </View>
        ) : (
          <FlatList
            data={studentDeliveries}
            keyExtractor={item => item.activity.id}
            renderItem={({ item }) => (
              <ActivityStatusRow activity={item.activity} delivered={item.delivered} />
            )}
            contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 100 }]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Relatórios</Text>
          <Text style={styles.headerSub}>{students.length} alunos</Text>
        </View>
      </View>

      {students.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bar-chart-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum dado ainda</Text>
          <Text style={styles.emptySubtitle}>Adicione alunos e atividades para ver relatórios</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <StudentReportCard
              student={item}
              onPress={() => setSelectedStudent(item)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 100 }]}
          showsVerticalScrollIndicator={false}
        />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerMid: {
    flex: 1,
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
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 10,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  studentInfo: {
    flex: 1,
    gap: 4,
  },
  studentName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  studentStats: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  rateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  rateText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  summaryCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryNum: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.success,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 2,
  },
  activityRowDelivered: {
    backgroundColor: Colors.successLight,
    borderColor: '#A8E6B8',
  },
  activityDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
    gap: 2,
  },
  activityName: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: Colors.text,
  },
  activityMeta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeDelivered: {
    backgroundColor: Colors.successLight,
  },
  badgePending: {
    backgroundColor: Colors.warningLight,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  badgeTextDelivered: {
    color: Colors.success,
  },
  badgeTextPending: {
    color: Colors.warning,
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
