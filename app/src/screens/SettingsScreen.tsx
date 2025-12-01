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
    tipo_trabalho?: 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO' | ''; 
    empresa?: string;
    cargo?: string;
    tempo_empresa?: string;
    conta_verificada?: boolean; 
    locais_cadastrados?: LocalCadastrado[]; 
}

const FORMACAO_TITLES = [
    'Ensino Médio/Técnico', 
    'Graduação/Tecnólogo', 
    'Especialização', 
    'MBA', 
    'Mestrado', 
    'Doutorado'
];

const TIPOS_TRABALHO = [
    { label: "Presencial", value: 'PRESENCIAL' },
    { label: "Online", value: 'ONLINE' },
    { label: "Híbrido", value: 'HIBRIDO' },
];

const CURSOS_FIXOS = [
    'Química',
    'Informática',
    'Estradas',
    'Edificações',
    'Mecânica',
];

const maskCPF = (value: string): string => {
    if (!value) return '';
    value = value.replace(/\D/g, '');
    value = value.replace(/^(\d{3})(\d)/, '$1.$2');
    value = value.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
    value = value.replace(/\.(\d{3})(\d)/, '.$1-$2');
    return value.substring(0, 14); 
};

const maskCNPJ = (value: string): string => {
    if (!value) return '';
    value = value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    value = value.replace(/(\d{3})(\d)/, '$1/$2');
    value = value.replace(/(\d{4})(\d)/, '$1-$2');
    return value.substring(0, 18);
};

const maskPhone = (value: string): string => {
    if (!value) return '';
    value = value.replace(/\D/g, ''); 
    value = value.substring(0, 11);

    if (value.length > 6) {
        value = value.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d+)/, '($1) $2');
    } else if (value.length > 0) {
           value = value.replace(/^(\d*)/, '($1');
    }
    
    return value;
};

const validateCPF = (cpf: string): boolean => {
    const cleanCPF = cpf.replace(/[^\d]/g, '');
    if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) return false;
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

const LocalResidenciaTab = ({ profile, handleChange }: { profile: Partial<UserProfile>, handleChange: (key: keyof UserProfile, value: string) => void }) => (
    <View style={localStyles.tabContent}>
        <Text style={styles.label}>CEP Onde Mora </Text>
        <TextInput
            style={styles.input}
            value={profile.cep_residencia || ""}
            onChangeText={(v) => handleChange("cep_residencia", v)}
            placeholder="Ex: 57000-000"
            keyboardType="numeric"
            autoCorrect={false}
        />
        
        <Text style={styles.label}>País</Text>
        <TextInput
            style={styles.input}
            value={profile.pais_residencia || ""}
            onChangeText={(v) => handleChange("pais_residencia", v)}
            placeholder="Ex: Brasil"
        />
        
        <Text style={styles.label}>UF (Estado)</Text>
        <TextInput
            style={styles.input}
            value={profile.uf_residencia || ""}
            onChangeText={(v) => handleChange("uf_residencia", v.toUpperCase())}
            placeholder="Ex: AL"
            maxLength={2}
        />

        <Text style={styles.label}>Cidade onde mora</Text>
        <TextInput
            style={styles.input}
            value={profile.cidade_residencia || ""}
            onChangeText={(v) => handleChange("cidade_residencia", v)}
            placeholder="Ex: Maceió"
        />
    </View>
);

