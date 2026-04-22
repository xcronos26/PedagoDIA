import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const { teacher, updateProfile } = useAuth();
  const [name, setName] = useState(teacher?.name ?? '');
  const [saving, setSaving] = useState(false);

  const topPadding = Platform.OS === 'web' ? 40 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 40 : insets.bottom;

  const handleSave = async () => {
    if (!name.trim()) return;
    if (name.trim() === teacher?.name) {
      Alert.alert('Sem alterações', 'O nome não foi modificado.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(name.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível atualizar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: topPadding }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(name[0] ?? teacher?.name?.[0] ?? '?').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.avatarName}>{teacher?.name}</Text>
          <Text style={styles.avatarEmail}>{teacher?.email}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Informações pessoais</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nome completo</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Seu nome completo"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>E-mail</Text>
            <View style={[styles.inputContainer, styles.inputReadonly]}>
              <Ionicons name="mail-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
              <Text style={[styles.input, styles.readonlyText]} numberOfLines={1}>
                {teacher?.email}
              </Text>
              <View style={styles.lockedBadge}>
                <Ionicons name="lock-closed" size={12} color={Colors.textTertiary} />
              </View>
            </View>
            <Text style={styles.hint}>O e-mail não pode ser alterado</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, (!name.trim() || saving) && styles.buttonDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={!name.trim() || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Salvar alterações</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    backgroundColor: Colors.background,
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
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 20,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    color: Colors.primary,
  },
  avatarName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.text,
  },
  avatarEmail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  inputReadonly: {
    opacity: 0.75,
  },
  inputIcon: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  readonlyText: {
    color: Colors.textSecondary,
  },
  lockedBadge: {
    paddingRight: 14,
  },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#fff',
  },
});
