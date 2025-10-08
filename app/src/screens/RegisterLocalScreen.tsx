// src/screens/RegisterLocalScreen.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert } from 'react-native';
// Ajuste o caminho conforme sua estrutura
import { supabase } from '../config/supabase'; 

interface RegisterLocalProps {
  // Propriedade de navegação para voltar
  navigation: any; 
}

export default function RegisterLocalScreen({ navigation }: RegisterLocalProps) {
  const [nomeLocal, setNomeLocal] = useState('');
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);

  // Função de exemplo para salvar o local
  const handleRegisterLocal = async () => {
    if (!nomeLocal.trim() || !cep.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o Nome do Local e o CEP.');
      return;
    }
    
    setLoading(true);

    try {
      // 1. Obter o ID do usuário logado
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
        return;
      }
      
      // 2. Inserir na tabela 'locais_cadastrados'
      const { error } = await supabase
        .from('locais_cadastrados')
        .insert({
          user_id: user.id, // RLS exige o user_id
          nome_local: nomeLocal,
          cep: cep,
        });

      if (error) {
        throw error;
      }

      Alert.alert('Sucesso', 'Local cadastrado com sucesso!');
      navigation.goBack(); // Volta para a tela anterior (Início)

    } catch (error: any) {
      console.error("Erro ao cadastrar local:", error.message);
      Alert.alert('Erro', 'Falha ao cadastrar local. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <ScrollView style={styles.container}>
      {/* Header com botão de voltar */}
      <View style={styles.header}>
        <Text style={styles.backButton} onPress={() => navigation.goBack()}>← Voltar para o Início</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📍</Text>
        </View>
        <Text style={styles.title}>Cadastrar Local</Text>
        <Text style={styles.subtitle}>Adicione um novo ponto de interesse no mapa.</Text>

        <Text style={styles.label}>Nome do Local</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Matriz, Cliente A, Projeto B"
          value={nomeLocal}
          onChangeText={setNomeLocal}
        />

        <Text style={styles.label}>CEP</Text>
        <TextInput
          style={styles.input}
          placeholder="00000-000"
          keyboardType="numeric"
          maxLength={9}
          value={cep}
          onChangeText={setCep}
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleRegisterLocal}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Salvando...' : 'Cadastrar Local'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Para usar TouchableOpacity para o botão, precisamos importar:
import { TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  backButton: {
    fontSize: 16,
    color: '#64748b',
  },
  card: {
    backgroundColor: '#ffffff',
    margin: 20,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    alignSelf: 'flex-start',
    marginTop: 15,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: 15,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  button: {
    width: '100%',
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});