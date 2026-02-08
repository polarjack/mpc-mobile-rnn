import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import type { DecodedJWT, JWTHeader, JWTPayload } from '../types';

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
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  expandIcon: {
    fontSize: 12,
    color: '#666',
  },
  noToken: {
    padding: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  content: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  activeTab: {
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#1976d2',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#1976d2',
    fontWeight: '600',
  },
  contentBody: {
    maxHeight: 200,
    backgroundColor: '#1e1e1e',
  },
  scrollContent: {
    padding: 12,
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#d4d4d4',
    lineHeight: 18,
  },
  rawText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#d4d4d4',
    lineHeight: 14,
  },
  errorText: {
    padding: 12,
    color: '#f44336',
  },
});
