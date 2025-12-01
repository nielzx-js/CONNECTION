import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { supabase } from '../config/supabase';

interface VerifyOTPScreenProps {
  email: string;
  otpType: 'signup' | 'recovery';
  onPasswordResetSuccess: () => void;
}

const VerifyOTPScreen: React.FC<VerifyOTPScreenProps> = ({ email, otpType, onPasswordResetSuccess }) => {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const titleText = otpType === 'recovery' ? 'Redefinir Senha' : 'Verifique seu E-mail';
  const buttonText = otpType === 'recovery' ? 'Redefinir Senha' : 'Verificar e Entrar';

  const handleVerification = async () => {
    if (!token || token.length < 6) {
      Alert.alert('Erro', 'Por favor, insira o código de 6 dígitos.');
      return;
    }
    
    if (otpType === 'recovery' && (!newPassword || newPassword.length < 6)) {
        Alert.alert('Erro', 'A nova senha deve ter pelo menos 6 caracteres.');
        return;
    }

    setLoading(true);

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email,
      token: token,
      type: otpType,
    });

    if (verifyError) {
      setLoading(false);
      Alert.alert('Erro de Verificação', verifyError.message);
      return;
    }

    if (otpType === 'recovery' && data.user) {
        const { error: updateError } = await supabase.auth.updateUser({ 
            password: newPassword 
        });

        setLoading(false);

        if (updateError) {
            Alert.alert('Erro ao Redefinir Senha', updateError.message);
            return;
        }

        Alert.alert('Sucesso!', 'Sua senha foi redefinida com sucesso. Faça login agora.', 
            [{ text: 'OK', onPress: onPasswordResetSuccess }]
        );
        return;
    }

    setLoading(false);
    
    if (otpType === 'signup') {
        Alert.alert('Sucesso!', 'Seu e-mail foi verificado com sucesso. Você será logado agora.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{titleText}</Text>
        <Text style={styles.subtitle}>
          {
            otpType === 'recovery'
            ? 'Digite o código de 6 dígitos enviado para seu e-mail e sua nova senha.'
            : `Enviamos um código de 6 dígitos para ${email}.`
          }
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
          textAlign="center"
        />
        
        {otpType === 'recovery' && (
            <>
                <Text style={styles.label}>Nova Senha</Text>
                <View style={styles.passwordContainer}>
                    <TextInput
                        style={styles.inputPassword}
                        placeholder="Mínimo 6 caracteres"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!isPasswordVisible}
                        autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeButton}>
                        <Text style={styles.eyeText}>{isPasswordVisible ? 'Ocultar' : 'Ver'}</Text>
                    </TouchableOpacity>
                </View>
            </>
        )}

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleVerification} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{buttonText}</Text>}
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
    label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 4, marginTop: 10 },
    input: { 
        height: 50, 
        borderColor: '#D1D5DB', 
        borderWidth: 1, 
        borderRadius: 8, 
        paddingHorizontal: 15, 
        marginBottom: 20, 
        fontSize: 18, 
        textAlign: 'center', 
        letterSpacing: 8,
        backgroundColor: '#F9FAFB' 
    },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', borderColor: '#D1D5DB', borderWidth: 1, borderRadius: 8, backgroundColor: '#F9FAFB', marginBottom: 20 },
    inputPassword: { flex: 1, height: 50, paddingHorizontal: 15, fontSize: 16, borderRightWidth: 0, borderWidth: 0 },
    eyeButton: { padding: 10 },
    eyeText: { color: '#059669', fontWeight: '600' },
    button: { backgroundColor: '#059669', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
    buttonDisabled: { backgroundColor: '#A7F3D0' },
    buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});

export default VerifyOTPScreen;
