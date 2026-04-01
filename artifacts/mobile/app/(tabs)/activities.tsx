import React, { useState, useMemo, useCallback } from 'react';
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
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { DataLoadingWrapper } from '@/components/DataLoadingWrapper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp, Activity } from '@/context/AppContext';
import { getBrasiliaToday, parseISODate, toISO, formatBR } from '@/utils/date';

type ActivityAction = { activity: Activity; mode: 'options' | 'edit' } | null;

function ActivityCard({ activity, onPress, onLongPress }: {
  activity: Activity;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const isHomework = activity.type === 'homework';
  const bgColor = isHomework ? '#FFEDD5' : '#DBEAFE';
  const accentColor = isHomework ? '#C2410C' : '#1D4ED8';

  function formatDate(dateStr: string) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

  async function handleOpenLink() {
    if (!activity.link) return;
    try {
      let url = activity.link.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Link inválido', 'Não foi possível abrir este link.');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o link.');
    }
  }

  return (
    <TouchableOpacity
      style={[styles.activityCard, { borderLeftColor: accentColor }]}
      onPress={onPress}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress();
      }}
      activeOpacity={0.85}
    >
      <View style={styles.activityHeader}>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <View style={[styles.typeBadge, { backgroundColor: bgColor }]}>
            <Ionicons name={isHomework ? 'home-outline' : 'school-outline'} size={13} color={accentColor} />
            <Text style={[styles.typeText, { color: accentColor }]}>
              {isHomework ? 'Para casa' : 'Sala'}
            </Text>
          </View>
          <View style={styles.subjectBadge}>
            <Text style={styles.subjectBadgeText}>{activity.subject}</Text>
          </View>
        </View>
        <Text style={styles.activityDate}>{formatDate(activity.date)}</Text>
      </View>
      <Text style={styles.activityDescription} numberOfLines={2}>{activity.description}</Text>
      {activity.link ? (
        <TouchableOpacity style={styles.linkRow} onPress={handleOpenLink} activeOpacity={0.7}>
          <Feather name="external-link" size={12} color={Colors.primary} />
          <Text style={styles.linkText} numberOfLines={1}>{activity.link}</Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const emptyForm = {
  subject: '',
  type: 'homework' as 'homework' | 'classwork',
  link: '',
  date: getBrasiliaToday(),
  description: '',
};

export default function ActivitiesScreen() {
  const insets = useSafeAreaInsets();
  const {
    activities, students, subjects, addActivity, updateActivity, removeActivity,
    toggleDelivery, toggleSeen, getDeliveriesForActivity, addSubject,
    isLoaded, loadError, loadData,
  } = useApp();

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [activityAction, setActivityAction] = useState<ActivityAction>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [addingSaving, setAddingSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [loadingDelivery, setLoadingDelivery] = useState<Set<string>>(new Set());
  const [loadingSeen, setLoadingSeen] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({ ...emptyForm });
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [showAddDatePicker, setShowAddDatePicker] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const currentFormSubject = form.subject || subjects[0] || '';
  const currentEditSubject = editForm.subject || subjects[0] || '';

  const filteredActivities = useMemo(() => {
    if (!selectedSubject) return activities;
    return activities.filter(a => a.subject === selectedSubject);
  }, [activities, selectedSubject]);

  const handleAdd = async () => {
    if (!form.description.trim() || !form.date || addingSaving) return;
    setAddingSaving(true);
    try {
      await addActivity({
        subject: currentFormSubject,
        type: form.type,
        link: form.link || undefined,
        date: form.date,
        description: form.description,
      });
      setShowAddModal(false);
      setForm({ ...emptyForm });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setAddingSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!activityAction || activityAction.mode !== 'edit') return;
    if (!editForm.description.trim() || !editForm.date || editSaving) return;
    setEditSaving(true);
    try {
      await updateActivity(activityAction.activity.id, {
        subject: currentEditSubject,
        type: editForm.type,
        link: editForm.link || undefined,
        date: editForm.date,
        description: editForm.description,
      });
      setActivityAction(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setEditSaving(false);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    await addSubject(newSubjectName);
    setNewSubjectName('');
    setShowAddSubjectModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const openEditForm = (activity: Activity) => {
    setEditForm({
      subject: activity.subject,
      type: activity.type,
      link: activity.link || '',
      date: activity.date,
      description: activity.description,
    });
    setActivityAction({ activity, mode: 'edit' });
  };

  const handleDeleteActivity = (activity: Activity) => {
    Alert.alert('Remover atividade', 'Remover esta atividade?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: () => {
          removeActivity(activity.id);
          setActivityAction(null);
        },
      },
    ]);
  };

  async function openLink(url: string) {
    try {
      let finalUrl = url.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }
      const supported = await Linking.canOpenURL(finalUrl);
      if (supported) {
        await Linking.openURL(finalUrl);
      } else {
        Alert.alert('Link inválido', 'Não foi possível abrir este link.');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o link.');
    }
  }

  const deliveries = selectedActivity ? getDeliveriesForActivity(selectedActivity.id) : [];
  const getDelivery = (studentId: string) => deliveries.find(d => d.studentId === studentId);
  const isDelivered = (studentId: string) => getDelivery(studentId)?.delivered ?? false;
  const isSeen = (studentId: string) => getDelivery(studentId)?.seen ?? false;

  const deliveredCount = students.filter(s => isDelivered(s.id)).length;
  const seenCount = students.filter(s => isSeen(s.id)).length;

  const kavBehavior = Platform.OS === 'ios' ? 'padding' : 'height';

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
        <TouchableOpacity
          style={styles.addSubjectChip}
          onPress={() => setShowAddSubjectModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={14} color={Colors.primary} />
          <Text style={styles.addSubjectChipText}>Nova matéria</Text>
        </TouchableOpacity>
      </ScrollView>

      <DataLoadingWrapper isLoaded={isLoaded} loadError={loadError} onRetry={loadData}>
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
              onLongPress={() => setActivityAction({ activity: item, mode: 'options' })}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
      </DataLoadingWrapper>

      {/* Add Subject Modal */}
      <Modal visible={showAddSubjectModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={kavBehavior} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Nova matéria</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nome da matéria"
              placeholderTextColor={Colors.textTertiary}
              value={newSubjectName}
              onChangeText={setNewSubjectName}
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleAddSubject}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowAddSubjectModal(false); setNewSubjectName(''); }} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !newSubjectName.trim() && styles.btnDisabled]}
                onPress={handleAddSubject}
                activeOpacity={0.85}
                disabled={!newSubjectName.trim()}
              >
                <Text style={styles.modalConfirmText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Activity Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={kavBehavior} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Nova atividade</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Matéria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {subjects.map(sub => (
                    <TouchableOpacity
                      key={sub}
                      style={[styles.subjectChip, currentFormSubject === sub && styles.subjectChipActive]}
                      onPress={() => setForm(f => ({ ...f, subject: sub }))}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.subjectChipText, currentFormSubject === sub && styles.subjectChipTextActive]}>{sub}</Text>
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
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowAddDatePicker(true)} activeOpacity={0.85}>
                <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                <Text style={styles.dateButtonText}>{formatBR(form.date)}</Text>
              </TouchableOpacity>
              {showAddDatePicker && (
                <DateTimePicker
                  value={parseISODate(form.date)}
                  mode="date"
                  display="default"
                  onChange={(_, date) => {
                    setShowAddDatePicker(false);
                    if (date) setForm(f => ({ ...f, date: toISO(date) }));
                  }}
                  locale="pt-BR"
                />
              )}

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
                  style={[styles.modalCancelBtn, addingSaving && styles.btnDisabled]}
                  onPress={() => setShowAddModal(false)}
                  activeOpacity={0.8}
                  disabled={addingSaving}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, (!form.description.trim() || addingSaving) && styles.btnDisabled]}
                  onPress={handleAdd}
                  activeOpacity={0.85}
                  disabled={!form.description.trim() || addingSaving}
                >
                  {addingSaving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.modalConfirmText}>Adicionar</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Activity Options Modal (long press) */}
      <Modal visible={!!activityAction && activityAction.mode === 'options'} transparent animationType="slide">
        <KeyboardAvoidingView behavior={kavBehavior} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActivityAction(null)}>
            <View style={[styles.modalCard, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle} numberOfLines={2}>{activityAction?.activity.description}</Text>
              <TouchableOpacity
                style={[styles.optionRow, styles.optionEdit]}
                onPress={() => activityAction && openEditForm(activityAction.activity)}
                activeOpacity={0.85}
              >
                <Feather name="edit-2" size={20} color={Colors.primary} />
                <Text style={[styles.optionText, { color: Colors.primary }]}>Editar atividade</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionRow, styles.optionDelete]}
                onPress={() => activityAction && handleDeleteActivity(activityAction.activity)}
                activeOpacity={0.85}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                <Text style={[styles.optionText, { color: Colors.danger }]}>Remover atividade</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setActivityAction(null)} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Activity Modal */}
      <Modal visible={!!activityAction && activityAction.mode === 'edit'} transparent animationType="slide">
        <KeyboardAvoidingView behavior={kavBehavior} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Editar atividade</Text>
              <TouchableOpacity onPress={() => setActivityAction(null)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Matéria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {subjects.map(sub => (
                    <TouchableOpacity
                      key={sub}
                      style={[styles.subjectChip, currentEditSubject === sub && styles.subjectChipActive]}
                      onPress={() => setEditForm(f => ({ ...f, subject: sub }))}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.subjectChipText, currentEditSubject === sub && styles.subjectChipTextActive]}>{sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.fieldLabel}>Tipo</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, editForm.type === 'homework' && styles.typeBtnActive]}
                  onPress={() => setEditForm(f => ({ ...f, type: 'homework' }))}
                  activeOpacity={0.8}
                >
                  <Ionicons name="home-outline" size={16} color={editForm.type === 'homework' ? Colors.homework : Colors.textSecondary} />
                  <Text style={[styles.typeBtnText, editForm.type === 'homework' && { color: Colors.homework }]}>Para casa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, editForm.type === 'classwork' && styles.typeBtnActiveClass]}
                  onPress={() => setEditForm(f => ({ ...f, type: 'classwork' }))}
                  activeOpacity={0.8}
                >
                  <Ionicons name="school-outline" size={16} color={editForm.type === 'classwork' ? Colors.classwork : Colors.textSecondary} />
                  <Text style={[styles.typeBtnText, editForm.type === 'classwork' && { color: Colors.classwork }]}>Em sala</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Descrição</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                placeholder="Descrição da atividade"
                placeholderTextColor={Colors.textTertiary}
                value={editForm.description}
                onChangeText={t => setEditForm(f => ({ ...f, description: t }))}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.fieldLabel}>Data</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowEditDatePicker(true)} activeOpacity={0.85}>
                <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                <Text style={styles.dateButtonText}>{formatBR(editForm.date)}</Text>
              </TouchableOpacity>
              {showEditDatePicker && (
                <DateTimePicker
                  value={parseISODate(editForm.date)}
                  mode="date"
                  display="default"
                  onChange={(_, date) => {
                    setShowEditDatePicker(false);
                    if (date) setEditForm(f => ({ ...f, date: toISO(date) }));
                  }}
                  locale="pt-BR"
                />
              )}

              <Text style={styles.fieldLabel}>Link (opcional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="https://..."
                placeholderTextColor={Colors.textTertiary}
                value={editForm.link}
                onChangeText={t => setEditForm(f => ({ ...f, link: t }))}
                keyboardType="url"
                autoCapitalize="none"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, editSaving && styles.btnDisabled]}
                  onPress={() => setActivityAction(null)}
                  activeOpacity={0.8}
                  disabled={editSaving}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, (!editForm.description.trim() || editSaving) && styles.btnDisabled]}
                  onPress={handleSaveEdit}
                  activeOpacity={0.85}
                  disabled={!editForm.description.trim() || editSaving}
                >
                  {editSaving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.modalConfirmText}>Salvar</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Activity Delivery Modal */}
      {selectedActivity ? (
        <Modal visible={!!selectedActivity} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { paddingBottom: insets.bottom + 16, maxHeight: '88%' }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalTitleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>{selectedActivity.description}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <View style={[styles.typeBadge, { backgroundColor: selectedActivity.type === 'homework' ? Colors.homeworkLight : Colors.classworkLight }]}>
                      <Text style={[styles.typeText, { color: selectedActivity.type === 'homework' ? Colors.homework : Colors.classwork }]}>
                        {selectedActivity.type === 'homework' ? 'Para casa' : 'Em sala'}
                      </Text>
                    </View>
                    <View style={styles.subjectBadge}>
                      <Text style={styles.subjectBadgeText}>{selectedActivity.subject}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedActivity(null)}>
                  <Ionicons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.deliveryStats}>
                <View style={styles.deliveryStat}>
                  <Text style={[styles.deliveryStatNum, { color: Colors.success }]}>{deliveredCount}</Text>
                  <Text style={styles.deliveryStatLabel}>Entregaram</Text>
                </View>
                <View style={styles.deliveryDivider} />
                <View style={styles.deliveryStat}>
                  <Text style={[styles.deliveryStatNum, { color: Colors.primary }]}>{seenCount}</Text>
                  <Text style={styles.deliveryStatLabel}>Vistos</Text>
                </View>
                <View style={styles.deliveryDivider} />
                <View style={styles.deliveryStat}>
                  <Text style={[styles.deliveryStatNum, { color: Colors.danger }]}>{students.length - deliveredCount}</Text>
                  <Text style={styles.deliveryStatLabel}>Pendentes</Text>
                </View>
              </View>

              {selectedActivity.link ? (
                <TouchableOpacity style={styles.viewLinkBtn} onPress={() => openLink(selectedActivity.link!)} activeOpacity={0.85}>
                  <Feather name="external-link" size={16} color={Colors.primary} />
                  <Text style={styles.viewLinkText}>Visualizar atividade</Text>
                </TouchableOpacity>
              ) : null}

              <Text style={styles.fieldLabel}>Marcar por aluno</Text>

              {students.length === 0 ? (
                <Text style={styles.noStudentsText}>Nenhum aluno cadastrado</Text>
              ) : (
                <FlatList
                  data={students}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => {
                    const delivered = isDelivered(item.id);
                    const seen = isSeen(item.id);
                    const deliveryKey = `${item.id}-d`;
                    const seenKey = `${item.id}-s`;
                    const isDeliveryLoading = loadingDelivery.has(deliveryKey);
                    const isSeenLoading = loadingSeen.has(seenKey);

                    const handleToggleDelivery = async () => {
                      if (isDeliveryLoading) return;
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setLoadingDelivery(prev => new Set(prev).add(deliveryKey));
                      try {
                        await toggleDelivery(selectedActivity.id, item.id);
                      } finally {
                        setLoadingDelivery(prev => { const next = new Set(prev); next.delete(deliveryKey); return next; });
                      }
                    };

                    const handleToggleSeen = async () => {
                      if (isSeenLoading) return;
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setLoadingSeen(prev => new Set(prev).add(seenKey));
                      try {
                        await toggleSeen(selectedActivity.id, item.id);
                      } finally {
                        setLoadingSeen(prev => { const next = new Set(prev); next.delete(seenKey); return next; });
                      }
                    };

                    return (
                      <View style={styles.deliveryRow}>
                        <Text style={styles.deliveryStudentName} numberOfLines={1}>{item.name}</Text>
                        <View style={styles.deliveryActions}>
                          <TouchableOpacity
                            style={[styles.deliveryActionBtn, delivered ? styles.deliveryActionDelivered : styles.deliveryActionEmpty, isDeliveryLoading && { opacity: 0.6 }]}
                            onPress={handleToggleDelivery}
                            activeOpacity={0.8}
                            disabled={isDeliveryLoading}
                          >
                            {isDeliveryLoading
                              ? <ActivityIndicator size="small" color={Colors.success} style={{ width: 14, height: 14 }} />
                              : <Ionicons name={delivered ? 'checkmark' : 'checkmark-outline'} size={14} color={delivered ? Colors.success : Colors.textTertiary} />
                            }
                            <Text style={[styles.deliveryActionLabel, delivered && { color: Colors.success }]}>Entregue</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.deliveryActionBtn, seen ? styles.deliveryActionSeen : styles.deliveryActionEmpty, isSeenLoading && { opacity: 0.6 }]}
                            onPress={handleToggleSeen}
                            activeOpacity={0.8}
                            disabled={isSeenLoading}
                          >
                            {isSeenLoading
                              ? <ActivityIndicator size="small" color={Colors.primary} style={{ width: 14, height: 14 }} />
                              : <Ionicons name={seen ? 'eye' : 'eye-outline'} size={14} color={seen ? Colors.primary : Colors.textTertiary} />
                            }
                            <Text style={[styles.deliveryActionLabel, seen && { color: Colors.primary }]}>Visto</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.text, letterSpacing: -0.5 },
  addButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  subjectFilter: { maxHeight: 44, marginBottom: 8 },
  subjectFilterContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  subjectChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
  },
  subjectChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  subjectChipText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  subjectChipTextActive: { color: Colors.primary },
  addSubjectChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.primaryLight, borderWidth: 1.5, borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  addSubjectChipText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.primary },
  list: { paddingHorizontal: 16, gap: 10, paddingTop: 4 },
  activityCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    borderLeftWidth: 4, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    marginBottom: 2,
  },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  typeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  subjectBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border,
  },
  subjectBadgeText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  activityDate: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  activityDescription: { fontSize: 15, fontFamily: 'Inter_500Medium', color: Colors.text, lineHeight: 22 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.primary, flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyIcon: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'center' },
  emptyButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  emptyButtonText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, gap: 12,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: Colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 4,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: Colors.text, flex: 1 },
  modalInput: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, fontFamily: 'Inter_400Regular', color: Colors.text, borderWidth: 1.5, borderColor: Colors.border,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, marginBottom: 6, marginTop: 4 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  modalCancelText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  modalConfirmBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  modalConfirmText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  btnDisabled: { opacity: 0.4 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  typeBtnActive: { borderColor: Colors.homework, backgroundColor: Colors.homeworkLight },
  typeBtnActiveClass: { borderColor: Colors.classwork, backgroundColor: Colors.classworkLight },
  typeBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 16, paddingHorizontal: 4, borderRadius: 12,
  },
  optionEdit: { backgroundColor: Colors.primaryLight, paddingHorizontal: 16 },
  optionDelete: { backgroundColor: '#FEF2F2', paddingHorizontal: 16 },
  optionText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  deliveryStats: {
    flexDirection: 'row', backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16, padding: 16, justifyContent: 'space-around',
  },
  deliveryStat: { alignItems: 'center', gap: 4 },
  deliveryStatNum: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  deliveryStatLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  deliveryDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  viewLinkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primaryLight, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12,
  },
  viewLinkText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  noStudentsText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'center', paddingVertical: 12 },
  deliveryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  deliveryStudentName: { fontSize: 15, fontFamily: 'Inter_500Medium', color: Colors.text, flex: 1, marginRight: 12 },
  deliveryActions: { flexDirection: 'row', gap: 8 },
  deliveryActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  deliveryActionEmpty: { backgroundColor: Colors.surfaceSecondary },
  deliveryActionDelivered: { backgroundColor: '#F0FDF4', borderColor: Colors.success },
  deliveryActionSeen: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  deliveryActionLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textTertiary },
  dateButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.primaryLight, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  dateButtonText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
});
