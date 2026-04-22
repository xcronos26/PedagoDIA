import React, { useState } from 'react';
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
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp, Turma } from '@/context/AppContext';
import { DataLoadingWrapper } from '@/components/DataLoadingWrapper';

export default function TurmasScreen() {
  const insets = useSafeAreaInsets();
  const { classes, addClass, updateClass, deleteClass, isLoaded, loadError, loadData } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [newName, setNewName] = useState('');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const topPadding = Platform.OS === 'web' ? 40 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 40 : insets.bottom;

  const handleAdd = async () => {
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      await addClass(newName.trim());
      setNewName('');
      setShowAddModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editName.trim() || !selectedTurma || saving) return;
    setSaving(true);
    try {
      await updateClass(selectedTurma.id, editName.trim());
      setShowEditModal(false);
      setSelectedTurma(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (turma: Turma) => {
    Alert.alert(
      'Excluir turma',
      `Excluir "${turma.name}"? Os alunos não serão removidos, apenas desvinculados da turma.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteClass(turma.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const openOptions = (turma: Turma) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedTurma(turma);
    Alert.alert(turma.name, undefined, [
      {
        text: 'Editar nome',
        onPress: () => {
          setEditName(turma.name);
          setShowEditModal(true);
        },
      },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => handleDelete(turma),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const kavBehavior = Platform.OS === 'ios' ? 'padding' : 'height';

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Turmas</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setNewName('');
            setShowAddModal(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <DataLoadingWrapper isLoaded={isLoaded} loadError={loadError} onRetry={loadData}>
        {classes.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="layers-outline" size={48} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Nenhuma turma cadastrada</Text>
            <Text style={styles.emptySubtitle}>Crie turmas para organizar seus alunos</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Nova turma</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={classes}
            keyExtractor={item => item.id}
            contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 100 }]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.turmaCard}
                onLongPress={() => openOptions(item)}
                activeOpacity={0.85}
                delayLongPress={400}
              >
                <View style={styles.turmaIcon}>
                  <Ionicons name="layers-outline" size={22} color={Colors.primary} />
                </View>
                <View style={styles.turmaInfo}>
                  <Text style={styles.turmaName}>{item.name}</Text>
                  <Text style={styles.turmaCount}>
                    {item.studentCount} {item.studentCount === 1 ? 'aluno' : 'alunos'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.moreBtn}
                  onPress={() => openOptions(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <Feather name="more-vertical" size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        )}
      </DataLoadingWrapper>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={kavBehavior} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Nova turma</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 3º Ano A, Turma Azul..."
              placeholderTextColor={Colors.textTertiary}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowAddModal(false); setNewName(''); }}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, (!newName.trim() || saving) && styles.btnDisabled]}
                onPress={handleAdd}
                activeOpacity={0.85}
                disabled={!newName.trim() || saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.confirmText}>Criar turma</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={kavBehavior} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Editar turma</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nome da turma"
              placeholderTextColor={Colors.textTertiary}
              value={editName}
              onChangeText={setEditName}
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleEdit}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowEditModal(false); setSelectedTurma(null); }}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, (!editName.trim() || saving) && styles.btnDisabled]}
                onPress={handleEdit}
                activeOpacity={0.85}
                disabled={!editName.trim() || saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.confirmText}>Salvar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.text,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  turmaCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  turmaIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turmaInfo: {
    flex: 1,
    gap: 2,
  },
  turmaName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  turmaCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  moreBtn: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.text,
  },
  modalInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#fff',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
