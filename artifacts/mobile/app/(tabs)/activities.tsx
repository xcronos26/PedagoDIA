import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp, Activity, Student } from '@/context/AppContext';
import { router } from 'expo-router';

const SUBJECTS = ['Matemática', 'Português', 'Ciências', 'História', 'Geografia', 'Arte', 'Educação Física', 'Inglês'];

function ActivityCard({ activity, onPress, onDelete }: {
  activity: Activity;
  onPress: () => void;
  onDelete: () => void;
}) {
  const isHomework = activity.type === 'homework';
  const bgColor = isHomework ? Colors.homeworkLight : Colors.classworkLight;
  const accentColor = isHomework ? Colors.homework : Colors.classwork;

  function formatDate(dateStr: string) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

  return (
    <TouchableOpacity
      style={[styles.activityCard, { borderLeftColor: accentColor }]}
      onPress={onPress}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert('Remover atividade', 'Remover esta atividade?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Remover', style: 'destructive', onPress: onDelete },
        ]);
      }}
      activeOpacity={0.85}
    >
      <View style={styles.activityHeader}>
        <View style={[styles.typeBadge, { backgroundColor: bgColor }]}>
          <Ionicons
            name={isHomework ? 'home-outline' : 'school-outline'}
            size={13}
            color={accentColor}
          />
          <Text style={[styles.typeText, { color: accentColor }]}>
            {isHomework ? 'Para casa' : 'Sala'}
          </Text>
        </View>
        <Text style={styles.activityDate}>{formatDate(activity.date)}</Text>
      </View>
      <Text style={styles.activityDescription} numberOfLines={2}>{activity.description}</Text>
      {activity.link ? (
        <View style={styles.linkRow}>
          <Feather name="link" size={12} color={Colors.primary} />
          <Text style={styles.linkText} numberOfLines={1}>{activity.link}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function ActivitiesScreen() {
  const insets = useSafeAreaInsets();
  const { activities, students, addActivity, removeActivity, toggleDelivery, getDeliveriesForActivity } = useApp();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const [form, setForm] = useState({
    subject: SUBJECTS[0],
    type: 'homework' as 'homework' | 'classwork',
    link: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const filteredActivities = useMemo(() => {
    if (!selectedSubject) return activities;
    return activities.filter(a => a.subject === selectedSubject);
  }, [activities, selectedSubject]);

  const subjects = useMemo(() => {
    const used = [...new Set(activities.map(a => a.subject))];
    return used;
  }, [activities]);

  const handleAdd = async () => {
    if (!form.description.trim() || !form.date) return;
    await addActivity({
      subject: form.subject,
      type: form.type,
      link: form.link || undefined,
      date: form.date,
      description: form.description,
    });
    setShowAddModal(false);
    setForm({ subject: SUBJECTS[0], type: 'homework', link: '', date: new Date().toISOString().split('T')[0], description: '' });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deliveries = selectedActivity ? getDeliveriesForActivity(selectedActivity.id) : [];
  const isDelivered = (studentId: string) => deliveries.find(d => d.studentId === studentId)?.delivered ?? false;
  const deliveredCount = students.filter(s => isDelivered(s.id)).length;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Atividades</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectFilter} contentContainerStyle={styles.subjectFilterContent}>
        <TouchableOpacity
          style={[styles.subjectChip, !selectedSubject && styles.subjectChipActive]}
          onPress={() => setSelectedSubject(null)}
          activeOpacity={0.8}
        >
          <Text style={[styles.subjectChipText, !selectedSubject && styles.subjectChipTextActive]}>Todas</Text>
        </TouchableOpacity>
        {subjects.map(sub => (
          <TouchableOpacity
            key={sub}
            style={[styles.subjectChip, selectedSubject === sub && styles.subjectChipActive]}
            onPress={() => setSelectedSubject(sub === selectedSubject ? null : sub)}
            activeOpacity={0.8}
          >
            <Text style={[styles.subjectChipText, selectedSubject === sub && styles.subjectChipTextActive]}>{sub}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filteredActivities.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="book-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Nenhuma atividade</Text>
          <Text style={styles.emptySubtitle}>Toque no + para adicionar uma atividade</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.emptyButtonText}>Nova atividade</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredActivities}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ActivityCard
              activity={item}
              onPress={() => setSelectedActivity(item)}
              onDelete={() => removeActivity(item.id)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Activity Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Nova atividade</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Matéria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {SUBJECTS.map(sub => (
                    <TouchableOpacity
                      key={sub}
                      style={[styles.subjectChip, form.subject === sub && styles.subjectChipActive]}
                      onPress={() => setForm(f => ({ ...f, subject: sub }))}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.subjectChipText, form.subject === sub && styles.subjectChipTextActive]}>{sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.fieldLabel}>Tipo</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, form.type === 'homework' && styles.typeBtnActive]}
                  onPress={() => setForm(f => ({ ...f, type: 'homework' }))}
                  activeOpacity={0.8}
                >
                  <Ionicons name="home-outline" size={16} color={form.type === 'homework' ? Colors.homework : Colors.textSecondary} />
                  <Text style={[styles.typeBtnText, form.type === 'homework' && { color: Colors.homework }]}>Para casa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, form.type === 'classwork' && styles.typeBtnActiveClass]}
                  onPress={() => setForm(f => ({ ...f, type: 'classwork' }))}
                  activeOpacity={0.8}
                >
                  <Ionicons name="school-outline" size={16} color={form.type === 'classwork' ? Colors.classwork : Colors.textSecondary} />
                  <Text style={[styles.typeBtnText, form.type === 'classwork' && { color: Colors.classwork }]}>Em sala</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Descrição</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                placeholder="Descrição da atividade"
                placeholderTextColor={Colors.textTertiary}
                value={form.description}
                onChangeText={t => setForm(f => ({ ...f, description: t }))}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.fieldLabel}>Data</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={Colors.textTertiary}
                value={form.date}
                onChangeText={t => setForm(f => ({ ...f, date: t }))}
              />

              <Text style={styles.fieldLabel}>Link (opcional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="https://..."
                placeholderTextColor={Colors.textTertiary}
                value={form.link}
                onChangeText={t => setForm(f => ({ ...f, link: t }))}
                keyboardType="url"
                autoCapitalize="none"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowAddModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, (!form.description.trim() || !form.date) && styles.btnDisabled]}
                  onPress={handleAdd}
                  activeOpacity={0.85}
                  disabled={!form.description.trim() || !form.date}
                >
                  <Text style={styles.modalConfirmText}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Activity Delivery Modal */}
      {selectedActivity && (
        <Modal visible={!!selectedActivity} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { paddingBottom: insets.bottom + 16, maxHeight: '80%' }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalTitleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>{selectedActivity.description}</Text>
                  <Text style={styles.modalSubtitle}>{selectedActivity.subject} · {selectedActivity.type === 'homework' ? 'Para casa' : 'Em sala'}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedActivity(null)}>
                  <Ionicons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.deliveryStats}>
                <View style={styles.deliveryStat}>
                  <Text style={styles.deliveryStatNum}>{deliveredCount}</Text>
                  <Text style={styles.deliveryStatLabel}>Entregaram</Text>
                </View>
                <View style={styles.deliveryDivider} />
                <View style={styles.deliveryStat}>
                  <Text style={[styles.deliveryStatNum, { color: Colors.danger }]}>{students.length - deliveredCount}</Text>
                  <Text style={styles.deliveryStatLabel}>Pendentes</Text>
                </View>
              </View>

              {selectedActivity.link ? (
                <TouchableOpacity
                  style={styles.viewLinkBtn}
                  onPress={() => Linking.openURL(selectedActivity.link!)}
                  activeOpacity={0.85}
                >
                  <Feather name="external-link" size={16} color={Colors.primary} />
                  <Text style={styles.viewLinkText}>Visualizar atividade</Text>
                </TouchableOpacity>
              ) : null}

              <Text style={styles.fieldLabel}>Marcar entrega</Text>
              {students.length === 0 ? (
                <Text style={styles.noStudentsText}>Nenhum aluno cadastrado</Text>
              ) : (
                <FlatList
                  data={students}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => {
                    const delivered = isDelivered(item.id);
                    return (
                      <TouchableOpacity
                        style={[styles.deliveryRow, delivered && styles.deliveryRowDone]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          toggleDelivery(selectedActivity.id, item.id);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.deliveryStudentName, delivered && { color: Colors.success }]}>{item.name}</Text>
                        <View style={[styles.deliveryCheck, delivered && styles.deliveryCheckDone]}>
                          {delivered ? (
                            <Ionicons name="checkmark" size={16} color={Colors.success} />
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>
          </View>
        </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  subjectFilter: {
    maxHeight: 44,
    marginBottom: 8,
  },
  subjectFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  subjectChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  subjectChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  subjectChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
  },
  subjectChipTextActive: {
    color: Colors.primary,
  },
  list: {
    paddingHorizontal: 16,
    gap: 10,
    paddingTop: 4,
  },
  activityCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  activityDate: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
  },
  activityDescription: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: Colors.text,
    lineHeight: 22,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.primary,
    flex: 1,
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  typeBtnActive: {
    borderColor: Colors.homework,
    backgroundColor: Colors.homeworkLight,
  },
  typeBtnActiveClass: {
    borderColor: Colors.classwork,
    backgroundColor: Colors.classworkLight,
  },
  typeBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
  },
  modalInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 4,
  },
  textArea: {
    height: 88,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalConfirmText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  deliveryStats: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    justifyContent: 'center',
  },
  deliveryStat: {
    alignItems: 'center',
    flex: 1,
  },
  deliveryStatNum: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.success,
  },
  deliveryStatLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  deliveryDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  viewLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  viewLinkText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  deliveryRowDone: {
    backgroundColor: Colors.successLight,
    borderColor: '#A8E6B8',
  },
  deliveryStudentName: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: Colors.text,
    flex: 1,
  },
  deliveryCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  deliveryCheckDone: {
    borderColor: Colors.success,
    backgroundColor: Colors.successLight,
  },
  noStudentsText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
