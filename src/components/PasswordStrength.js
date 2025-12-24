import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Password strength calculator
const calculateStrength = (password) => {
  if (!password) return { level: 0, label: '', color: '#ccc' };
  
  let score = 0;
  
  // Length checks
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character type checks
  if (/[a-z]/.test(password)) score += 1; // lowercase
  if (/[A-Z]/.test(password)) score += 1; // uppercase
  if (/[0-9]/.test(password)) score += 1; // numbers
  if (/[^a-zA-Z0-9]/.test(password)) score += 1; // special chars
  
  // Determine strength level
  if (score <= 2) {
    return { level: 1, label: 'Weak', color: '#FF3B30' };
  } else if (score <= 4) {
    return { level: 2, label: 'Fair', color: '#FF9500' };
  } else if (score <= 5) {
    return { level: 3, label: 'Good', color: '#34C759' };
  } else {
    return { level: 4, label: 'Strong', color: '#007AFF' };
  }
};

export default function PasswordStrength({ password, colors }) {
  const strength = calculateStrength(password);
  
  if (!password || password.length === 0) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.barsContainer}>
        {[1, 2, 3, 4].map((level) => (
          <View
            key={level}
            style={[
              styles.bar,
              {
                backgroundColor: level <= strength.level ? strength.color : (colors?.border || '#E5E5EA'),
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color: strength.color }]}>
        {strength.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  barsContainer: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 12,
    minWidth: 50,
  },
});

