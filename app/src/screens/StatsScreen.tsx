// src/screens/StatsScreen.tsx

import React from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

// --- DADOS ALEATÓRIOS PARA O DASHBOARD ---

// 1. Dados para os cartões principais (KPIs)
const kpiData = [
  { id: '1', title: 'Usuários Ativos', value: '1,482', icon: 'users', color: '#3b82f6' },
  { id: '2', title: 'Novos Cadastros (30d)', value: '109', icon: 'user-plus', color: '#10b981' },
  { id: '3', title: 'Locais Registrados', value: '8,921', icon: 'map-pin', color: '#f97316' },
  { id: '4', title: 'Sessões Hoje', value: '3,215', icon: 'activity', color: '#ef4444' },
];

// 2. Dados para o gráfico de crescimento de usuários
const userGrowthData = {
  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
  datasets: [
    {
      data: [820, 932, 1001, 1140, 1348, 1482],
      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Azul
      strokeWidth: 2,
    },
  ],
  legend: ['Novos Usuários'],
};

// 3. Dados para o gráfico de pizza (demografia)
const demographicsData = [
  { name: 'Engenheiros', population: 45, color: '#3b82f6', legendFontColor: '#333', legendFontSize: 14 },
  { name: 'Técnicos', population: 30, color: '#10b981', legendFontColor: '#333', legendFontSize: 14 },
  { name: 'Gestores', population: 15, color: '#f97316', legendFontColor: '#333', legendFontSize: 14 },
  { name: 'Outros', population: 10, color: '#ef4444', legendFontColor: '#333', legendFontSize: 14 },
];

// 4. Dados para a lista de Top Cidades
const topCitiesData = [
    { id: '1', name: 'Maceió, AL', value: '1,204 registros' },
    { id: '2', name: 'São Paulo, SP', value: '987 registros' },
    { id: '3', name: 'Rio de Janeiro, RJ', value: '852 registros' },
    { id: '4', name: 'Belo Horizonte, MG', value: '765 registros' },
    { id: '5', name: 'Salvador, BA', value: '643 registros' },
];


export default function StatsScreen() {
  const renderKpiCard = ({ item }: { item: typeof kpiData[0] }) => (
    <View style={styles.kpiCard}>
      <Feather name={item.icon as any} size={24} color={item.color} />
      <Text style={styles.kpiValue}>{item.value}</Text>
      <Text style={styles.kpiTitle}>{item.title}</Text>
    </View>
  );

  const renderTopCityItem = ({ item }: { item: typeof topCitiesData[0] }) => (
    <View style={styles.listItem}>
        <Text style={styles.listItemText}>{item.name}</Text>
        <Text style={styles.listItemValue}>{item.value}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard de Estatísticas</Text>
        <Text style={styles.subtitle}>Visão geral dos dados da plataforma</Text>
      </View>

      {/* Seção de KPIs Principais */}
      <View style={styles.kpiContainer}>
        {kpiData.map(item => renderKpiCard({ item }))}
      </View>

      {/* Gráfico de Crescimento de Usuários */}
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Crescimento de Usuários (Últimos 6 meses)</Text>
        <LineChart
          data={userGrowthData}
          width={screenWidth - 40} // Largura da tela menos o padding
          height={220}
          chartConfig={chartConfig}
          bezier
          style={{ borderRadius: 12 }}
        />
      </View>

      {/* Gráfico de Demografia */}
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Distribuição por Cargo</Text>
        <PieChart
          data={demographicsData}
          width={screenWidth - 40}
          height={220}
          chartConfig={chartConfig}
          accessor={"population"}
          backgroundColor={"transparent"}
          paddingLeft={"15"}
          center={[10, 0]}
          absolute
        />
      </View>

      {/* Lista de Top Cidades */}
      <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Top 5 Cidades com Mais Registros</Text>
          <FlatList
            data={topCitiesData}
            renderItem={renderTopCityItem}
            keyExtractor={item => item.id}
            scrollEnabled={false} // Desabilita scroll da lista interna
          />
      </View>
      <View style={{height: 40}}/>
    </ScrollView>
  );
}

// Configuração de estilo para os gráficos
const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
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
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    alignItems: 'flex-start',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 10,
  },
  kpiTitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  listItemText: {
    fontSize: 16,
    color: '#334155',
  },
  listItemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  }
});