const LocalTrabalhoTab = ({ profile, handleChange, activeTab }: { profile: Partial<UserProfile>, handleChange: (key: keyof UserProfile, value: string) => void, activeTab: 'residencia' | 'trabalho' }) => (
    <View style={localStyles.tabContent}>
        <Text style={styles.label}>CEP Onde Trabalha </Text>
        <TextInput
            style={styles.input}
            value={profile.cep_trabalho || ""}
            onChangeText={(v) => handleChange("cep_trabalho", v)}
            placeholder="Ex: 57000-000"
            keyboardType="numeric"
            autoCorrect={false}
        />

        <Text style={styles.label}>CNPJ da Empresa</Text>
        <TextInput
            style={styles.input}
            value={maskCNPJ(profile.cnpj || "")}
            onChangeText={(v) => handleChange("cnpj", v)}
            placeholder="00.000.000/0000-00"
            keyboardType="numeric"
            autoCorrect={false}
        />
        
        <Text style={styles.label}>Atua Como/Trabalha Como</Text>
        <TextInput
            style={styles.input}
            value={profile.atuacao || ""}
            onChangeText={(v) => handleChange("atuacao", v)}
            placeholder="Ex: Computação, Autônomo, Gerente..."
        />
        
        <Text style={styles.label}>Tipo de Trabalho</Text>
        <View style={localStyles.selectContainer}>
            {TIPOS_TRABALHO.map((item) => (
                <TouchableOpacity
                    key={item.value}
                    style={[localStyles.selectOption, profile.tipo_trabalho === item.value && localStyles.selectOptionActive]}
                    onPress={() => handleChange('tipo_trabalho', item.value)}
                >
                    <Text style={profile.tipo_trabalho === item.value ? localStyles.selectTextActive : localStyles.selectText}>
                        {item.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>

        <Text style={styles.label}>Nome da Empresa</Text>
        <TextInput
            style={styles.input}
            value={profile.empresa || ""}
            onChangeText={(v) => handleChange("empresa", v)}
            placeholder="Nome da empresa"
        />

        <Text style={styles.label}>Cargo (Ex: Desenvolvedor Mobile)</Text>
        <TextInput
            style={styles.input}
            value={profile.cargo || ""}
            onChangeText={(v) => handleChange("cargo", v)}
            placeholder="Seu cargo na empresa"
        />

        <Text style={styles.label}>Tempo de Atuação na Empresa</Text>
        <TextInput
            style={styles.input}
            value={profile.tempo_empresa || ""}
            onChangeText={(v) => handleChange("tempo_empresa", v)}
            placeholder="Ex: 2 anos e 6 meses"
        />
    </View>
);

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    
    const [profile, setProfile] = useState<Partial<UserProfile>>({});
    const [formacoes, setFormacoes] = useState<FormacaoItem[]>(Array(6).fill({ instituicao: '', periodo: '', curso: '' }));
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [date, setDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState<'residencia' | 'trabalho'>('residencia');
    const [isCourseModalVisible, setIsCourseModalVisible] = useState(false);
    const [currentFormacaoIndex, setCurrentFormacaoIndex] = useState<number | null>(null);
    
    const handleChange = useCallback((key: keyof UserProfile, value: string) => {
        let finalValue = value;
        
        if (key === 'cpf') finalValue = maskCPF(value);
        if (key === 'cnpj') finalValue = maskCNPJ(value);
        if (key === 'telefone') finalValue = maskPhone(value);
        
        setProfile(prev => ({ ...prev, [key]: finalValue }));
    }, []); 

    const handleFormacaoChange = useCallback((index: number, key: keyof FormacaoItem, value: string) => {
        setFormacoes(prev => {
            const copy = prev.slice();
            copy[index] = { ...copy[index], [key]: value };
            return copy;
        });
    }, []);
    
    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDate(selectedDate);
            handleChange('data_nascimento', selectedDate.toLocaleDateString('pt-BR')); 
        }
    };
    
    const openCourseModal = (index: number) => {
        setCurrentFormacaoIndex(index);
        setIsCourseModalVisible(true);
    };

    const selectFixedCourse = (course: string) => {
        if (currentFormacaoIndex !== null) {
            handleFormacaoChange(currentFormacaoIndex, 'curso', course);
        }
        setIsCourseModalVisible(false);
        setCurrentFormacaoIndex(null);
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

            const initialProfile: Partial<UserProfile> & { formacao_academica?: FormacaoItem[] } = {
                email: user.email || '',
                full_name: data?.full_name || user.user_metadata?.full_name || '',
                ...(data || {})
            };
            
            initialProfile.conta_verificada = data?.conta_verificada ?? false; 

            if (initialProfile.cpf) initialProfile.cpf = maskCPF(String(initialProfile.cpf));
            if (initialProfile.cnpj) initialProfile.cnpj = maskCNPJ(String(initialProfile.cnpj));
            if (initialProfile.telefone) initialProfile.telefone = maskPhone(String(initialProfile.telefone));

            if (initialProfile.data_nascimento) {
                const parts = String(initialProfile.data_nascimento).split('/');
                if (parts.length === 3) {
                    const parsed = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                    if (!isNaN(parsed.getTime())) setDate(parsed);
                }
            }

            const DADOS_DO_BANCO: FormacaoItem[] = (data?.formacao_academica && Array.isArray(data.formacao_academica))
                ? data.formacao_academica as FormacaoItem[] : [];
            
            const filledFormations = Array(6).fill(null).map((_, i) => 
                DADOS_DO_BANCO[i] || { instituicao: '', periodo: '', curso: '' }
            );
            setFormacoes(filledFormations);

            delete (initialProfile as any).formacao_academica;

            setProfile(initialProfile);
        } catch (error) {
            console.error("Erro ao carregar perfil:", error);
            Alert.alert("Erro", "Não foi possível carregar seus dados.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const handleSave = async () => {
        const cleanCPF = profile.cpf ? profile.cpf.replace(/\D/g, '') : '';
        if (!cleanCPF || !validateCPF(cleanCPF)) {
            Alert.alert("Erro de Validação", "CPF inválido. Por favor, verifique.");
            return;
        }
        
        const cleanCNPJ = profile.cnpj ? profile.cnpj.replace(/\D/g, '') : '';
        if (cleanCNPJ && cleanCNPJ.length !== 14) {
            Alert.alert("Erro de Validação", "CNPJ deve ter 14 dígitos. Por favor, verifique.");
            return;
        }

        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;
        if (!user) return Alert.alert("Erro", "Usuário não encontrado. Tente logar novamente.");

        setSaving(true);
        
        try {
            const cleanPhone = profile.telefone ? profile.telefone.replace(/\D/g, '') : '';
            const formattedDate = date.toLocaleDateString('pt-BR');

            const formacoesToSave = formacoes.filter(f => 
                f.instituicao.trim() !== '' || f.curso.trim() !== '' || f.periodo.trim() !== ''
            );

            let isVerified = profile.conta_verificada ?? false;

            if (!isVerified) {
                const hasPersonalInfo = 
                    (profile.full_name?.trim() ?? '') !== '' &&
                    (cleanCPF !== '') &&
                    (profile.data_nascimento?.trim() ?? '') !== '' &&
                    (cleanPhone !== '');

                const hasResidenceInfo = 
                    (profile.cep_residencia?.replace(/\D/g, '').length === 8) &&
                    (profile.pais_residencia?.trim() ?? '') !== '' &&
                    (profile.uf_residencia?.trim() ?? '').length === 2 &&
                    (profile.cidade_residencia?.trim() ?? '') !== '';
                
                const hasOneFormation = formacoesToSave.length > 0;

                if (hasPersonalInfo && hasResidenceInfo && hasOneFormation) {
                    isVerified = true;
                    Alert.alert("Parabéns!", "Sua conta foi verificada com sucesso!");
                }
            }

            const locaisCadastrados: LocalCadastrado[] = [];
            
            if (profile.cep_residencia && profile.cep_residencia.replace(/\D/g, '').length === 8) {
                const localResidencia = await geocodeCEP(profile.cep_residencia, 'Residencia');
                if (localResidencia) {
                    locaisCadastrados.push(localResidencia);
                } else {
                    Alert.alert("Aviso", "Não foi possível geocodificar o CEP de Residência. O marcador de Casa não aparecerá no mapa. Verifique o CEP.");
                }
            }

            if (profile.cep_trabalho && profile.cep_trabalho.replace(/\D/g, '').length === 8) {
                const localTrabalho = await geocodeCEP(profile.cep_trabalho, 'Trabalho');
                if (localTrabalho) {
                    locaisCadastrados.push(localTrabalho);
                } else {
                    Alert.alert("Aviso", "Não foi possível geocodificar o CEP de Trabalho. O marcador de Trabalho não aparecerá no mapa. Verifique o CEP.");
                }
            }

            const payload = {
                id: user.id,
                full_name: profile.full_name || '',
                email: profile.email || user.email,
                cpf: cleanCPF,
                data_nascimento: formattedDate,
                telefone: cleanPhone,
                linkedin: profile.linkedin || '',
                cep_residencia: profile.cep_residencia ? profile.cep_residencia.replace(/\D/g, '') : '',
                pais_residencia: profile.pais_residencia || '',
                uf_residencia: profile.uf_residencia || '',
                cidade_residencia: profile.cidade_residencia || '',
                cep_trabalho: profile.cep_trabalho ? profile.cep_trabalho.replace(/\D/g, '') : '',
                cnpj: cleanCNPJ,
                atuacao: profile.atuacao || '',
                tipo_trabalho: profile.tipo_trabalho || '',
                empresa: profile.empresa || '',
                cargo: profile.cargo || '',
                tempo_empresa: profile.tempo_empresa || '',
                conta_verificada: isVerified,
                formacao_academica: formacoesToSave,
                locais_cadastrados: locaisCadastrados, 
            };

            const { error } = await supabase.from("usuarios").upsert(payload as any);

            if (error) {
                console.error("Erro ao salvar:", error);
                Alert.alert("Erro", "Não foi possível salvar seus dados. Tente novamente.");
                return;
            }

            Alert.alert("Sucesso", "Dados salvos com sucesso!");
            await loadProfile();

        } catch (err) {
            console.error("Erro inesperado durante salvamento:", err);
            Alert.alert("Erro", "Ocorreu um erro inesperado ao salvar.");
        } finally {
            setSaving(false);
        }
    };
    
    const handleSignOut = async () => {
        Alert.alert(
            "Sair da Conta",
            "Tem certeza que deseja deslogar do sistema?",
            [
                {
                    text: "Cancelar",
                    style: "cancel"
                },
                {
                    text: "Sair",
                    onPress: async () => {
                        try {
                            const { error } = await supabase.auth.signOut();
                            if (error) {
                                throw error;
                            }
                        } catch (error) {
                            console.error("Erro ao deslogar:", error);
                            Alert.alert("Erro ao Sair", "Não foi possível deslogar. Verifique sua conexão.");
                        }
                    },
                    style: "destructive"
                }
            ]
        );
    };
    
    const CourseSelectionModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isCourseModalVisible}
            onRequestClose={() => setIsCourseModalVisible(false)}
        >
            <TouchableWithoutFeedback onPress={() => setIsCourseModalVisible(false)}>
                <View style={localStyles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={() => {}}>
                        <View style={localStyles.modalContent}>
                            <Text style={localStyles.modalTitle}>Selecione um dos Cursos Fixos</Text>
                            
                            <ScrollView style={{ maxHeight: 300 }}>
                                {CURSOS_FIXOS.map((curso) => (
                                    <TouchableOpacity
                                        key={curso}
                                        style={localStyles.modalOption}
                                        onPress={() => selectFixedCourse(curso)}
                                    >
                                        <Text style={localStyles.modalOptionText}>{curso}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            
                            <TouchableOpacity
                                style={localStyles.modalCloseButton}
                                onPress={() => setIsCourseModalVisible(false)}
                            >
                                <Text style={localStyles.modalCloseButtonText}>Fechar</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    if (loading) {
        return (
            <View style={styles.loadingView}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={{ marginTop: 10, color: '#4b5563' }}>Carregando seu perfil...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.title}>Configurações de Perfil</Text>

            <Text style={localStyles.sectionHeader}>Informações Pessoais</Text>
            <View style={localStyles.sectionBox}>
                <Text style={styles.label}>Nome completo</Text>
                <TextInput
                    style={styles.input}
                    value={profile.full_name || ""}
                    onChangeText={(v) => handleChange("full_name", v)}
                    placeholder="Seu nome completo"
                />
                
                <Text style={styles.label}>Status da Conta</Text>
                <View style={[localStyles.statusBox, { 
                    backgroundColor: profile.conta_verificada ? '#f0fdf4' : '#f0f9ff', 
                    borderColor: profile.conta_verificada ? '#4ade80' : '#bae6fd' 
                }]}>
                    <Text style={[localStyles.statusText, { color: profile.conta_verificada ? '#16a34a' : '#0369a1' }]}>
                        Conta: {profile.conta_verificada ? 'Verificada ' : 'Não Verificada '}
                    </Text>
                    {!profile.conta_verificada && (
                        <Text style={localStyles.verificationHint}>
                            Preencha todas as informações pessoais, residência e pelo menos 1 formação para verificar a conta.
                        </Text>
                    )}
                </View>

                <Text style={styles.label}>CPF</Text>
                <TextInput
                    style={styles.input}
                    value={maskCPF(profile.cpf || "")}
                    onChangeText={(v) => handleChange("cpf", v)}
                    placeholder="000.000.000-00"
                    keyboardType="numeric"
                />

                <Text style={styles.label}>Data de Nascimento</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
                    <Text style={profile.data_nascimento ? localStyles.dateTextFilled : localStyles.dateTextPlaceholder}>
                        {profile.data_nascimento || "Selecionar data de nascimento"}
                    </Text>
                </TouchableOpacity>

                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        display="default"
                        mode="date"
                        onChange={onDateChange}
                    />
                )}
                
                <Text style={styles.label}>Número de Telefone</Text>
                <TextInput
                    style={styles.input}
                    value={maskPhone(profile.telefone || "")}
                    onChangeText={(v) => handleChange("telefone", v)}
                    placeholder="(XX) XXXXX-XXXX"
                    keyboardType="phone-pad"
                />

                <Text style={styles.label}>LinkedIn (URL)</Text>
                <TextInput
                    style={styles.input}
                    value={profile.linkedin || ""}
                    onChangeText={(v) => handleChange("linkedin", v)}
                    placeholder="URL do seu perfil no LinkedIn"
                />
            </View>
            
            <Text style={localStyles.sectionHeader}>Localização e Ocupação</Text>
            <View style={localStyles.tabContainer}>
                <TouchableOpacity 
                    style={[localStyles.tabButton, activeTab === 'residencia' && localStyles.tabButtonActive]}
                    onPress={() => setActiveTab('residencia')}
                >
                    <Feather name="home" size={16} color={activeTab === 'residencia' ? '#2563eb' : '#64748b'} />
                    <Text style={[localStyles.tabText, activeTab === 'residencia' && localStyles.tabTextActive]}>Residência</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[localStyles.tabButton, activeTab === 'trabalho' && localStyles.tabButtonActive]}
                    onPress={() => setActiveTab('trabalho')}
                >
                    <Feather name="briefcase" size={16} color={activeTab === 'trabalho' ? '#2563eb' : '#64748b'} />
                    <Text style={[localStyles.tabText, activeTab === 'trabalho' && localStyles.tabTextActive]}>Trabalho</Text>
                </TouchableOpacity>
            </View>

            <View style={localStyles.tabContentBox}>
                {activeTab === 'residencia' ? 
                    <LocalResidenciaTab 
                        key="residencia_tab" 
                        profile={profile} 
                        handleChange={handleChange} 
                    /> 
                    : 
                    <LocalTrabalhoTab 
                        key="trabalho_tab" 
                        profile={profile} 
                        handleChange={handleChange} 
                        activeTab={activeTab}
                    />
                }
            </View>
            
            <Text style={[localStyles.sectionHeader, { marginTop: 20 }]}>Formação Acadêmica</Text>
            {FORMACAO_TITLES.map((title, index) => (
                <View key={index} style={styles.formacaoBox}>
                    <Text style={styles.formacaoTitle}>Formação {index + 1}: {title}</Text>

                    <Text style={styles.label}>Instituição</Text>
                    <TextInput
                        style={[styles.input, { marginBottom: 10 }]}
                        value={formacoes[index].instituicao}
                        onChangeText={(v) => handleFormacaoChange(index, "instituicao", v)}
                        placeholder="Nome da Instituição (Ex: IFAL)"
                    />
                    
                    <Text style={styles.label}>Curso </Text>
                    <TouchableOpacity 
                        style={styles.input}
                        onPress={() => openCourseModal(index)}
                    >
                        <Text style={formacoes[index].curso ? localStyles.dateTextFilled : localStyles.dateTextPlaceholder}>
                            {formacoes[index].curso || "Selecionar Curso"}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Período</Text>
                    <TextInput
                        style={styles.input}
                        value={formacoes[index].periodo}
                        onChangeText={(v) => handleFormacaoChange(index, "periodo", v)}
                        placeholder="Período (Ex: 2018 - 2022)"
                    />
                </View>
            ))}

            <TouchableOpacity
                style={[styles.saveBtn, { opacity: saving ? 0.6 : 1 }]}
                onPress={handleSave}
                disabled={saving}
            >
                {saving ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.saveText}>Salvar Configurações</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.signOutBtn}
                onPress={handleSignOut}
            >
                <Feather name="log-out" size={20} color="#dc2626" />
                <Text style={styles.signOutText}>Sair da Conta</Text>
            </TouchableOpacity>
            
            <CourseSelectionModal />

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 18, backgroundColor: '#f9f9f9' },
    loadingView: { flex: 1, justifyContent: "center", alignItems: "center" },

    title: { fontSize: 26, fontWeight: "700", marginBottom: 20, color: '#1f2937' },

    label: { fontWeight: "600", marginTop: 12, marginBottom: 4, color: '#374151' },

    input: {
        padding: 12,
        borderWidth: 1,
        borderColor: "#d1d5db",
        borderRadius: 10,
        backgroundColor: "#fff",
        color: '#1f2937',
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
    saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },


    formacaoBox: {
        marginTop: 10,
        padding: 15,
        backgroundColor: "#fff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb'
    },
    formacaoTitle: { fontWeight: "800", marginBottom: 8, color: '#1f2937' },
    
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        marginTop: 10,
        marginBottom: 40,
        backgroundColor: '#fee2e2',
        borderColor: '#fca5a5',
        borderWidth: 1,
    },
    signOutText: {
        color: "#dc2626",
        fontWeight: "700",
        fontSize: 16,
        marginLeft: 10
    }
});

