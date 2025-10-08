import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { supabase } from '../config/supabase';

interface VerifyOTPScreenProps {
  email: string;
}

const VerifyOTPScreen: React.FC<VerifyOTPScreenProps> = ({ email }) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerification = async () => {
    if (!token || token.length < 6) {
      Alert.alert('Erro', 'Por favor, insira o código de 6 dígitos.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email,
      token: token,
      type: 'signup',
    });

    setLoading(false);

    if (error) {
      Alert.alert('Erro de Verificação', error.message);
    }
    // Se a verificação for bem-sucedida, o listener no App.tsx
    // detectará a nova sessão e navegará para a HomeScreen automaticamente.
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Verifique seu E-mail</Text>
        <Text style={styles.subtitle}>
          Enviamos um código de 6 dígitos para <Text style={styles.emailText}>{email}</Text>.
        </Text>

        <Text style={styles.label}>Código de Verificação</Text>
        <TextInput
          style={styles.input}
          placeholder="______"
          value={token}
          onChangeText={setToken}
          keyboardType="number-pad"
          maxLength={6}
          autoCapitalize="none"
        />

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleVerification} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Verificar e Entrar</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: '#F3F4F6' },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 24 },
  emailText: { fontWeight: 'bold', color: '#333' },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 4, marginTop: 10 },
  input: { height: 50, borderColor: '#D1D5DB', borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, marginBottom: 20, fontSize: 18, textAlign: 'center', letterSpacing: 8 },
  button: { backgroundColor: '#059669', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  buttonDisabled: { backgroundColor: '#A7F3D0' },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});

export default VerifyOTPScreen;