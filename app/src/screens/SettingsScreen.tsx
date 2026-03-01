import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TextInput, Alert, ActivityIndicator,
    TouchableOpacity, Dimensions, Modal, TouchableWithoutFeedback
} from 'react-native';
import { supabase } from '../config/supabase';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { geocodeCEP, LocalCadastrado } from '../utils/geocoding';

const { width } = Dimensions.get('window');

interface FormacaoItem {
    instituicao: string;
    periodo: string;
    curso: string;
}

interface UserProfile {
    full_name?: string;
    email?: string;
    cpf?: string;
    data_nascimento?: string;
    telefone?: string;
    linkedin?: string;
    cep_residencia?: string;
    pais_residencia?: string;
    uf_residencia?: string;
    cidade_residencia?: string;
    cep_trabalho?: string;
    cnpj?: string;
    atuacao?: string;
    tipo_trabalho?: 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO' | 'DESEMPREGADO' | '';
    empresa?: string;
    cargo?: string;
    tempo_empresa?: string;
    conta_verificada?: boolean;
    locais_cadastrados?: LocalCadastrado[];
}

const FORMACAO_TITLES = ['Ensino Médio/Técnico', 'Graduação/Tecnólogo', 'Especialização', 'MBA', 'Mestrado', 'Doutorado'];
const TIPOS_TRABALHO = [
    { label: "Presencial", value: 'PRESENCIAL' },
    { label: "Online", value: 'ONLINE' },
    { label: "Híbrido", value: 'HIBRIDO' },
    { label: "Desempregado", value: 'DESEMPREGADO' },
];
const CURSOS_FIXOS = ['Química', 'Informática', 'Estradas', 'Edificações', 'Mecânica'];

const maskCPF = (v: string) => v.replace(/\D/g, '').replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2').substring(0, 14);
const maskCNPJ = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d)/, '$1-$2').substring(0, 18);
const maskPhone = (v: string) => {
    v = v.replace(/\D/g, '').substring(0, 11);
    if (v.length > 6) return v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    if (v.length > 2) return v.replace(/^(\d{2})(\d+)/, '($1) $2');
    return v.length > 0 ? '(' + v : '';
};

const validateCPF = (cpf: string) => {
    const c = cpf.replace(/[^\d]/g, '');
    if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    let s = 0, r;
    for (let i = 1; i <= 9; i++) s += parseInt(c.substring(i - 1, i)) * (11 - i);
    r = (s * 10) % 11;
    if (r === 10 || r === 11) r = 0;
    if (r !== parseInt(c.substring(9, 10))) return false;
    s = 0;
    for (let i = 1; i <= 10; i++) s += parseInt(c.substring(i - 1, i)) * (12 - i);
    r = (s * 10) % 11;
    if (r === 10 || r === 11) r = 0;
    return r === parseInt(c.substring(10, 11));
};

const LocalResidenciaTab = ({ profile, handleCEPChange }: any) => (
    <View style={localStyles.tabContentBox}>
        <Text style={styles.label}>CEP Onde Mora</Text>
        <TextInput style={styles.input} value={profile.cep_residencia || ""} keyboardType="numeric" maxLength={8} onChangeText={handleCEPChange} placeholder="Digite o CEP" />
        <Text style={styles.label}>País</Text>
        <TextInput style={[styles.input, { backgroundColor: "#1e293b" }]} value={profile.pais_residencia || ""} editable={false} />
        <Text style={styles.label}>UF</Text>
        <TextInput style={[styles.input, { backgroundColor: "#1e293b" }]} value={profile.uf_residencia || ""} editable={false} />
        <Text style={styles.label}>Cidade</Text>
        <TextInput style={[styles.input, { backgroundColor: "#1e293b" }]} value={profile.cidade_residencia || ""} editable={false} />
    </View>
);