const localStyles = StyleSheet.create({
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
        marginTop: 25,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#2563eb',
        paddingLeft: 8,
    },
    sectionBox: {
        padding: 15,
        backgroundColor: "#fff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    statusBox: {
        padding: 10,
      
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 5,
        marginBottom: 10, 
    },
    statusText: {
        fontWeight: '700',
    },
    verificationHint: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 5,
    },

    dateTextFilled: {
        color: '#1f2937', 
        fontSize: 15,
    },
    dateTextPlaceholder: {
        color: '#9ca3af', 
        fontSize: 15,
    },

    tabContainer: {
        flexDirection: 'row',
        marginBottom: 10,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
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
        backgroundColor: '#f0f4ff', 
        borderRadius: 8,
    },
    tabText: {
        marginLeft: 5,
        fontSize: 15,
        fontWeight: '600',
        color: '#64748b',
    },
    tabTextActive: {
        color: '#2563eb',
    },
    tabContentBox: {
        padding: 15,
        backgroundColor: "#fff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    tabContent: {
      
    },

    selectContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        padding: 5,
        marginTop: 5,
        marginBottom: 15,
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
        color: '#4b5563',
        fontWeight: '600',
    },
    selectTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
   
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#1f2937',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingBottom: 10,
    },
    modalOption: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    modalOptionText: {
        fontSize: 16,
        color: '#374151',
    },
    modalCloseButton: {
        marginTop: 15,
        padding: 12,
        backgroundColor: '#e5e7eb',
        borderRadius: 10,
        alignItems: 'center',
    },
    modalCloseButtonText: {
        color: '#374151',
        fontWeight: '700',
    }
});