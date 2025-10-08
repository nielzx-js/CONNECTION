import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, Alert, ActivityIndicator,
  TouchableOpacity, Image, Platform, Switch
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../config/supabase';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// -----------------------------
// Tipagens
// -----------------------------
interface UserProfile {
  full_name: string;
  email: string;
  avatar_url: string;
  cpf: string;
  data_nascimento: string;
  cidade_residencia: string;
  cidade_trabalho: string;
  linkedin: string;
  empresa: string;
  cargo: string;
  tempo_empresa: string;
  superior_instituicao: string;
  superior_matricula: string;
  tecnico_instituicao: string;
  tecnico_matricula: string;
}

const REQUIRED_FIELDS: (keyof UserProfile)[] = [
  'cpf', 'data_nascimento', 'cidade_residencia', 'empresa', 'cargo'
];

// -----------------------------
// Utilitários: máscara e validação
// -----------------------------
const maskCPF = (value: string): string => {
  value = value.replace(/\D/g, '');
  value = value.replace(/^(\d{3})(\d)/, '$1.$2');
  value = value.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
  value = value.replace(/\.(\d{3})(\d)/, '.$1-$2');
  return value.substring(0, 14); // Garante o tamanho máximo
};

const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) return false;
  // Algoritmo de validação de CPF (opcional, mas recomendado)
  let sum = 0;
  let remainder;
  for (let i = 1; i <= 9; i++) sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
  return true;
};

