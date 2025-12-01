import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
    View, Text, ScrollView, TouchableOpacity, StyleSheet, 
    ActivityIndicator, Modal, Pressable, Dimensions, FlatList, Alert 
} from "react-native";
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { supabase } from "../config/supabase";

const { width } = Dimensions.get('window');

interface UserData {
    id: string;
    email: string | undefined;
    full_name?: string;
    locais_cadastrados: LocalItem[];
}

interface DashboardStats {
    totalUsers: number;
    onlineUsers: number;
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
        onlineUsers: 0, 
        myLocals: 0
    });
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [loading, setLoading] = useState<boolean>(true);
    const [modalVisible, setModalVisible] = useState(false);
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
                .select('full_name, locais_cadastrados')
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
                locais_cadastrados: formattedLocals,
            });

            const { count: usersCount } = await supabase
                .from('usuarios')
                .select('*', { count: 'exact', head: true });

            const totalUsers = usersCount || 0;
            
            const onlineUsersSimulated = Math.ceil(totalUsers * 0.1); 
            const finalOnlineUsers = totalUsers > 0 ? Math.max(1, onlineUsersSimulated) : 0; 

            setDashboardStats({
                totalUsers: totalUsers,
                onlineUsers: finalOnlineUsers,
                myLocals: formattedLocals.length,
            });
            
        } catch (err) {
            console.error("Error loading data:", err);
            Alert.alert("Erro", "Não foi possível carregar os dados do dashboard.");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDeleteLocal = async (localToDelete: LocalItem) => {
        if (!user || !user.id) return;

        Alert.alert(
            "Confirmar Exclusão",
            `Tem certeza que deseja deletar o local "${localToDelete.nome_local}"?`,
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Deletar", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            setLoading(true);

                            const { data: currentProfile, error: fetchError } = await supabase
                                .from('usuarios')
                                .select('locais_cadastrados')
                                .eq('id', user.id)
                                .single();

                            if (fetchError) throw fetchError;

                            const currentLocals = (currentProfile?.locais_cadastrados || []) as any[];

                            const updatedLocals = currentLocals.filter(local => 
                                local.nome_local !== localToDelete.nome_local || 
                                local.timestamp_cadastro !== localToDelete.timestamp_cadastro
                            );

                            const { error: updateError } = await supabase
                                .from('usuarios')
                                .update({ locais_cadastrados: updatedLocals })
                                .eq('id', user.id);

                            if (updateError) throw updateError;
                            
                            Alert.alert("Sucesso", "Local excluído com sucesso!");
                            loadData();

                        } catch (error) {
                            console.error("Erro ao deletar local:", error);
                            Alert.alert("Erro", "Falha ao excluir local. Tente novamente.");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleEditLocal = (localToEdit: LocalItem) => {
        navigation.navigate('RegisterLocalStack', { 
            screen: 'RegisterLocalScreen', 
            params: { localData: localToEdit } 
        } as never);
    };

    useEffect(() => {
        if (isFocused) {
            loadData();
        }
    }, [isFocused, loadData]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const displayName = useMemo(() => {
        if (loading) return '...';
        if (!user) return 'Visitante';
        
        if (user.full_name && user.full_name.trim() !== '') {
            return user.full_name.split(' ')[0];
        }
        
        if (user.email) {
            return user.email.split('@')[0];
        }
        return 'Usuário';
    }, [user, loading]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Bom dia";
        if (hour < 18) return "Boa tarde";
        return "Boa noite";
    };

    const renderLocalItem = ({ item }: { item: LocalItem }) => (
        <View style={localStyles.localCard}>
            <View style={localStyles.localHeader}>
                <Feather name="map-pin" size={18} color="#2563eb" />
                <Text style={localStyles.localTitle}>{item.nome_local}</Text>
            </View>
            <Text style={localStyles.localTimestamp}>
                Cadastrado em: {new Date(item.timestamp_cadastro).toLocaleDateString('pt-BR')} 
                {' '}às {new Date(item.timestamp_cadastro).toLocaleTimeString('pt-BR')}
            </Text>
            
            <View style={localStyles.actionContainer}>
                <TouchableOpacity 
                    style={localStyles.actionButtonEdit}
                    onPress={() => handleEditLocal(item)}
                    disabled={loading}
                >
                    <Feather name="edit-3" size={16} color="#3b82f6" />
                    <Text style={localStyles.actionTextEdit}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={localStyles.actionButtonDelete}
                    onPress={() => handleDeleteLocal(item)}
                    disabled={loading}
                >
                    <Feather name="trash-2" size={16} color="#ef4444" />
                    <Text style={localStyles.actionTextDelete}>Excluir</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const MyLocalsTab = () => (
        <View style={localStyles.tabContentOuter}>
            {loading ? (
                <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }}/>
            ) : (
                <>
                    {user && user.locais_cadastrados.length > 0 ? (
                        <FlatList
                            data={user.locais_cadastrados}
                            renderItem={renderLocalItem}
                            keyExtractor={item => item.id}
                            style={{ flex: 1, width: '100%' }}
                            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                            ListHeaderComponent={() => (
                                <Text style={styles.sectionTitle}>Meus Locais ({user?.locais_cadastrados?.length || 0})</Text>
                            )}
                            ListHeaderComponentStyle={{ paddingHorizontal: 0, marginTop: 20, marginBottom: 8 }}
                        />
                    ) : (
                        <View style={localStyles.emptyContainer}>
                            <Feather name="slash" size={48} color="#94a3b8" />
                            <Text style={localStyles.emptyText}>Você ainda não cadastrou nenhum local.</Text>
                        </View>
                    )}
                </>
            )}
        </View>
    );

    const DashboardTab = () => (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Visão Geral</Text>
                <View style={styles.statsRow}>
                    
                    <View style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#dcfce7' }]}>
                            <Feather name="users" size={20} color="#15803d" />
                        </View>
                        {loading ? <ActivityIndicator size="small" color="#15803d" /> : <Text style={styles.statValue}>{dashboardStats.totalUsers}</Text>}
                        <Text style={styles.statLabel}>Cadastrados</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#e0e7ff' }]}>
                            <Feather name="activity" size={20} color="#4338ca" />
                        </View>
                        {loading ? <ActivityIndicator size="small" color="#4338ca" /> : <Text style={styles.statValue}>{dashboardStats.onlineUsers}</Text>}
                        <Text style={styles.statLabel}>Usuários Online</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#fee2e2' }]}>
                            <Feather name="bookmark" size={20} color="#b91c1c" />
                        </View>
                        {loading ? <ActivityIndicator size="small" color="#b91c1c" /> : <Text style={styles.statValue}>{dashboardStats.myLocals}</Text>}
                        <Text style={styles.statLabel}>Meus Locais</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recursos da Plataforma</Text>
                
                <View style={styles.featureRow}>
                    <View style={styles.featureCard}>
                        <Feather name="shield" size={24} color="#2563eb" style={{ marginBottom: 12 }} />
                        <Text style={styles.featureTitle}>Segurança</Text>
                        <Text style={styles.featureDesc}>Dados criptografados e protegidos.</Text>
                    </View>
                    <View style={styles.featureCard}>
                        <Feather name="smartphone" size={24} color="#2563eb" style={{ marginBottom: 12 }} />
                        <Text style={styles.featureTitle}>Mobile</Text>
                        <Text style={styles.featureDesc}>Acesso total via smartphone.</Text>
                    </View>
                </View>
            </View>

            <View style={styles.footer}>
                <Feather name="box" size={24} color="#cbd5e1" />
                <Text style={styles.footerText}>Versão 1.0.2</Text>
            </View>
        </ScrollView>
    );

    return (
        <View style={styles.mainContainer}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greetingText}>{getGreeting()},</Text>
                    <Text style={styles.userNameText}>{displayName}</Text>
                </View>
                <View style={styles.dateBadge}>
                    <Feather name="calendar" size={14} color="#64748b" />
                    <Text style={styles.dateText}>
                        {currentTime.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                    </Text>
                </View>
            </View>
            
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tabButton, activeTab === 'dashboard' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('dashboard')}
                >
                    <Feather name="bar-chart-2" size={16} color={activeTab === 'dashboard' ? '#2563eb' : '#64748b'} />
                    <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>Dashboard</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tabButton, activeTab === 'myLocals' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('myLocals')}
                >
                    <Feather name="list" size={16} color={activeTab === 'myLocals' ? '#2563eb' : '#64748b'} />
                    <Text style={[styles.tabText, activeTab === 'myLocals' && styles.tabTextActive]}>Meus Locais</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'dashboard' ? <DashboardTab /> : <MyLocalsTab />}

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalView}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Sobre a Plataforma</Text>
                            <Pressable onPress={() => setModalVisible(false)}>
                                <Feather name="x" size={24} color="#64748b" />
                            </Pressable>
                        </View>
                        <ScrollView style={styles.modalScroll}>
                            <Text style={styles.modalText}>
                                Esta é uma plataforma de geolocalização e mapeamento de pontos de interesse, alimentada por Supabase e React Native.
                            </Text>
                            <Text style={styles.modalText}>
                                Ela permite o cadastro e o gerenciamento descentralizado de locais por todos os usuários ativos, contribuindo para a base de dados em tempo real.
                            </Text>
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.modalButtonText}>Entendi</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
    },
    greetingText: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
    userNameText: {
        fontSize: 24,
        color: '#0f172a',
        fontWeight: 'bold',
    },
    dateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    dateText: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingHorizontal: 24,
        paddingBottom: 0,
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginRight: 16,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabButtonActive: {
        borderBottomColor: '#2563eb',
    },
    tabText: {
        fontSize: 16,
        marginLeft: 8,
        color: '#64748b',
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#2563eb',
        fontWeight: 'bold',
    },
    section: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 16,
        paddingHorizontal: 0, 
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: '#64748b',
        textAlign: 'center',
    },
    featureRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    featureCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 4,
    },
    featureDesc: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18,
    },
    footer: {
        alignItems: 'center',
        paddingTop: 30,
        paddingBottom: 40,
        opacity: 0.5,
    },
    footerText: {
        marginTop: 8,
        fontSize: 12,
        color: '#64748b',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalView: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxHeight: '70%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    modalScroll: {
        marginBottom: 20,
    },
    modalText: {
        fontSize: 16,
        color: '#475569',
        lineHeight: 24,
        marginBottom: 16,
    },
    modalButton: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    modalButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

const localStyles = StyleSheet.create({
    tabContentOuter: {
        flex: 1,
    },
    localCard: {
        backgroundColor: '#fff',
        width: '100%',
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        borderLeftWidth: 5,
        borderLeftColor: '#2563eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    localHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 10,
    },
    localTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    localTimestamp: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 15,
        paddingLeft: 28, 
    },
    actionContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 10,
    },
    actionButtonEdit: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#eff6ff',
    },
    actionTextEdit: {
        color: '#3b82f6',
        fontWeight: '600',
        marginLeft: 4,
    },
    actionButtonDelete: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#fee2e2',
    },
    actionTextDelete: {
        color: '#ef4444',
        fontWeight: '600',
        marginLeft: 4,
    },
    emptyContainer: {
        flex: 1,
        width: width - 48,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
        backgroundColor: '#f1f5f9',
        marginHorizontal: 24,
        marginTop: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 5,
    },
});