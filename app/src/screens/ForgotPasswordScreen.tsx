import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { supabase } from '../config/supabase';

interface ForgotPasswordScreenProps {
  onNavigateBack: () => void;
  onSendRecoveryCodeSuccess: (email: string) => void; 
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onNavigateBack, onSendRecoveryCodeSuccess }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendRecoveryCode = async () => {
    if (!email) {
      Alert.alert('Erro', 'Por favor, insira seu e-mail.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {});

    setLoading(false);

    if (error) {
      Alert.alert('Erro ao Enviar', error.message);
    } else {
      Alert.alert(
        'Código Enviado',
        `Uma solicitação de redefinição de senha foi enviada para ${email}. Verifique seu e-mail para o código de 6 dígitos ou link.`,
        [{ text: 'OK', onPress: () => onSendRecoveryCodeSuccess(email) }] 
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Recuperar Senha</Text>
        <Text style={styles.subtitle}>
          Insira seu e-mail para receber um código de 6 dígitos.
        </Text>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          placeholder="seuemail@exemplo.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleSendRecoveryCode}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Enviar Código</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={onNavigateBack}>
          <Text style={styles.linkTextBack}>Voltar ao Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: '#F3F4F6' },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 4, marginTop: 10 },
  input: { height: 50, borderColor: '#D1D5DB', borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, marginBottom: 10, fontSize: 16, backgroundColor: '#F9FAFB' },
  button: { backgroundColor: '#059669', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  buttonDisabled: { backgroundColor: '#A7F3D0' },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  backButton: { marginTop: 20, alignItems: 'center' },
  linkTextBack: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
});

export default ForgotPasswordScreen;
