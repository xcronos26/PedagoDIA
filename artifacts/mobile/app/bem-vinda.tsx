import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';

export const WELCOME_SEEN_KEY = 'pedagogia_welcome_seen';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const FEATURES: { icon: IoniconsName; text: string }[] = [
  { icon: 'checkmark-circle-outline', text: 'Registre chamadas diárias com rapidez' },
  { icon: 'book-outline', text: 'Gerencie atividades e acompanhe entregas' },
  { icon: 'people-outline', text: 'Organize alunos por turma' },
  { icon: 'bar-chart-outline', text: 'Gere relatórios completos por aluno' },
];

export default function BemVindaScreen() {
  const insets = useSafeAreaInsets();
  const { teacher } = useAuth();
  const { loadData } = useApp();

  const firstName = teacher?.name?.split(' ')[0] ?? 'Professora';

  const handleComecar = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true');
    await loadData();
    router.replace('/(tabs)');
  };

  return (
    <View style={[
      styles.container,
      { paddingTop: Platform.OS === 'web' ? 40 : insets.top + 20, paddingBottom: Platform.OS === 'web' ? 40 : insets.bottom + 20 }
    ]}>
      <View style={styles.content}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.greeting}>Bem-vindo(a),{'\n'}{firstName}! 🎉</Text>
        <Text style={styles.subtitle}>
          Sua conta foi criada com sucesso. O PedagoDIA vai te ajudar a:
        </Text>

        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={22} color={Colors.primary} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleComecar}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>Começar</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  greeting: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  featureList: {
    width: '100%',
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: '#fff',
  },
});
