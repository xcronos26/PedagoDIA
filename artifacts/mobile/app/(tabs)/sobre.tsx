import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';

const PIX_KEY = 'dc242bfa-7e82-4e6a-ac75-97f3278c36e7';
const WA_URL = 'https://wa.me/61984731078';

export default function SobreScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const copyPix = async () => {
    try {
      await Clipboard.setStringAsync(PIX_KEY);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Chave PIX copiada!', 'Cole no seu aplicativo de pagamentos. 🙏');
    } catch {
      Alert.alert('Erro', 'Não foi possível copiar. Copie manualmente a chave acima.');
    }
  };

  const openWhatsApp = () => {
    Linking.openURL(WA_URL).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    });
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sobre</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & App Identity */}
        <View style={styles.logoWrap}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>PedagoDIA</Text>
          <Text style={styles.tagline}>Gestão de Turma</Text>
        </View>

        {/* Developed by */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="code-slash" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Desenvolvido por</Text>
          </View>
          <View style={styles.devRow}>
            <View style={[styles.devAvatar, { backgroundColor: Colors.primaryLight }]}>
              <Text style={[styles.devAvatarText, { color: Colors.primary }]}>L</Text>
            </View>
            <Text style={styles.devName}>Lucas Nunes</Text>
          </View>
          <View style={styles.devRow}>
            <View style={[styles.devAvatar, { backgroundColor: '#FCE7F3' }]}>
              <Text style={[styles.devAvatarText, { color: '#DB2777' }]}>B</Text>
            </View>
            <Text style={styles.devName}>Beatriz Dantas</Text>
          </View>
        </View>

        {/* Contribution / Donation */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="heart" size={20} color="#DC2626" />
            <Text style={styles.cardTitle}>Faça uma Contribuição</Text>
          </View>
          <Text style={styles.cardText}>
            Está gostando do PedagoDIA? Se quiser contribuir com o desenvolvimento do aplicativo, você pode fazer uma doação via PIX. Qualquer valor é muito bem-vindo! 😊
          </Text>

          <View style={styles.pixBox}>
            <Text style={styles.pixLabel}>Chave PIX aleatória</Text>
            <Text style={styles.pixKey} selectable>{PIX_KEY}</Text>
          </View>

          <TouchableOpacity style={styles.copyBtn} onPress={copyPix} activeOpacity={0.8}>
            <Feather name="copy" size={18} color="#fff" />
            <Text style={styles.copyBtnText}>Copiar chave PIX</Text>
          </TouchableOpacity>

          <Text style={styles.thankYou}>Muito obrigado! ❤️</Text>
        </View>

        {/* Suggestions */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#059669" />
            <Text style={styles.cardTitle}>Sugestões</Text>
          </View>
          <Text style={styles.cardText}>
            Tem sugestões de melhorias ou quer pedir novas funcionalidades? Fale com a gente pelo WhatsApp!
          </Text>
          <TouchableOpacity style={styles.waBtn} onPress={openWhatsApp} activeOpacity={0.8}>
            <Ionicons name="logo-whatsapp" size={20} color="#fff" />
            <Text style={styles.waBtnText}>Enviar sugestões e melhorias</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>versão 1.0</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.text,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  logoWrap: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 24,
    overflow: 'hidden',
  },
  appName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.text,
    marginTop: 14,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: Colors.text,
  },
  cardText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  devAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devAvatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  devName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: Colors.text,
  },
  pixBox: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pixLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  pixKey: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.text,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  copyBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#fff',
  },
  thankYou: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: Colors.text,
    textAlign: 'center',
    paddingTop: 4,
  },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 14,
  },
  waBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#fff',
  },
  version: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingBottom: 8,
  },
});
