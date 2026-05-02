import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';

const MENU_ITEMS = [
  {
    label: 'Chamada',
    icon: 'check-circle',
    lib: 'feather' as const,
    description: 'Registrar presença diária',
    route: '/',
    color: Colors.primary,
    bg: Colors.primaryLight,
  },
  {
    label: 'Diário',
    icon: 'calendar',
    lib: 'feather' as const,
    description: 'Histórico de chamadas',
    route: '/diary',
    color: '#059669',
    bg: '#D1FAE5',
  },
  {
    label: 'Atividades',
    icon: 'book-open',
    lib: 'feather' as const,
    description: 'Gerenciar atividades',
    route: '/activities',
    color: '#D97706',
    bg: '#FEF3C7',
  },
  {
    label: 'Planejamento',
    icon: 'clipboard',
    lib: 'feather' as const,
    description: 'Planejar aulas da semana',
    route: '/planning',
    color: '#7C3AED',
    bg: '#EDE9FE',
  },
  {
    label: 'Provas',
    icon: 'file-text',
    lib: 'feather' as const,
    description: 'Criar provas com IA',
    route: '/provas',
    color: '#7C3AED',
    bg: '#EDE9FE',
  },
  {
    label: 'Relatórios',
    icon: 'bar-chart-2',
    lib: 'feather' as const,
    description: 'Relatórios por aluno',
    route: '/reports',
    color: '#DB2777',
    bg: '#FCE7F3',
  },
  {
    label: 'Turmas',
    icon: 'layers',
    lib: 'feather' as const,
    description: 'Gerenciar turmas',
    route: '/turmas',
    color: '#0891B2',
    bg: '#CFFAFE',
  },
  {
    label: 'Meu Perfil',
    icon: 'user',
    lib: 'feather' as const,
    description: 'Editar nome e conta',
    route: '/perfil',
    color: '#16A34A',
    bg: '#DCFCE7',
  },
  {
    label: 'Sobre / Contribuição',
    icon: 'heart',
    lib: 'feather' as const,
    description: 'Desenvolvedores e doações',
    route: '/sobre',
    color: '#DC2626',
    bg: '#FEE2E2',
  },
];

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const { teacher } = useAuth();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Menu</Text>
        {teacher && (
          <Text style={styles.subtitle} numberOfLines={1}>
            Olá, {teacher.name.split(' ')[0]}!
          </Text>
        )}
        {!teacher && (
          <Text style={styles.subtitle}>Acesse todas as funcionalidades</Text>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.grid, { paddingBottom: bottomPadding + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {MENU_ITEMS.map(item => (
          <TouchableOpacity
            key={item.route}
            style={styles.card}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(item.route as any);
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
              <Feather name={item.icon as any} size={26} color={item.color} />
            </View>
            <Text style={styles.cardLabel}>{item.label}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 30,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  grid: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    width: '47.5%',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  cardDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
});
