import { Link, Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HarborPalette } from '../src/theme/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'HarborDose' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Let’s guide you back to Harbor.</Text>
        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>Return to Today’s Schedule</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: HarborPalette.backgroundPrimary,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: HarborPalette.textPrimary,
    textAlign: 'center',
  },
  link: {
    marginTop: 18,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: HarborPalette.accentPrimary,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '700',
    color: HarborPalette.white,
  },
});
