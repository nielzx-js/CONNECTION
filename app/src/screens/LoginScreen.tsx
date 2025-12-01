import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { supabase } from '../config/supabase';

interface LoginScreenProps {
  onNavigateToRegister: () => void;

  onNavigateToForgotPassword: () => void; 
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister, onNavigateToForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Erro no Login', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Login</Text>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          placeholder="seuemail@exemplo.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Senha</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Sua senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!isPasswordVisible}
          />
          <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeButton}>
            <Text style={styles.eyeText}>{isPasswordVisible ? 'Ocultar' : 'Ver'}</Text>
          </TouchableOpacity>
        </View>

     
        <TouchableOpacity style={styles.forgotPasswordButton} onPress={onNavigateToForgotPassword}>
          <Text style={styles.linkText}>Esqueceu sua senha?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Entrar</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.registerButton} onPress={onNavigateToRegister}>
          <Text style={styles.linkText}>
            Não tem uma conta? <Text style={styles.linkHighlight}>Cadastre-se</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: '#F3F4F6' },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 4, marginTop: 10 },
  input: { height: 50, borderColor: '#D1D5DB', borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, marginBottom: 10, fontSize: 16, backgroundColor: '#F9FAFB' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderColor: '#D1D5DB', borderWidth: 1, borderRadius: 8, backgroundColor: '#F9FAFB' },
  inputPassword: { flex: 1, height: 50, paddingHorizontal: 15, fontSize: 16, borderRightWidth: 0, borderWidth: 0 },
  eyeButton: { padding: 10 },
  eyeText: { color: '#059669', fontWeight: '600' },
  forgotPasswordButton: { alignSelf: 'flex-end', paddingVertical: 5, marginBottom: 10 },
  button: { backgroundColor: '#059669', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonDisabled: { backgroundColor: '#A7F3D0' },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  registerButton: { marginTop: 20, padding: 5, alignItems: 'center' },
  linkText: { color: '#6B7280', fontSize: 14 },
  linkHighlight: { color: '#059669', fontWeight: 'bold' }
});

export default LoginScreen;