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
    id: string;
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

        const { data, error } = await supabase
            .from('usuarios')
            .select(`
                id,
                cargo,
                created_at,
                cnpj,
                locais_cadastrados,
                formacao_academica
            `);

        if (error) throw error;

        const allUsers = data || [];
        const totalUsers = allUsers.length;

        let allLocais: { created_at: string; tipo: 'residencia' | 'trabalho'; user_id: string }[] = [];

        const companyCounts: Record<string, number> = {};
        const institutionCounts: Record<string, number> = {};

        let totalResidencias = 0;
        let totalTrabalho = 0;

        allUsers.forEach((u: any) => {

            // Empresas
            const companyIdentifier = u.cnpj ? u.cnpj.trim() : 'CNPJ Não Informado';
            companyCounts[companyIdentifier] = (companyCounts[companyIdentifier] || 0) + 1;

            // ===== INSTITUIÇÕES (leitura de formacao_academica) =====
            let formacoes = [];
            if (u.formacao_academica) {
                if (typeof u.formacao_academica === 'string') {
                    try {
                        formacoes = JSON.parse(u.formacao_academica);
                    } catch {
                        formacoes = [];
                    }
                } else if (Array.isArray(u.formacao_academica)) {
                    formacoes = u.formacao_academica;
                }
            }

            formacoes.forEach((f: any) => {
                if (f.instituicao && f.instituicao.trim()) {
                    const inst = f.instituicao.trim();
                    institutionCounts[inst] = (institutionCounts[inst] || 0) + 1;
                }
            });

            // ===== TRATAMENTO DO JSON =====
            let locais = [];

            if (u.locais_cadastrados) {
                // Se vier como string JSON
                if (typeof u.locais_cadastrados === 'string') {
                    try {
                        locais = JSON.parse(u.locais_cadastrados);
                    } catch {
                        locais = [];
                    }
                }
                // Se já vier como array (JSONB normal)
                else if (Array.isArray(u.locais_cadastrados)) {
                    locais = u.locais_cadastrados;
                }
            }

            locais.forEach((local: any) => {
                const tipo = local.tipo_local;

                if (tipo === 'Residencia') totalResidencias++;
                if (tipo === 'Trabalho') totalTrabalho++;

                allLocais.push({
                    created_at: local.timestamp_cadastro || u.created_at,
                    tipo,
                    user_id: u.id
                });
            });
        });

        const totalLocais = allLocais.length;

        const uniqueInstitutions = Object.keys(institutionCounts)
            .filter(n => n && n.trim() !== '');

        const totalInstitutions = uniqueInstitutions.length;

        const taxaAtividade =
            totalUsers > 0 ? (totalLocais / totalUsers).toFixed(1) : '0.0';

        setKpiData({
            totalUsers,
            totalLocations: totalLocais,
            totalResidencias,
            totalTrabalho,
            totalInstitutions,
            taxaAtividade,
        });

        // ===== TOP INSTITUIÇÕES =====
        const formattedTopInstitutions = uniqueInstitutions
            .map(name => ({
                name: name.substring(0, 30),
                count: institutionCounts[name],
                fullName: name
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map((item, index) => ({
                ...item,
                id: `inst-${index}-${item.fullName}`,
                color: CHART_COLORS[index % CHART_COLORS.length]
            }));

        setTopInstitutions(formattedTopInstitutions);

        // ===== TOP EMPRESAS =====
        const formattedTopCompanies = Object.keys(companyCounts)
            .filter(cnpj => cnpj && cnpj.trim() !== '' && cnpj !== 'CNPJ Não Informado')
            .map(cnpj => ({
                name: cnpj.substring(0, 8) + '...',
                count: companyCounts[cnpj],
                fullCNPJ: cnpj
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map((item, index) => ({
                ...item,
                id: `company-${index}-${item.fullCNPJ}`,
                color: CHART_COLORS[index % CHART_COLORS.length]
            }));

        setTopCompanies(formattedTopCompanies);

        // ===== CRESCIMENTO (6 meses) =====
        const months: Record<string, number> = {};
        const labels: string[] = [];
        const values: number[] = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
            months[key] = 0;
            labels.push(key);
        }

        allLocais.forEach(l => {
            const date = new Date(l.created_at);
            const key = date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
            if (months[key] !== undefined) {
                months[key]++;
            }
        });

        labels.forEach(label => values.push(months[label]));

        setGrowthData({
            labels,
            datasets: [{
                data: values.length > 0 ? values : [0],
                color: (opacity = 1) => `rgba(59,130,246,${opacity})`,
                strokeWidth: 2,
            }],
            legend: ['Novos Registros']
        });

    } catch (error: any) {
        console.error('Erro ao buscar stats:', error);
        Alert.alert('Erro', error.message);
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
                <Text style={styles.title}>Dashboard de Estatísticas </Text>
                <Text style={styles.subtitle}>Visão geral da rede de egressos e instituições.</Text>
            </View>
            
            <View style={styles.kpiContainer}>
                {renderKpiCard('Total Usuários', kpiData.totalUsers, 'users', '#3b82f6')}
                {renderKpiCard('Média Locais/Usuário', kpiData.taxaAtividade, 'bar-chart-2', '#10b981')}
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
                        keyExtractor={item => item.id}
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
                        keyExtractor={item => item.id}
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
    backgroundGradientFrom: '#1e293b', // slate-800
    backgroundGradientTo: '#1e293b',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`, // blue-400
    labelColor: (opacity = 1) => `rgba(203, 213, 225, ${opacity})`, // slate-300
    style: {
        borderRadius: 16,
    },
    propsForDots: {
        r: "5",
        strokeWidth: "2",
        stroke: "#3b82f6"
    }
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a', // slate-950 (Fundo principal)
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#f8fafc', // slate-50
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8', // slate-400
        marginTop: 4,
    },
    kpiContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    kpiCard: {
        backgroundColor: '#1e293b', // slate-800
        width: '48%',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        // Sombras mais sutis para o dark mode
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#334155', // slate-700
    },
    kpiValue: {
        fontSize: 20, 
        fontWeight: 'bold',
        color: '#f1f5f9', // slate-100
        marginTop: 5,
    },
    kpiTitle: {
        fontSize: 12, 
        color: '#94a3b8', // slate-400
        marginTop: 2,
        textAlign: 'left'
    },
    chartCard: {
        backgroundColor: '#1e293b', // slate-800
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#f1f5f9',
        alignSelf: 'flex-start',
        marginBottom: 15,
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#334155', // slate-700
        width: '100%',
    },
    listItemText: {
        fontSize: 14,
        color: '#cbd5e1', // slate-300
    },
    listItemValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f8fafc',
    }
});