import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import type { DecodedJWT, JWTHeader, JWTPayload } from '../types';
import {
  BG_WHITE,
  BORDER,
  BG_MAIN,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  BG_SUBTLE,
  PRIMARY,
  BG_DARK,
  TEXT_CODE,
  DANGER,
} from '@/constants/colors';

interface TokenDisplayProps {
  token: string | null;
  title?: string;
}

// Decode JWT token parts
const decodeToken = (token: string): DecodedJWT | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const decodeBase64 = (str: string): string => {
      return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    };

    const header: JWTHeader = JSON.parse(decodeBase64(parts[0]));
    const payload: JWTPayload = JSON.parse(decodeBase64(parts[1]));

    return { header, payload, raw: token };
  } catch {
    return null;
  }
};

export const TokenDisplay: React.FC<TokenDisplayProps> = ({
  token,
  title = 'JWT Token',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'header' | 'payload' | 'raw'>('payload');

  const decoded = useMemo(() => {
    if (!token) return null;
    return decodeToken(token);
  }, [token]);

  if (!token) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.noToken}>No token available</Text>
      </View>
    );
  }

  const formatJSON = (obj: object): string => {
    return JSON.stringify(obj, null, 2);
  };

  const renderContent = () => {
    if (!decoded) {
      return <Text style={styles.errorText}>Invalid token format</Text>;
    }

    switch (activeTab) {
      case 'header':
        return (
          <ScrollView style={styles.scrollContent} horizontal>
            <Text style={styles.jsonText}>{formatJSON(decoded.header)}</Text>
          </ScrollView>
        );
      case 'payload':
        return (
          <ScrollView style={styles.scrollContent} horizontal>
            <Text style={styles.jsonText}>{formatJSON(decoded.payload)}</Text>
          </ScrollView>
        );
      case 'raw':
        return (
          <ScrollView style={styles.scrollContent}>
            <Text style={styles.rawText} selectable>
              {decoded.raw}
            </Text>
          </ScrollView>
        );
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.header, pressed && { opacity: 0.7 }]}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
      </Pressable>

      {isExpanded && (
        <View style={styles.content}>
          <View style={styles.tabs}>
            <Pressable
              style={({ pressed }) => [
                styles.tab,
                activeTab === 'header' && styles.activeTab,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => setActiveTab('header')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'header' && styles.activeTabText,
                ]}
              >
                Header
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.tab,
                activeTab === 'payload' && styles.activeTab,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => setActiveTab('payload')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'payload' && styles.activeTabText,
                ]}
              >
                Payload
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.tab,
                activeTab === 'raw' && styles.activeTab,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => setActiveTab('raw')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'raw' && styles.activeTabText,
                ]}
              >
                Raw
              </Text>
            </Pressable>
          </View>

          <View style={styles.contentBody}>{renderContent()}</View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: BG_WHITE,
    borderRadius: 8,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: BG_MAIN,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  expandIcon: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  noToken: {
    padding: 12,
    color: TEXT_TERTIARY,
    fontStyle: 'italic',
  },
  content: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: BG_SUBTLE,
  },
  activeTab: {
    backgroundColor: BG_WHITE,
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY,
  },
  tabText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  activeTabText: {
    color: PRIMARY,
    fontWeight: '600',
  },
  contentBody: {
    maxHeight: 200,
    backgroundColor: BG_DARK,
  },
  scrollContent: {
    padding: 12,
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: TEXT_CODE,
    lineHeight: 18,
  },
  rawText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: TEXT_CODE,
    lineHeight: 14,
  },
  errorText: {
    padding: 12,
    color: DANGER,
  },
});
