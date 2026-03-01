import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
    View, Text, ScrollView, TouchableOpacity, StyleSheet, 
    ActivityIndicator, Modal, Pressable, Dimensions, FlatList, Alert, TextInput
} from "react-native";
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { supabase } from "../config/supabase";

const { width } = Dimensions.get('window');

interface UserData {
    id: string;
    email: string | undefined;
    full_name?: string;
    flag?: number | null;
    locais_cadastrados: LocalItem[];
}

interface DashboardStats {
    totalUsers: number;
    totalLocations: number;
    myLocals: number;
}

interface LocalItem {
    id: string;
    nome_local: string;
    timestamp_cadastro: string;
    [key: string]: any; 
}

type ActiveTab = 'dashboard' | 'myLocals';

export default function HomeScreen() {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const [user, setUser] = useState<UserData | null>(null);
    const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
        totalUsers: 0,
        totalLocations: 0,
        myLocals: 0
    });
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [loading, setLoading] = useState<boolean>(true);
    const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (!authUser) {
                setUser(null);
                setLoading(false);
                return;
            }

            const { data: profileData, error: profileError } = await supabase
                .from('usuarios')
                .select('full_name, locais_cadastrados, flag')
                .eq('id', authUser.id)
                .single();

            if (profileError) throw profileError;
            
            const rawLocals = (profileData?.locais_cadastrados || []) as any[];
            const formattedLocals: LocalItem[] = rawLocals.map((local, index) => ({
                id: `${authUser.id}-${local.nome_local}-${index}-${local.timestamp_cadastro}`, 
                ...local
            })).sort((a, b) => new Date(b.timestamp_cadastro).getTime() - new Date(a.timestamp_cadastro).getTime());

            setUser({
                id: authUser.id,
                email: authUser.email,
                full_name: profileData?.full_name || authUser.user_metadata?.full_name,
                flag: profileData?.flag ?? null,
                locais_cadastrados: formattedLocals,
            });

            const { count: usersCount } = await supabase
                .from('usuarios')
                .select('*', { count: 'exact', head: true });

            // Aggregate total number of locais cadastrados across all users
            const { data: allProfiles } = await supabase
                .from('usuarios')
                .select('locais_cadastrados');

            let totalLocais = 0;
            (allProfiles || []).forEach((u: any) => {
                let locais: any = u.locais_cadastrados || [];
                if (typeof locais === 'string') {
                    try { locais = JSON.parse(locais); } catch { locais = []; }
                }
                if (Array.isArray(locais)) totalLocais += locais.length;
            });

            setDashboardStats({
                totalUsers: usersCount || 0,
                totalLocations: totalLocais,
                myLocals: formattedLocals.length,
            });
            
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDeleteLocal = async (localToDelete: LocalItem) => {
        if (!user) return;
        Alert.alert("Confirmar Exclusão", `Deletar "${localToDelete.nome_local}"?`, [
            { text: "Cancelar", style: "cancel" },
            { 
                text: "Deletar", 
                style: "destructive", 
                onPress: async () => {
                    try {
                        setLoading(true);
                        const { data: currentProfile } = await supabase.from('usuarios').select('locais_cadastrados').eq('id', user.id).single();
                        const updatedLocals = (currentProfile?.locais_cadastrados || []).filter((local: any) => 
                            local.nome_local !== localToDelete.nome_local || local.timestamp_cadastro !== localToDelete.timestamp_cadastro
                        );
                        await supabase.from('usuarios').update({ locais_cadastrados: updatedLocals }).eq('id', user.id);
                        loadData();
                    } catch (error) {
                        Alert.alert("Erro", "Falha ao excluir.");
                    } finally {
                        setLoading(false);
                    }
                }
            }
        ]);
    };

    useEffect(() => { if (isFocused) loadData(); }, [isFocused, loadData]);

    const displayName = useMemo(() => {
        if (loading) return '...';
        if (!user) return 'Visitante';
        return user.full_name ? user.full_name.split(' ')[0] : (user.email ? user.email.split('@')[0] : 'Usuário');
    }, [user, loading]);

    const greetingPrefix = useMemo(() => {
        const hour = currentTime.getHours();
        if (hour >= 5 && hour < 12) return 'Bom dia';
        if (hour >= 12 && hour < 18) return 'Boa tarde';
        return 'Boa noite';
    }, [currentTime]);

    const renderLocalItem = ({ item }: { item: LocalItem }) => (
        <View style={styles.localCard}>
            <View style={styles.localHeaderRow}>
                <Feather name="map-pin" size={18} color="#3b82f6" />
                <Text style={styles.localTitle}>{item.nome_local}</Text>
            </View>
            <Text style={styles.localTimestamp}>
                {new Date(item.timestamp_cadastro).toLocaleDateString('pt-BR')}
            </Text>
            <View style={styles.actionContainer}>
                <TouchableOpacity style={styles.actionButtonDelete} onPress={() => handleDeleteLocal(item)}>
                    <Feather name="trash-2" size={14} color="#ef4444" />
                    <Text style={styles.actionTextDelete}>Excluir</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const MyLocalsTab = () => (
        <View style={styles.tabContentOuter}>
             <View style={styles.tabHeaderWithBack}>
                <TouchableOpacity onPress={() => setActiveTab('dashboard')} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#f8fafc" />
                </TouchableOpacity>
                <Text style={styles.sectionTitleNoMargin}>Meus Locais</Text>
            </View>
            <FlatList
                data={user?.locais_cadastrados || []}
                renderItem={renderLocalItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                ListEmptyComponent={() => <Text style={styles.emptyText}>Nenhum local cadastrado.</Text>}
            />
        </View>
    );

    const DashboardTab = () => (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}>
            {/* Seção de Estatísticas */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Visão Geral</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#064e3b' }]}><Feather name="users" size={20} color="#10b981" /></View>
                        <Text style={styles.statValue}>{dashboardStats.totalUsers}</Text>
                        <Text style={styles.statLabel}>Usuários</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#065f46' }]}><Feather name="map-pin" size={20} color="#10b981" /></View>
                        <Text style={styles.statValue}>{dashboardStats.totalLocations}</Text>
                        <Text style={styles.statLabel}>Locais</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#7f1d1d' }]}><Feather name="bookmark" size={20} color="#ef4444" /></View>
                        <Text style={styles.statValue}>{dashboardStats.myLocals}</Text>
                        <Text style={styles.statLabel}>Meus Locais</Text>
                    </View>
                </View>
            </View>

            {/* Nova Seção de Avisos/Atualizações */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Novidades & Atualizações</Text>
                <View style={styles.announcementCard}>
                    <View style={styles.announcementHeader}>
                        <Text style= {styles.announcementDate}> Atualizações</Text>
                        <Text style={styles.announcementDate}>Hoje</Text>
                    </View>
                    <Text style={styles.announcementText}>
                     Olá, pessoal! Fiz a correção de alguns bugs referente ao cadastro, e o mapa tá 100% funcional. Explorem sem medo, faça coisas "nada a ver" em campos. Ex: Texto onde devia ter numeros. Quero deixar esse app 100% funcional.
                    </Text>
                </View>
            </View>
        </ScrollView>
    );

    return (
        <View style={styles.mainContainer}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greetingText}>{greetingPrefix},</Text>
                    <Text style={styles.userNameText}>{displayName}</Text>
                </View>
                {/* Calendário Ajustado */}
                <View style={styles.dateBadge}>
                    <Feather name="calendar" size={14} color="#3b82f6" style={{ marginRight: 6 }} />
                    <Text style={styles.dateText}>
                        {currentTime.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}
                    </Text>
                </View>
            </View>
            
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tabButton, activeTab === 'dashboard' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('dashboard')}
                >
                    <Feather name="bar-chart-2" size={16} color={activeTab === 'dashboard' ? '#3b82f6' : '#64748b'} />
                    <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>Dashboard</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'dashboard' ? <DashboardTab /> : <MyLocalsTab />}
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#0f172a' },
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b' },
    greetingText: { fontSize: 14, color: '#94a3b8' },
    userNameText: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
    

    dateBadge: { 
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#334155', 
        paddingHorizontal: 14, 
        paddingVertical: 10, 
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#475569'
    },
    dateText: { fontSize: 14, color: '#f8fafc', fontWeight: 'bold' },

    tabContainer: { flexDirection: 'row', backgroundColor: '#1e293b', paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#334155' },
    tabButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: 'transparent' },
    tabButtonActive: { borderBottomColor: '#3b82f6' },
    tabText: { fontSize: 15, marginLeft: 8, color: '#64748b' },
    tabTextActive: { color: '#3b82f6', fontWeight: 'bold' },
    tabContentOuter: { flex: 1 },
    tabHeaderWithBack: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, marginBottom: 16 },
    backButton: { marginRight: 16 },
    
    section: { paddingHorizontal: 24, marginTop: 24 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#f1f5f9', marginBottom: 16 },
    sectionTitleNoMargin: { fontSize: 18, fontWeight: 'bold', color: '#f1f5f9' },
    
    statsRow: { flexDirection: 'row', gap: 12 },
    statCard: { flex: 1, backgroundColor: '#1e293b', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    statIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    statValue: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
    statLabel: { fontSize: 11, color: '#94a3b8' },

    
    announcementCard: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
    announcementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    announcementDate: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
    primaryButton: { backgroundColor: '#3b82f6', padding: 12, borderRadius: 10, alignItems: 'center' },
    primaryButtonText: { color: '#fff', fontWeight: '700' },

    announcementText: { fontSize: 14, color: '#cbd5e1', lineHeight: 22 },

    localCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
    localHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    localTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
    localTimestamp: { fontSize: 12, color: '#94a3b8', marginVertical: 8 },
    actionContainer: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 12, alignItems: 'flex-end' },
    actionButtonDelete: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 },
    actionTextDelete: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
    emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 40 }
});