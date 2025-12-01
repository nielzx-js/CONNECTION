import React, { useState, useEffect, useCallback } from 'react';
import { 
    StyleSheet, View, Text, ScrollView, Dimensions, FlatList, ActivityIndicator, RefreshControl, Alert 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit'; 
import { supabase } from '../config/supabase';

const screenWidth = Dimensions.get('window').width;

const CHART_COLORS = ['#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];

interface ItemCount {
    name: string;
    count: number;
    color?: string;
}

interface UserProfileWithLocals {
    id: string;
    cargo: string | null;
    created_at: string;
    cnpj: string | null;
    superior_instituicao: string | null;
    locais_cadastrados: {
        timestamp_cadastro?: string; 
        nome_local: string;
        tipo_local: 'residencia' | 'trabalho' | 'outro'; 
    }[];
}

export default function StatsScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [kpiData, setKpiData] = useState({
        totalUsers: 0,
        onlineUsers: 0, 
        totalLocations: 0,
        totalResidencias: 0, 
        totalTrabalho: 0, 
        totalInstitutions: 0, 
        taxaAtividade: '0.0',
    });
    
    const [growthData, setGrowthData] = useState<any>(null);
    const [topInstitutions, setTopInstitutions] = useState<ItemCount[]>([]);
    const [topCompanies, setTopCompanies] = useState<ItemCount[]>([]);

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            
            const { data: { user } } = await supabase.auth.getUser();
            const myId = user?.id;

            const { data: usersWithLocals, error: errUsers } = await supabase
                .from('usuarios')
                .select('id, cargo, created_at, cnpj, superior_instituicao, locais_cadastrados'); 
            
            if (errUsers) throw errUsers;

            const allUsers = usersWithLocals as UserProfileWithLocals[];
            const totalUsers = allUsers.length;

            let allLocais: { created_at: string; tipo: 'residencia' | 'trabalho'; user_id: string }[] = [];
            
            const companyCounts: Record<string, number> = {};
            const institutionCounts: Record<string, number> = {};
            let totalResidencias = 0;
            let totalTrabalho = 0;

            allUsers.forEach(u => {
                const locais = (u.locais_cadastrados || []) as any[];
                
                const companyIdentifier = u.cnpj ? u.cnpj.trim() : 'CNPJ Não Informado';
                companyCounts[companyIdentifier] = (companyCounts[companyIdentifier] || 0) + 1;
                
                const institution = u.superior_instituicao || 'Instituição Não Informada';
                institutionCounts[institution] = (institutionCounts[institution] || 0) + 1;

                locais.forEach(local => {
                    const tipo = local.tipo_local || (local.nome_local.toLowerCase().includes('residencia') ? 'residencia' : 'trabalho');
                    if (tipo === 'residencia') {
                        totalResidencias++;
                    } else if (tipo === 'trabalho') {
                        totalTrabalho++;
                    }

                    allLocais.push({
                        created_at: local.timestamp_cadastro || u.created_at, 
                        tipo: tipo as 'residencia' | 'trabalho', 
                        user_id: u.id
                    });
                });
            });

            const totalLocais = allLocais.length;
            
            const uniqueInstitutions = Object.keys(institutionCounts).filter(n => n !== 'Instituição Não Informada');
            const totalInstitutions = uniqueInstitutions.length;
            
            const taxaAtividade = totalUsers > 0 ? (totalLocais / totalUsers).toFixed(1) : '0.0';
            const onlineUsers = 3;

            setKpiData({
                totalUsers: totalUsers,
                onlineUsers: onlineUsers,
                totalLocations: totalLocais,
                totalResidencias: totalResidencias,
                totalTrabalho: totalTrabalho,
                totalInstitutions: totalInstitutions,
                taxaAtividade: taxaAtividade,
            });

            const formattedTopInstitutions = uniqueInstitutions
                .map(name => ({ name: name.substring(0, 30), count: institutionCounts[name] }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map((item, index) => ({...item, color: CHART_COLORS[index % CHART_COLORS.length]}));
            setTopInstitutions(formattedTopInstitutions);

            const formattedTopCompanies = Object.keys(companyCounts)
                .filter(cnpj => cnpj !== 'CNPJ Não Informado')
                .map(cnpj => ({ name: cnpj.substring(0, 8) + '... (CNPJ)', count: companyCounts[cnpj] }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map((item, index) => ({...item, color: CHART_COLORS[index % CHART_COLORS.length]}));
            setTopCompanies(formattedTopCompanies);

            const months: Record<string, number> = {};
            const monthLabels: string[] = [];
            const monthValues: number[] = [];
            
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const key = d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(); 
                months[key] = 0;
                if (!monthLabels.includes(key)) monthLabels.push(key);
            }

            allLocais.forEach(l => {
                const date = new Date(l.created_at);
                const key = date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
                if (months[key] !== undefined) {
                    months[key]++;
                }
            });

            monthLabels.forEach(label => monthValues.push(months[label]));

            setGrowthData({
                labels: monthLabels,
                datasets: [{
                    data: monthValues.length > 0 ? monthValues : [0],
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    strokeWidth: 2,
                }],
                legend: ['Novos Registros']
            });

        } catch (error) {
            console.error("Erro ao buscar estatísticas:", error);
            Alert.alert("Erro de API/DB", `Não foi possível carregar os dados. Detalhe: ${error.message}`); 
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    const renderKpiCard = (title: string, value: string | number, icon: string, color: string) => (
        <View style={styles.kpiCard} key={title}>
            <Feather name={icon as any} size={24} color={color} />
            <Text style={styles.kpiValue}>{value}</Text>
            <Text style={styles.kpiTitle}>{title}</Text>
        </View>
    );
    
    const renderListItem = ({ item, index }: { item: ItemCount, index: number }) => (
        <View style={styles.listItem} key={item.name}>
            <Text style={[styles.listItemText, { fontWeight: 'bold', width: 20, color: item.color }]}>{index + 1}.</Text>
            <Text style={[styles.listItemText, { flex: 3 }]}>{item.name}</Text>
            <Text style={styles.listItemValue}>{item.count} usuários</Text>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
                <ActivityIndicator size="large" color="#2563eb"/>
                <Text style={{marginTop: 10, color: '#64748b'}}>Analisando dados...</Text>
            </View>
        )
    }

    return (
        <ScrollView 
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <Text style={styles.title}>Dashboard de Estatísticas 📈</Text>
                <Text style={styles.subtitle}>Visão geral da rede de egressos e instituições.</Text>
            </View>
            
            <View style={styles.kpiContainer}>
                {renderKpiCard('Total Usuários', kpiData.totalUsers, 'users', '#3b82f6')}
                {renderKpiCard('Usuários Online', kpiData.onlineUsers, 'zap', '#10b981')}
                
                {renderKpiCard('Locais Residência', kpiData.totalResidencias, 'home', '#8b5cf6')}
                {renderKpiCard('Locais Empresa', kpiData.totalTrabalho, 'briefcase', '#f97316')}
                
                {renderKpiCard('Total de Locais', kpiData.totalLocations, 'map-pin', '#ef4444')}
                {renderKpiCard('Total Instituições', kpiData.totalInstitutions, 'book-open', '#ec4899')}
            </View>
            
            <View style={{marginVertical: 10}}/>

            {growthData && (
                <View style={styles.chartCard}>
                    <Text style={styles.cardTitle}>Crescimento de Registro (Últimos 6 meses)</Text>
                    <LineChart
                        data={growthData}
                        width={screenWidth - 70} 
                        height={220}
                        chartConfig={chartConfig}
                        bezier
                        style={{ borderRadius: 12, paddingRight: 20 }}
                    />
                </View>
            )}
            
            <View style={{marginVertical: 10}}/>
            
            <View style={styles.chartCard}>
                <Text style={styles.cardTitle}>Top 5 Instituições (Superior)</Text>
                {topInstitutions.length > 0 ? (
                    <FlatList
                        data={topInstitutions}
                        renderItem={renderListItem}
                        keyExtractor={item => item.name}
                        scrollEnabled={false}
                        style={{ width: '100%', paddingHorizontal: 5 }}
                    />
                ) : (
                    <Text style={{padding: 20, color: '#64748b'}}>Dados de instituições insuficientes.</Text>
                )}
            </View>
            
            <View style={styles.chartCard}>
                <Text style={styles.cardTitle}>Top 5 Empresas/CNPJs</Text>
                {topCompanies.length > 0 ? (
                    <FlatList
                        data={topCompanies}
                        renderItem={renderListItem}
                        keyExtractor={item => item.name}
                        scrollEnabled={false}
                        style={{ width: '100%', paddingHorizontal: 5 }}
                    />
                ) : (
                    <Text style={{padding: 20, color: '#64748b'}}>Dados de empresas (CNPJ) insuficientes.</Text>
                )}
            </View>

            <View style={{height: 40}}/>
        </ScrollView>
    );
}

const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    propsForDots: {
        r: "4",
        strokeWidth: "2",
        stroke: "#2563eb"
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
        marginTop: 4,
    },
    kpiContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    kpiCard: {
        backgroundColor: '#ffffff',
        width: '48%',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
        alignItems: 'flex-start',
    },
    kpiValue: {
        fontSize: 20, 
        fontWeight: 'bold',
        color: '#0f172a',
        marginTop: 5,
    },
    kpiTitle: {
        fontSize: 12, 
        color: '#64748b',
        marginTop: 2,
        textAlign: 'left'
    },
    chartCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        width: '100%',
    },
    listItemText: {
        fontSize: 14,
        color: '#334155',
        flex: 1,
    },
    listItemValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
    }
});