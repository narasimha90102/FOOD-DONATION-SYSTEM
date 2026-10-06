import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';

import { Eye, EyeOff } from 'lucide-react-native';

interface PasswordInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({ label, error, style, ...props }) => {
  const [isSecure, setIsSecure] = useState(true);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, error ? styles.inputError : null, style]}
          placeholderTextColor="#64748B"
          secureTextEntry={isSecure}
          {...props}
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setIsSecure(!isSecure)}
          activeOpacity={0.7}
        >
          {isSecure ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#10B981" />}
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  label: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingRight: 40, 
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    padding: 4,
  },
  eyeText: {
    fontSize: 16,
    color: '#CBD5E1',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
});
