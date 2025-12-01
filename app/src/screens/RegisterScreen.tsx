import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { supabase } from '../config/supabase';

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface RegisterScreenProps {
  onRegistrationSuccess: (email: string) => void;
  onNavigateToLogin: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegistrationSuccess, onNavigateToLogin }) => {
  const [formData, setFormData] = React.useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = React.useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = React.useState(false);

  const handleChange = (name: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validatePassword = (password: string) => {
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    return passwordRegex.test(password);
  };

  const handleRegistration = async () => {
    const { name, email, password, confirmPassword } = formData;

    if (!name || !email || !password) {
      Alert.alert('Erro', 'Por favor, preencha nome, e-mail e senha.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert(
        'Senha Fraca',
        'A senha deve ter no mínimo 8 caracteres, incluindo letras, números e pelo menos um caractere especial (ex: !@#$%).'
      );
      return;
    }

    setLoading(true);


    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: name, 
        },
      },
    });

    if (authError) {
      setLoading(false);
      Alert.alert('Erro no Cadastro', authError.message);
      return;
    }


    setLoading(false);

    if (authData.user) {
      Alert.alert('Quase lá!', 'Enviamos um link de verificação para o seu e-mail.');
      onRegistrationSuccess(email);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Crie sua Conta</Text>

        <Text style={styles.label}>Nome Completo</Text>
        <TextInput
          style={styles.input}
          placeholder="Seu nome"
          value={formData.name}
          onChangeText={v => handleChange('name', v)}
        />

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          placeholder="seuemail@exemplo.com"
          value={formData.email}
          onChangeText={v => handleChange('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Senha</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Mínimo 8 caracteres"
            value={formData.password}
            onChangeText={v => handleChange('password', v)}
            secureTextEntry={!isPasswordVisible}
          />
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeButton}
          >
            <Text style={styles.eyeText}>{isPasswordVisible ? 'Ocultar' : 'Ver'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.passwordHint}>Deve conter letras, números e caracteres especiais.</Text>

        <Text style={styles.label}>Confirmar Senha</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Repita a senha"
            value={formData.confirmPassword}
            onChangeText={v => handleChange('confirmPassword', v)}
            secureTextEntry={!isConfirmPasswordVisible}
          />
          <TouchableOpacity
            onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
            style={styles.eyeButton}
          >
            <Text style={styles.eyeText}>{isConfirmPasswordVisible ? 'Ocultar' : 'Ver'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegistration}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Cadastrar</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={onNavigateToLogin}>
          <Text style={styles.linkText}>
            Já tem uma conta? <Text style={styles.linkHighlight}>Faça Login</Text>
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
  input: { height: 50, borderColor: '#D1D5DB', borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, fontSize: 16, backgroundColor: '#F9FAFB' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderColor: '#D1D5DB', borderWidth: 1, borderRadius: 8, backgroundColor: '#F9FAFB', marginTop: 4 },
  inputPassword: { flex: 1, height: 50, paddingHorizontal: 15, fontSize: 16, borderRightWidth: 0, borderWidth: 0 },
  eyeButton: { padding: 10 },
  eyeText: { color: '#059669', fontWeight: '600' },
  passwordHint: { fontSize: 12, color: '#6B7280', marginTop: 4, marginBottom: 10 },
  button: { backgroundColor: '#059669', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  buttonDisabled: { backgroundColor: '#A7F3D0' },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  linkButton: { marginTop: 20, padding: 5, alignItems: 'center' },
  linkText: { color: '#6B7280', fontSize: 14 },
  linkHighlight: { color: '#059669', fontWeight: 'bold' }
});

export default RegisterScreen;