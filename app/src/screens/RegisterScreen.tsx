import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
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
        'A senha deve ter no mínimo 8 caracteres, incluindo letras, números e pelo menos um caractere especial.'
      );
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    setLoading(false);

    if (error) {
      Alert.alert('Erro no Cadastro', error.message);
      return;
    }

    if (data.user) {
      Alert.alert('Sucesso', 'Conta criada com sucesso.');
      onRegistrationSuccess(email);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1, width: '100%' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>Crie sua Conta</Text>

            <Text style={styles.label}>Nome Completo</Text>
            <TextInput
              style={styles.input}
              placeholder="Seu nome"
              placeholderTextColor="#64748b"
              value={formData.name}
              onChangeText={v => handleChange('name', v)}
            />

            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="seuemail@exemplo.com"
              placeholderTextColor="#64748b"
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
                placeholderTextColor="#64748b"
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

            <Text style={styles.passwordHint}>
              Deve conter letras, números e caracteres especiais.
            </Text>

            <Text style={styles.label}>Confirmar Senha</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.inputPassword}
                placeholder="Repita a senha"
                placeholderTextColor="#64748b"
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
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Cadastrar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} onPress={onNavigateToLogin}>
              <Text style={styles.linkText}>
                Já tem uma conta? <Text style={styles.linkHighlight}>Faça Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },

  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },

  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155'
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 20,
    textAlign: 'center'
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
    marginTop: 10
  },

  input: {
    height: 50,
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#0f172a',
    color: '#f1f5f9'
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    marginTop: 4
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
    minWidth: 50
  },

  eyeText: {
    color: '#3b82f6',
    fontWeight: '700'
  },

  passwordHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 10
  },

  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
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

  linkButton: {
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

export default RegisterScreen;