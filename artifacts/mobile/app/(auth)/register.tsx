import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Preencha todos os campos');
      return;
    }
    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(name.trim(), email.trim(), password);
      router.replace('/bem-vinda');
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={{ width: 44 }} />
        </View>

        <Text style={styles.title}>Criar nova conta</Text>
        <Text style={styles.subtitle}>Cadastre-se para começar a usar o PedagoDIA</Text>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Nome completo</Text>
            <View style={[styles.inputContainer, error ? styles.inputError : null]}>
              <Ionicons name="person-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Professora Maria Silva"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="words"
                value={name}
                onChangeText={(t) => { setName(t); setError(''); }}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>E-mail</Text>
            <View style={[styles.inputContainer, error ? styles.inputError : null]}>
              <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="professora@escola.br"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Senha</Text>
            <View style={[styles.inputContainer, error ? styles.inputError : null]}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                returnKeyType="next"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirmar senha</Text>
            <View style={[styles.inputContainer, error ? styles.inputError : null]}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Repita a senha"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                onSubmitEditing={handleRegister}
                returnKeyType="done"
              />
            </View>
          </View>

          {!!error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.registerButtonText}>Criar conta</Text>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.loginLinkText}>
              Já tem conta?{' '}
              <Text style={styles.loginLinkBold}>Fazer login</Text>
            </Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  logoImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
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
  inputError: {
    borderColor: Colors.danger,
  },
  inputIcon: {
    paddingLeft: 14,
  },
  eyeButton: {
    padding: 14,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.danger,
    flex: 1,
  },
  registerButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 56,
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
    opacity: 0.7,
  },
  registerButtonText: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  loginLinkText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
  },
  loginLinkBold: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
});