// -----------------------------
// Componente
// -----------------------------
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDataComplete, setIsDataComplete] = useState(true);

  // DatePicker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(new Date());

  // Notificações
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailUpdatesEnabled, setEmailUpdatesEnabled] = useState(true);

  const checkDataCompleteness = useCallback((currentProfile: Partial<UserProfile>) => {
    return REQUIRED_FIELDS.every(field =>
      currentProfile[field] && String(currentProfile[field]).trim() !== ''
    );
  }, []);

  const handleChange = (key: keyof UserProfile, value: string) => {
    const finalValue = key === 'cpf' ? maskCPF(value) : value;
    setProfile(prev => {
      const newProfile = { ...prev, [key]: finalValue };
      setIsDataComplete(checkDataCompleteness(newProfile));
      return newProfile;
    });
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado.");

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && (error as any).code !== 'PGRST116') throw error;

      const initialProfile = {
        email: user.email || '',
        full_name: data?.full_name || user.user_metadata?.full_name || '',
        avatar_url: data?.avatar_url || '',
        ...(data || {})
      } as Partial<UserProfile>;

      if (initialProfile.cpf) initialProfile.cpf = maskCPF(String(initialProfile.cpf));

      if (initialProfile.data_nascimento) {
        const parts = String(initialProfile.data_nascimento).split('/');
        if (parts.length === 3) {
          const parsed = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          if (!isNaN(parsed.getTime())) setDate(parsed);
        }
      }

      setProfile(initialProfile);
      setIsDataComplete(checkDataCompleteness(initialProfile));

    } catch (err: any) {
      console.error('Erro ao carregar perfil:', err?.message || err);
      Alert.alert('Erro', 'Falha ao carregar dados do perfil.');
    } finally {
      setLoading(false);
    }
  };

  // Upload de imagem (compatível com Expo) - FUNÇÃO CORRIGIDA
  const handleImageUpload = async () => {
    setSaving(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Precisamos de acesso à sua galeria para alterar a foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return; // Usuário cancelou a seleção
      }

      const image = result.assets[0];
      const localUri = image.uri;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const formData = new FormData();
      const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${Date.now()}.${ext}`;
      const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

      formData.append('file', {
        uri: localUri,
        name: fileName,
        type: mimeType,
      } as any);
      
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, formData, {
          upsert: true,
        });

      if (uploadError) throw uploadError;
      
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;

      if (!publicUrl) {
          throw new Error("Não foi possível obter a URL pública da imagem.");
      }

      const { error: dbError } = await supabase.from('usuarios').update({ avatar_url: publicUrl }).eq('id', user.id);
      if (dbError) throw dbError;

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      Alert.alert('Sucesso', 'Foto de perfil atualizada!');

    } catch (err: any) {
      console.error('Erro no upload de imagem:', err);
      Alert.alert('Erro de Upload', `Falha ao enviar imagem: ${err.message || 'Tente novamente.'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const rawCPF = profile.cpf ? String(profile.cpf).replace(/[^\d]/g, '') : '';
      if (rawCPF && !validateCPF(profile.cpf || '')) {
        Alert.alert('Erro', 'CPF inválido.');
        setSaving(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const toSave = { ...profile, cpf: rawCPF };
      delete (toSave as any).email; 
      delete (toSave as any).avatar_url; 
      delete (toSave as any).full_name;

      const { error } = await supabase.from('usuarios').update(toSave).eq('id', user.id);
      if (error) throw error;

      setIsDataComplete(checkDataCompleteness(profile));
      Alert.alert('Sucesso', 'Alterações salvas.');

    } catch (err: any) {
      console.error('Erro ao salvar:', err?.message || err);
      Alert.alert('Erro', 'Falha ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Navegação para a tela de login deve ser implementada aqui
    } catch (err: any) {
      Alert.alert('Erro', `Falha ao sair: ${err?.message || ''}`);
    }
  };

  const onDateChange = (event: any, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) {
      const current = selected;
      setDate(current);
      const formatted = `${current.getDate().toString().padStart(2, '0')}/${(current.getMonth() + 1).toString().padStart(2, '0')}/${current.getFullYear()}`;
      handleChange('data_nascimento', formatted);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  if (loading) return (
    <View style={[styles.container, styles.loadingContainer]}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={{ marginTop: 10 }}>Carregando configurações...</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
      {/* O resto do seu JSX permanece o mesmo */}
      <View style={styles.header}>
        <View style={styles.topBar}>
          <Text style={styles.title}>Configurações</Text>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sair</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Personalize sua experiência na plataforma</Text>
      </View>

      <View style={styles.profileCard}>
        <TouchableOpacity style={styles.avatarContainer} onPress={handleImageUpload} disabled={saving}>
          {saving ? (
            <ActivityIndicator style={styles.avatar} color="#2563eb" />
          ) : profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(profile.full_name || 'U').charAt(0)}</Text>
            </View>
          )}
          {!saving && (
            <View style={styles.cameraIcon}>
              <Feather name="camera" size={16} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.displayName}>{profile.full_name || 'Nome Não Definido'}</Text>
        <Text style={styles.email}>{profile.email || 'N/A'}</Text>

        {!isDataComplete ? (
          <View style={styles.alertBox}>
            <Feather name="alert-triangle" size={16} color="#ef4444" />
            <Text style={styles.alertText}>INCOMPLETO: Preencha os campos obrigatórios.</Text>
          </View>
        ) : (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✅ Conta Verificada</Text>
          </View>
        )}
      </View>
      
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>💼 Perfil Profissional e Pessoal</Text>

        <Text style={styles.label}>CPF <Text style={styles.required}>*</Text></Text>
        <TextInput style={styles.input} placeholder="000.000.000-00"
          value={profile.cpf} onChangeText={(t) => handleChange('cpf', t)} keyboardType="numeric" maxLength={14} />
        {profile.cpf && profile.cpf.replace(/[^\d]/g, '').length > 0 && !validateCPF(profile.cpf || '') && (
          <Text style={styles.validationError}>CPF inválido ou incompleto.</Text>
        )}

        <Text style={styles.label}>Data de Nascimento <Text style={styles.required}>*</Text></Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.inputContainer}>
          <TextInput style={[styles.input, { paddingRight: 40, color: '#0f172a' }]} placeholder="dd/mm/aaaa" value={profile.data_nascimento} editable={false} />
          <Feather name="calendar" size={20} color="#64748b" style={styles.calendarIcon} />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} maximumDate={new Date()} />
        )}

        <Text style={styles.label}>Empresa <Text style={styles.required}>*</Text></Text>
        <TextInput style={styles.input} placeholder="Nome da Empresa" value={profile.empresa} onChangeText={(t) => handleChange('empresa', t)} />

        <Text style={styles.label}>Cargo <Text style={styles.required}>*</Text></Text>
        <TextInput style={styles.input} placeholder="Seu Cargo" value={profile.cargo} onChangeText={(t) => handleChange('cargo', t)} />

        <Text style={styles.label}>Tempo de Empresa</Text>
        <TextInput style={styles.input} placeholder="Ex: 2 anos e 6 meses" value={profile.tempo_empresa} onChangeText={(t) => handleChange('tempo_empresa', t)} />

        <Text style={styles.label}>Cidade de Residência <Text style={styles.required}>*</Text></Text>
        <TextInput style={styles.input} placeholder="Sua cidade" value={profile.cidade_residencia} onChangeText={(t) => handleChange('cidade_residencia', t)} />

        <Text style={styles.label}>Cidade de Trabalho</Text>
        <TextInput style={styles.input} placeholder="Cidade onde trabalha" value={profile.cidade_trabalho} onChangeText={(t) => handleChange('cidade_trabalho', t)} />

        <Text style={styles.label}>LinkedIn</Text>
        <TextInput style={styles.input} placeholder="URL do seu perfil no LinkedIn" value={profile.linkedin} onChangeText={(t) => handleChange('linkedin', t)} autoCapitalize="none" />
      </View>
      
      {/* ... O resto do JSX continua aqui ... */}
       <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? <ActivityIndicator color="#fff" /> : '💾 Salvar Alterações'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// -----------------------------
