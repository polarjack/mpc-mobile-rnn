import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CountdownTimerProps {
  label: string;
  expiresAt: Date | null;
  warningThreshold?: number; // seconds
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  label,
  expiresAt,
  warningThreshold = 120,
}) => {
  const [timeLeft, setTimeLeft] = useState<string>('--:--:--');
  const [isWarning, setIsWarning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('--:--:--');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        setIsWarning(false);
        return;
      }

      setIsExpired(false);
      setIsWarning(diff / 1000 <= warningThreshold);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, warningThreshold]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[
          styles.timer,
          isWarning && styles.warning,
          isExpired && styles.expired,
        ]}
      >
        {timeLeft}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 4,
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  timer: {
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  warning: {
    color: '#f57c00',
  },
  expired: {
    color: '#d32f2f',
  },
});
