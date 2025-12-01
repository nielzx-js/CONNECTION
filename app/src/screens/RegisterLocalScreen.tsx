import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, TextInput, ScrollView, 
    TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { supabase } from '../config/supabase'; 
import { Feather } from '@expo/vector-icons'; 
import { useNavigation } from '@react-navigation/native';
import { User } from '@supabase/supabase-js';

interface LocalData {
    nome_local: string;
    cep: string;
    latitude: number;
    longitude: number;
    tipo_local: 'Residencia' | 'Trabalho' | 'Formacao' | 'Outro';
    timestamp_cadastro: string;
}

export default function RegisterLocalScreen() {
    const navigation = useNavigation();

    const [nomeLocal, setNomeLocal] = useState('');
    const [cep, setCep] = useState('');
    const [tipoLocal, setTipoLocal] = useState<'Residencia' | 'Trabalho' | 'Formacao' | 'Outro'>('Outro');
    const [loading, setLoading] = useState(false);

    const maskCEP = (value: string) => {
        value = value.replace(/\D/g, '');
        value = value.replace(/^(\d{5})(\d)/, '$1-$2');
        return value.substring(0, 9);
    };

    const getCoordinatesFromCEP = async (cep: string) => {
        const cleanCep = cep.replace(/\D/g, '');
        const response = await fetch(`https://cep.awesomeapi.com.br/json/${cleanCep}`);
        if (!response.ok) {
            let errorDetail = 'CEP não encontrado ou inválido.';
            try {
                const errorData = await response.json();
                if (errorData.message) errorDetail = errorData.message;
            } catch {}
            throw new Error(errorDetail);
        }
        const data = await response.json();
        const latitude = parseFloat(data.lat);
        const longitude = parseFloat(data.lng);
        if (isNaN(latitude) || isNaN(longitude) || latitude === 0 || longitude === 0) {
            throw new Error('Não foi possível encontrar as coordenadas para este CEP. Tente outro.');
        }
        return { latitude, longitude };
    };

    const handleRegisterLocal = async () => {
        if (!nomeLocal.trim() || !cep.trim() || cep.length < 9) {
            Alert.alert('Erro', 'Preencha Nome do Local e um CEP válido (00000-000).');
            return;
        }

        if (loading) return;
        setLoading(true);
        let user: User | null = null; 

        try {
            const { latitude, longitude } = await getCoordinatesFromCEP(cep);
            const authData = await supabase.auth.getUser();
            user = authData.data.user;
            if (!user) {
                Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
                navigation.goBack();
                setLoading(false);
                return;
            }

            const { data: profileFetch, error: fetchError } = await supabase
                .from('usuarios')
                .select('locais_cadastrados')
                .eq('id', user.id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') throw fetchError; 
            const locaisAtuais = (profileFetch?.locais_cadastrados || []) as LocalData[];
            if (locaisAtuais.length >= 3) {
                Alert.alert(
                    'Limite atingido (3/3)',
                    'Você já cadastrou 3 locais. Remova ou edite um local existente para adicionar outro.'
                );
                setLoading(false);
                return;
            }

            const novoLocalData: LocalData = {
                nome_local: nomeLocal.trim(),
                cep: cep.trim(),
                latitude,
                longitude,
                tipo_local: tipoLocal,
                timestamp_cadastro: new Date().toISOString(),
            };

            const { error: rpcError } = await supabase.rpc('add_local_to_user', {
                user_id: user.id,
                new_local_data: novoLocalData,
            });

            if (rpcError) throw rpcError;

            Alert.alert('Sucesso!', 'Local cadastrado com sucesso e adicionado ao mapa!');
            navigation.goBack();

        } catch (error: any) {
            if (error.code === 'PGRST116' && user) {
                const { error: insertError } = await supabase
                    .from('usuarios')
                    .insert({ id: user.id, locais_cadastrados: [] });
                
                if (insertError) {
                    Alert.alert('Erro de Inicialização', 'Falha ao inicializar o perfil do usuário. Tente novamente.');
                    console.error("Erro ao inicializar perfil:", insertError);
                } else {
                    Alert.alert('Atenção', 'Perfil inicializado. Tente cadastrar o local novamente.');
                }
            } else {
                Alert.alert('Erro', error.message || 'Falha ao cadastrar local.');
            }
        } finally {
            setLoading(false);
        }
    };

    const isSelected = (type: string) => tipoLocal === type;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={styles.backButtonContainer}
                >
                    <Feather name="arrow-left" size={24} color="#2563eb" />
                    <Text style={styles.backButton}>Voltar para o Início</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>📍</Text>
                </View>

                <Text style={styles.title}>Cadastrar Local</Text>
                <Text style={styles.subtitle}>Adicione um novo ponto no mapa (máx. 3).</Text>

                <Text style={styles.label}>Nome do Local</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: Minha Casa, Trabalho Principal..."
                    value={nomeLocal}
                    onChangeText={setNomeLocal}
                    editable={!loading}
                />

                <Text style={styles.label}>CEP</Text>
                <TextInput
                    style={styles.input}
                    placeholder="00000-000"
                    keyboardType="numeric"
                    maxLength={9}
                    value={cep}
                    onChangeText={(text) => setCep(maskCEP(text))}
                    editable={!loading}
                />
                
                <Text style={styles.label}>Tipo de Local</Text>
                <View style={styles.typeSelectorContainer}>
                    <TouchableOpacity 
                        style={[styles.typeButton, isSelected('Residencia') && styles.typeButtonSelected]}
                        onPress={() => setTipoLocal('Residencia')}
                        disabled={loading}
                    >
                        <Text style={[styles.typeButtonText, isSelected('Residencia') && styles.typeButtonTextSelected]}>🏡 Residência</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.typeButton, isSelected('Trabalho') && styles.typeButtonSelected]}
                        onPress={() => setTipoLocal('Trabalho')}
                        disabled={loading}
                    >
                        <Text style={[styles.typeButtonText, isSelected('Trabalho') && styles.typeButtonTextSelected]}>💼 Trabalho</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.typeButton, isSelected('Formacao') && styles.typeButtonSelected]}
                        onPress={() => setTipoLocal('Formacao')}
                        disabled={loading}
                    >
                        <Text style={[styles.typeButtonText, isSelected('Formacao') && styles.typeButtonTextSelected]}>🎓 Formação</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.typeButton, isSelected('Outro') && styles.typeButtonSelected]}
                        onPress={() => setTipoLocal('Outro')}
                        disabled={loading}
                    >
                        <Text style={[styles.typeButtonText, isSelected('Outro') && styles.typeButtonTextSelected]}>✨ Outro</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity 
                    style={[styles.button, loading && {opacity: 0.6}]} 
                    onPress={handleRegisterLocal}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Cadastrar Local</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    backButtonContainer: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 10 },
    backButton: { fontSize: 16, color: '#2563eb', fontWeight: '600' },
    card: { backgroundColor: '#fff', margin: 20, padding: 30, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
    iconContainer: { width: 64, height: 64, backgroundColor: '#e0e7ff', borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#a5b4fc' },
    icon: { fontSize: 32 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 30, lineHeight: 20 },
    label: { fontSize: 16, fontWeight: '600', color: '#0f172a', alignSelf: 'flex-start', width: '100%', marginTop: 15, marginBottom: 8 },
    input: { width: '100%', padding: 15, backgroundColor: '#f8fafc', borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: '#cbd5e1', color: '#0f172a' },
    button: { width: '100%', backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30, minHeight: 50, justifyContent: 'center' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    typeSelectorContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 10 },
    typeButton: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', backgroundColor: '#fff' },
    typeButtonSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    typeButtonText: { color: '#475569', fontWeight: '600', fontSize: 13 },
    typeButtonTextSelected: { color: '#fff' }
});
