import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/colors';
import { WELCOME_SEEN_KEY } from './bem-vinda';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const [welcomeChecked, setWelcomeChecked] = useState(false);
  const [welcomeSeen, setWelcomeSeen] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      AsyncStorage.getItem(WELCOME_SEEN_KEY).then((val) => {
        setWelcomeSeen(val === 'true');
        setWelcomeChecked(true);
      });
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading || (isAuthenticated && !welcomeChecked)) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isAuthenticated) {
    if (!welcomeSeen) {
      return <Redirect href="/bem-vinda" />;
    }
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