// Estilos
// -----------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  header: { paddingVertical: 20, paddingHorizontal: 20 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 16, color: '#64748b', marginTop: 4 },
  signOutButton: { padding: 10, borderRadius: 8, backgroundColor: '#fee2e2' },
  signOutButtonText: { color: '#dc2626', fontWeight: 'bold' },
  profileCard: { backgroundColor: '#ffffff', padding: 24, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, marginBottom: 20, marginHorizontal: 20 },
  avatarContainer: { marginBottom: 10, position: 'relative', width: 80, height: 80 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarText: { color: '#2563eb', fontSize: 32, fontWeight: 'bold' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#2563eb', borderRadius: 12, padding: 6, borderWidth: 2, borderColor: '#ffffff' },
  displayName: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  email: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  verifiedBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, marginBottom: 15 },
  verifiedText: { color: '#16a34a', fontWeight: '600', fontSize: 14 },
  securityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, width: '100%', marginBottom: 5 },
  sectionCard: { backgroundColor: '#ffffff', padding: 24, borderRadius: 12, marginBottom: 20, marginHorizontal: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  saveButton: { backgroundColor: '#2563eb', padding: 18, borderRadius: 12, alignItems: 'center', marginHorizontal: 20, marginBottom: 20 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  label: { fontSize: 16, fontWeight: '600', color: '#334155', alignSelf: 'flex-start', marginTop: 15, marginBottom: 8 },
  input: { width: '100%', padding: 15, backgroundColor: '#f8fafc', borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  required: { color: '#ef4444' },
  alertBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', padding: 10, borderRadius: 8, marginBottom: 15, width: '100%', borderWidth: 1, borderColor: '#fca5a5' },
  alertText: { color: '#b91c1c', fontWeight: '600', textAlign: 'center', marginLeft: 8 },
  validationError: { color: '#ef4444', alignSelf: 'flex-start', marginTop: 5, fontSize: 14 },
  inputContainer: { width: '100%', position: 'relative', justifyContent: 'center' },
  calendarIcon: { position: 'absolute', right: 15 },
  languageSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  notificationItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  notificationSubtitle: { fontSize: 14, color: '#64748b' }
});