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
          placeholderTextColor="#64748b" // slate-500
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
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!isPasswordVisible}
          />
          <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeButton}>
            <Text style={styles.eyeText}>{isPasswordVisible ? 'Ocultar' : 'Ver'}</Text>
          </TouchableOpacity>
        </View>

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
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#0f172a' // slate-950 (Fundo principal)
  },

  card: { 
    width: '100%', 
    maxWidth: 400, 
    backgroundColor: '#1e293b', // slate-800 (Fundo do card)
    borderRadius: 12, 
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155' // slate-700 (Borda sutil)
  },

  title: { 
    fontSize: 26, 
    fontWeight: 'bold', 
    color: '#f8fafc', // slate-50
    marginBottom: 20, 
    textAlign: 'center' 
  },

  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#94a3b8', // slate-400
    marginBottom: 6, 
    marginTop: 10 
  },

  input: { 
    height: 50, 
    borderColor: '#334155', 
    borderWidth: 1, 
    borderRadius: 8, 
    paddingHorizontal: 15, 
    marginBottom: 10, 
    fontSize: 16, 
    backgroundColor: '#0f172a', // Input levemente mais escuro que o card
    color: '#f1f5f9' 
  },

  passwordContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderColor: '#334155', 
    borderWidth: 1, 
    borderRadius: 8, 
    backgroundColor: '#0f172a'
  },

  inputPassword: { 
    flex: 1, 
    height: 50, 
    paddingHorizontal: 15, 
    fontSize: 16,
    color: '#f1f5f9'
  },

  eyeButton: { 
    padding: 10,
    minWidth: 60
  },

  eyeText: { 
    color: '#3b82f6', // azul brilhante para destaque
    fontWeight: '700' 
  },

  button: { 
    backgroundColor: '#2563eb', // azul consistente com o SaveBtn
    paddingVertical: 15, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 25,
    width: '100%'
  },

  buttonDisabled: { 
    backgroundColor: '#1d4ed8',
    opacity: 0.6
  },

  buttonText: { 
    color: '#FFFFFF', 
    fontSize: 18, 
    fontWeight: 'bold',
    textAlign: 'center'
  },

  registerButton: { 
    marginTop: 20, 
    padding: 5, 
    alignItems: 'center' 
  },

  linkText: { 
    color: '#94a3b8', 
    fontSize: 14 
  },

  linkHighlight: { 
    color: '#3b82f6', 
    fontWeight: 'bold' 
  }
});

export default LoginScreen;