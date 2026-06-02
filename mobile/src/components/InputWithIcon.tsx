import React from 'react';
import { StyleSheet, Text, View, TextInput, TextInputProps } from 'react-native';

interface MobileInputProps extends TextInputProps {
  icon?: any;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export const InputWithIcon: React.FC<MobileInputProps> = ({
  icon: Icon,
  label,
  error,
  disabled,
  style,
  ...props
}) => {
  const hasIcon = !!Icon;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        {Icon && (
          <View style={styles.iconWrapper}>
            <Icon size={16} color={error ? '#ef4444' : '#94a3b8'} />
          </View>
        )}
        <TextInput
          placeholderTextColor="#64748b"
          editable={!disabled}
          style={[
            styles.input,
            { paddingLeft: hasIcon ? 44 : 14 },
            error ? styles.inputError : null,
            disabled ? styles.inputDisabled : null,
            style,
          ]}
          {...props}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
    width: '100%',
  },
  iconWrapper: {
    position: 'absolute',
    left: 14,
    zIndex: 10,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 14,
    paddingRight: 14,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
});
