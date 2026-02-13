import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import {
  BG_MAIN,
  PRIMARY,
  SHADOW,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  TEXT_WHITE,
} from '@/constants/colors';

export const SignInScreen: React.FC = () => {
  const { login, isLoading } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>MPC</Text>
          </View>
          <Text style={styles.title}>MPC Mobile</Text>
          <Text style={styles.subtitle}>OAuth 2.0 PKCE Demo</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.description}>
            Sign in with your Keycloak SSO account to access the application.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              isLoading && styles.buttonDisabled,
              pressed && { opacity: 0.7 },
            ]}
            onPress={login}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={TEXT_WHITE} />
            ) : (
              <Text style={styles.buttonText}>Sign In with SSO</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Secure authentication powered by Keycloak
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_MAIN,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: TEXT_WHITE,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: TEXT_SECONDARY,
  },
  formContainer: {
    paddingHorizontal: 16,
  },
  description: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: TEXT_WHITE,
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  footerText: {
    fontSize: 12,
    color: TEXT_TERTIARY,
  },
});
