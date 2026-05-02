import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Colors } from "@/constants/colors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="menu">
        <Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
        <Label>Menu</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "checkmark.circle", selected: "checkmark.circle.fill" }} />
        <Label>Chamada</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="diary">
        <Icon sf={{ default: "calendar", selected: "calendar.badge.checkmark" }} />
        <Label>Diário</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="activities">
        <Icon sf={{ default: "book", selected: "book.fill" }} />
        <Label>Atividades</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="planning">
        <Icon sf={{ default: "calendar.badge.plus", selected: "calendar.badge.plus" }} />
        <Label>Planejamento</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : Colors.surface,
          borderTopWidth: isWeb ? 1 : 0.5,
          borderTopColor: Colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="square.grid.2x2.fill" tintColor={color} size={24} />
            ) : (
              <Ionicons name="grid-outline" size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Chamada",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="checkmark.circle.fill" tintColor={color} size={24} />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: "Diário",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="calendar" tintColor={color} size={24} />
            ) : (
              <Feather name="calendar" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: "Atividades",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="book.fill" tintColor={color} size={24} />
            ) : (
              <Feather name="book-open" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: "Planejamento",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="calendar.badge.plus" tintColor={color} size={24} />
            ) : (
              <Ionicons name="calendar-outline" size={22} color={color} />
            ),
        }}
      />
      {/* Hidden tabs — accessible via navigation but not shown in tab bar */}
      <Tabs.Screen
        name="reports"
        options={{
          href: null,
          title: "Relatórios",
        }}
      />
      <Tabs.Screen
        name="provas"
        options={{
          href: null,
          title: "Provas",
        }}
      />
      <Tabs.Screen
        name="sobre"
        options={{
          href: null,
          title: "Sobre",
        }}
      />
      <Tabs.Screen
        name="relatorio-bimestral"
        options={{
          href: null,
          title: "Rel. Bimestral",
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