const LocalTrabalhoTab = ({ profile, handleChange }: any) => {
    const isUnemployed = profile.tipo_trabalho === 'DESEMPREGADO';
    return (
        <View style={localStyles.tabContentBox}>
            <Text style={styles.label}>CEP Onde Trabalha</Text>
            <TextInput 
                style={[styles.input, isUnemployed && { opacity: 0.5 }]} 
                value={profile.cep_trabalho || ""} 
                onChangeText={(v) => handleChange("cep_trabalho", v)} 
                placeholder="Ex: 57000-000" 
                keyboardType="numeric" 
                editable={!isUnemployed}
            />
            <Text style={styles.label}>CNPJ da Empresa</Text>
            <TextInput 
                style={[styles.input, isUnemployed && { opacity: 0.5 }]} 
                value={maskCNPJ(profile.cnpj || "")} 
                onChangeText={(v) => handleChange("cnpj", v)} 
                placeholder="00.000.000/0000-00" 
                keyboardType="numeric" 
                editable={!isUnemployed}
            />
            <Text style={styles.label}>Tipo de Trabalho</Text>
            <View style={localStyles.selectContainer}>
                {TIPOS_TRABALHO.map((item) => (
                    <TouchableOpacity key={item.value} style={[localStyles.selectOption, profile.tipo_trabalho === item.value && localStyles.selectOptionActive]} onPress={() => handleChange('tipo_trabalho', item.value)}>
                        <Text style={profile.tipo_trabalho === item.value ? localStyles.selectTextActive : localStyles.selectText}>{item.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.label}>Atua Como / Trabalha Como</Text>
            <TextInput style={[styles.input, isUnemployed && { opacity: 0.5 }]} value={profile.atuacao || ""} onChangeText={(v) => handleChange("atuacao", v)} placeholder="Ex: Computação, Autônomo, Gerente..." editable={!isUnemployed} />
            <Text style={styles.label}>Nome da Empresa</Text>
            <TextInput style={[styles.input, isUnemployed && { opacity: 0.5 }]} value={profile.empresa || ""} onChangeText={(v) => handleChange("empresa", v)} placeholder="Nome da empresa" editable={!isUnemployed} />
            <Text style={styles.label}>Cargo</Text>
            <TextInput style={[styles.input, isUnemployed && { opacity: 0.5 }]} value={profile.cargo || ""} onChangeText={(v) => handleChange("cargo", v)} placeholder="Seu cargo na empresa" editable={!isUnemployed} />
            <Text style={styles.label}>Tempo de Atuação na Empresa</Text>
            <TextInput style={[styles.input, isUnemployed && { opacity: 0.5 }]} value={profile.tempo_empresa || ""} onChangeText={(v) => handleChange("tempo_empresa", v)} placeholder="Ex: 2 anos e 6 meses" editable={!isUnemployed} />
        </View>
    );
};

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const [profile, setProfile] = useState<Partial<UserProfile>>({});
    const [formacoes, setFormacoes] = useState<FormacaoItem[]>(Array(6).fill({ instituicao: '', periodo: '', curso: '' }));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [date, setDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState<'residencia' | 'trabalho'>('residencia');
    const [isCourseModalVisible, setIsCourseModalVisible] = useState(false);
    const [currentFormacaoIndex, setCurrentFormacaoIndex] = useState<number | null>(null);

    const handleCEPChange = async (v: string) => {
        const clean = v.replace(/\D/g, '');
        setProfile(p => ({ ...p, cep_residencia: clean }));
        if (clean.length === 8) {
            const res = await geocodeCEP(clean, 'Residencia');
            if (res) setProfile(p => ({ ...p, pais_residencia: res.pais, uf_residencia: res.uf, cidade_residencia: res.municipio }));
        }
    };

    const handleChange = useCallback((key: keyof UserProfile, value: string) => {
        let final = value;
        if (key === 'cpf') final = maskCPF(value);
        if (key === 'cnpj') final = maskCNPJ(value);
        if (key === 'telefone') final = maskPhone(value);
        if (key === 'tipo_trabalho' && value === 'DESEMPREGADO') {
            setProfile(prev => ({ ...prev, [key]: value, cep_trabalho: '', cnpj: '', atuacao: '', empresa: '', cargo: '', tempo_empresa: '' }));
            return;
        }
        setProfile(prev => ({ ...prev, [key]: final }));
    }, []);

    const handleFormacaoChange = (index: number, key: keyof FormacaoItem, value: string) => {
        setFormacoes(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [key]: value };
            return copy;
        });
    };

    const onDateChange = (event: any, selected?: Date) => {
        setShowDatePicker(false);
        if (selected) {
            setDate(selected);
            handleChange('data_nascimento', selected.toLocaleDateString('pt-BR'));
        }
    };

    const loadProfile = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data, error } = await supabase.from('usuarios').select('*').eq('id', user.id).single();
            if (error && (error as any).code !== 'PGRST116') throw error;
            const initial: any = { email: user.email || '', full_name: data?.full_name || user.user_metadata?.full_name || '', ...(data || {}) };
            if (initial.cpf) initial.cpf = maskCPF(String(initial.cpf));
            if (initial.cnpj) initial.cnpj = maskCNPJ(String(initial.cnpj));
            if (initial.telefone) initial.telefone = maskPhone(String(initial.telefone));
            if (initial.data_nascimento) {
                const parts = String(initial.data_nascimento).split('/');
                if (parts.length === 3) {
                    const parsed = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                    if (!isNaN(parsed.getTime())) setDate(parsed);
                }
            }
            const dbForm: any[] = (data?.formacao_academica && Array.isArray(data.formacao_academica)) ? data.formacao_academica : [];
            setFormacoes(Array(6).fill(null).map((_, i) => dbForm[i] || { instituicao: '', periodo: '', curso: '' }));
            setProfile(initial);
        } catch (e) {
            Alert.alert("Erro", "Falha ao carregar perfil.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadProfile(); }, []);

    const handleSave = async () => {
    const cleanCPF = profile.cpf?.replace(/\D/g, '') || '';
    if (!cleanCPF || !validateCPF(cleanCPF)) return Alert.alert("Erro", "CPF inválido.");
    const cleanCNPJ = profile.cnpj?.replace(/\D/g, '') || '';
    if (profile.tipo_trabalho !== 'DESEMPREGADO' && cleanCNPJ && cleanCNPJ.length !== 14) return Alert.alert("Erro", "CNPJ inválido.");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    try {
        const formToSave = formacoes.filter(f => (f.instituicao || f.curso || f.periodo) && (f.instituicao.trim() || f.curso.trim() || f.periodo.trim()));
        const isUnemployed = profile.tipo_trabalho === 'DESEMPREGADO';

        // Validações detalhadas e mensagem ao usuário
        const missing: string[] = [];
        if (!profile.full_name || !profile.full_name.trim()) missing.push('Nome completo');
        if (!cleanCPF) missing.push('CPF válido');
        if (!profile.data_nascimento) missing.push('Data de nascimento');
        if (!profile.telefone || !profile.telefone.trim()) missing.push('Telefone');

        const cepClean = profile.cep_residencia?.replace(/\D/g, '') || '';
        if (!(cepClean.length === 8 && profile.pais_residencia && profile.uf_residencia && profile.uf_residencia.length === 2 && profile.cidade_residencia)) missing.push('Endereço de residência completo (CEP, país, UF, cidade)');

        if (!profile.tipo_trabalho) missing.push('Tipo de trabalho (escolha uma opção)');
        else if (!isUnemployed) {
            if (!profile.empresa || !profile.empresa.trim() || !profile.cargo || !profile.cargo.trim()) missing.push('Dados de trabalho completos (empresa e cargo)');
        }

        // Requer pelo menos a formação mínima (ensino médio/técnico) na posição 0
        const hasMinFormation = (formacoes[0] && (formacoes[0].instituicao?.trim() || formacoes[0].curso?.trim() || formacoes[0].periodo?.trim()));
        if (!hasMinFormation) missing.push('Ao menos uma formação: Ensino Médio/Técnico');

        if (missing.length > 0) {
            Alert.alert('Faltando informações', 'Preencha os campos obrigatórios:\n\n' + missing.join('\n'));
            setSaving(false);
            return;
        }

        const isVerified = true; // todos os requisitos preenchidos
        if (isVerified && !profile.conta_verificada) Alert.alert("Parabéns!", "Conta verificada!");

        const locais: any[] = [];
        const resLoc = await geocodeCEP(profile.cep_residencia!, 'Residencia');
        if (resLoc) locais.push(resLoc);
        if (!isUnemployed && profile.cep_trabalho?.replace(/\D/g, '').length === 8) {
            const jobLoc = await geocodeCEP(profile.cep_trabalho, 'Trabalho');
            if (jobLoc) locais.push(jobLoc);
        }

        const payload = {
            ...profile,
            id: user.id,
            cpf: cleanCPF,
            data_nascimento: date.toLocaleDateString('pt-BR'),
            telefone: profile.telefone?.replace(/\D/g, ''),
            cep_residencia: profile.cep_residencia?.replace(/\D/g, ''),
            cep_trabalho: isUnemployed ? (profile.cep_trabalho ? profile.cep_trabalho.replace(/\D/g, '') : '') : (profile.cep_trabalho?.replace(/\D/g, '')),
            cnpj: isUnemployed ? '' : cleanCNPJ,
            conta_verificada: isVerified,
            formacao_academica: formToSave,
            locais_cadastrados: locais
        };

        const { error } = await supabase.from("usuarios").upsert(payload);
        if (error) throw error;
        Alert.alert("Sucesso", "Dados salvos!");
        loadProfile();
    } catch (err) {
        console.error(err);
        Alert.alert("Erro", "Falha ao salvar.");
    } finally {
        setSaving(false);
    }
};

    const handleDeleteAccount = () => {
        Alert.alert("Excluir Conta", "Isso apagará todos os seus dados permanentemente. Confirmar?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Excluir", style: "destructive", onPress: async () => {
                setSaving(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('usuarios').delete().eq('id', user.id);
                    await supabase.auth.signOut();
                }
                setSaving(false);
            }}
        ]);
    };

    if (loading) return <View style={styles.loadingView}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <ScrollView style={[styles.container, { paddingBottom: insets.bottom + 140 }]}>
            <Text style={styles.title}>Configurações de Perfil</Text>
            <View style={localStyles.sectionBox}>
                <Text style={styles.label}>Nome completo</Text>
                <TextInput style={styles.input} value={profile.full_name || ""} onChangeText={v => handleChange("full_name", v)} />
                <View style={[localStyles.statusBox, { backgroundColor: profile.conta_verificada ? '#052e16' : '#1e293b', borderColor: profile.conta_verificada ? '#22c55e' : '#f59e0b' }]}>
                    <Text style={[localStyles.statusText, { color: profile.conta_verificada ? '#22c55e' : '#f59e0b' }]}>{profile.conta_verificada ? '✅ Verificada' : '⚠️ Não Verificada'}</Text>
                    {!profile.conta_verificada && (
                        <View style={{ marginTop: 8 }}>
                            <Text style={localStyles.verificationHint}>Para que sua conta seja VERIFICADA, preencha obrigatoriamente:</Text>
                            <Text style={localStyles.verificationHint}>• Todas as informações pessoais: nome, CPF, data de nascimento e telefone.</Text>
                            <Text style={localStyles.verificationHint}>• Endereço de residência (CEP, país, UF, cidade) e dados de trabalho — mesmo que esteja desempregado, selecione "Desempregado" e preencha o que for aplicável.</Text>
                            <Text style={localStyles.verificationHint}>• Ao menos uma formação acadêmica (mínimo: Ensino Médio/Técnico).</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.label}>CPF</Text>
                <TextInput style={styles.input} value={profile.cpf} onChangeText={v => handleChange("cpf", v)} keyboardType="numeric" />
                <Text style={styles.label}>Data de Nascimento</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}><Text style={profile.data_nascimento ? localStyles.dateTextFilled : localStyles.dateTextPlaceholder}>{profile.data_nascimento || "Selecionar"}</Text></TouchableOpacity>
                {showDatePicker && <DateTimePicker value={date} mode="date" onChange={onDateChange} />}
                <Text style={styles.label}>Telefone</Text>
                <TextInput style={styles.input} value={profile.telefone} onChangeText={v => handleChange("telefone", v)} keyboardType="phone-pad" />
            </View>
            <View style={localStyles.tabContainer}>
                <TouchableOpacity style={[localStyles.tabButton, activeTab === 'residencia' && localStyles.tabButtonActive]} onPress={() => setActiveTab('residencia')}><Text>Residência</Text></TouchableOpacity>
                <TouchableOpacity style={[localStyles.tabButton, activeTab === 'trabalho' && localStyles.tabButtonActive]} onPress={() => setActiveTab('trabalho')}><Text>Trabalho</Text></TouchableOpacity>
            </View>
            <View style={localStyles.tabContentBox}>{activeTab === 'residencia' ? <LocalResidenciaTab profile={profile} handleCEPChange={handleCEPChange} /> : <LocalTrabalhoTab profile={profile} handleChange={handleChange} />}</View>
            {FORMACAO_TITLES.map((t, i) => (
                <View key={i} style={styles.formacaoBox}>
                    <Text style={styles.formacaoTitle}>{t}</Text>
                    <TextInput style={styles.input} placeholder="Instituição" value={formacoes[i].instituicao} onChangeText={v => handleFormacaoChange(i, "instituicao", v)} />
                    <TouchableOpacity style={styles.input} onPress={() => { setCurrentFormacaoIndex(i); setIsCourseModalVisible(true); }}>
                        <Text style={formacoes[i].curso ? styles.inputText : styles.inputPlaceholder}>{formacoes[i].curso || "Selecionar Curso"}</Text>
                    </TouchableOpacity>
                    <TextInput style={styles.input} placeholder="Período" value={formacoes[i].periodo} onChangeText={v => handleFormacaoChange(i, "periodo", v)} />
                </View>
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Salvar</Text>}</TouchableOpacity>
            <TouchableOpacity style={styles.signOutBtn} onPress={() => supabase.auth.signOut()}><Text style={styles.signOutText}>Sair</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.signOutBtn, { borderColor: '#dc2626', marginTop: 10, marginBottom: 40 }]} onPress={handleDeleteAccount}><Text style={{ color: '#dc2626', fontWeight: 'bold' }}>Excluir Conta</Text></TouchableOpacity>
            <Modal visible={isCourseModalVisible} transparent animationType="fade">
                <View style={localStyles.modalOverlay}><View style={localStyles.modalContent}>
                    {CURSOS_FIXOS.map(c => (
                        <TouchableOpacity key={c} style={localStyles.modalOption} onPress={() => { handleFormacaoChange(currentFormacaoIndex!, 'curso', c); setIsCourseModalVisible(false); }}>
                            <Text style={localStyles.modalOptionText}>{c}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity onPress={() => setIsCourseModalVisible(false)} style={{ marginTop: 8, alignItems: 'center' }}>
                        <Text style={localStyles.modalCloseButtonText}>Fechar</Text>
                    </TouchableOpacity>
                </View></View>
            </Modal>
        </ScrollView>
    );
}

 
const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        padding: 18, 
        backgroundColor: '#0f172a' 
    },

    loadingView: { 
        flex: 1, 
        justifyContent: "center", 
        alignItems: "center" 
    },

    title: { 
        fontSize: 26, 
        fontWeight: "700", 
        marginBottom: 20, 
        color: '#f8fafc' 
    },

    label: { 
        fontWeight: "600", 
        marginTop: 12, 
        marginBottom: 4, 
        color: '#94a3b8' 
    },

    input: {
        padding: 12,
        borderWidth: 1,
        borderColor: "#334155",
        borderRadius: 10,
        backgroundColor: "#1e293b",
        color: '#f1f5f9',
        fontSize: 15,
        justifyContent: 'center', 
        minHeight: 48,
    },

    saveBtn: {
        backgroundColor: "#2563eb",
        padding: 14,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 28,
        marginBottom: 15
    },

    saveText: { 
        color: "#ffffff", 
        fontWeight: "700", 
        fontSize: 16 
    },

    formacaoBox: {
        marginTop: 10,
        padding: 15,
        backgroundColor: "#1e293b",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#334155'
    },

    formacaoTitle: { 
        fontWeight: "800", 
        marginBottom: 8, 
        color: '#f8fafc' 
    },
    
    inputText: {
        color: '#f1f5f9',
        fontSize: 15,
    },

    inputPlaceholder: {
        color: '#64748b',
        fontSize: 15,
    },
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        marginTop: 10,
        marginBottom: 10,
        backgroundColor: '#1e293b',
        borderColor: '#dc2626',
        borderWidth: 1,
    },

    signOutText: {
        color: "#ef4444",
        fontWeight: "700",
        fontSize: 16,
        marginLeft: 10
    }
});
const localStyles = StyleSheet.create({
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginTop: 25,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#2563eb',
        paddingLeft: 8,
    },

    sectionBox: {
        padding: 15,
        backgroundColor: "#1e293b",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#334155',
    },

    statusBox: {
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        marginTop: 5,
        marginBottom: 10, 
        backgroundColor: '#0f172a'
    },

    statusText: {
        fontWeight: '700',
        color: '#f1f5f9'
    },

    verificationHint: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 5,
    },

    dateTextFilled: {
        color: '#f1f5f9', 
        fontSize: 15,
    },

    dateTextPlaceholder: {
        color: '#64748b', 
        fontSize: 15,
    },

    tabContainer: {
        flexDirection: 'row',
        marginBottom: 10,
        backgroundColor: '#1e293b',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#334155',
    },

    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },

    tabButtonActive: {
        borderBottomColor: '#2563eb',
        backgroundColor: '#0f172a', 
        borderRadius: 8,
    },

    tabText: {
        marginLeft: 5,
        fontSize: 15,
        fontWeight: '600',
        color: '#94a3b8',
    },

    tabTextActive: {
        color: '#3b82f6',
    },

    tabContentBox: {
        padding: 15,
        backgroundColor: "#1e293b",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#334155',
    },

    selectContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#0f172a',
        borderRadius: 8,
        padding: 5,
        marginTop: 5,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#334155',
    },

    selectOption: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 6,
        marginHorizontal: 2,
    },

    selectOptionActive: {
        backgroundColor: '#2563eb',
    },

    selectText: {
        color: '#94a3b8',
        fontWeight: '600',
    },

    selectTextActive: {
        color: '#ffffff',
        fontWeight: '600',
    },
   
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    modalContent: {
        width: '90%',
        backgroundColor: '#1e293b',
        borderRadius: 15,
        padding: 20,
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: '#334155',
    },

    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#f8fafc',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        paddingBottom: 10,
    },

    modalOption: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    modalOptionText: {
        fontSize: 16,
        color: '#e2e8f0',
    },

    modalCloseButton: {
        marginTop: 15,
        padding: 12,
        backgroundColor: '#0f172a',
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155'
    },
    modalCloseButtonText: {
        color: '#94a3b8',
        fontWeight: '700',
    }
});