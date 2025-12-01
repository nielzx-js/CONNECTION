import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, Alert, 
    TouchableOpacity, ActivityIndicator, FlatList 
} from 'react-native';
import { supabase } from '../config/supabase';
import { Feather } from '@expo/vector-icons';

interface LocalData {
    nome_local: string;
    cep: string;
    latitude: number;
    longitude: number;
}

interface MyLocationsProps {
    navigation: any; 
}

export default function MyLocationsScreen({ navigation }: MyLocationsProps) {
    const [locais, setLocais] = useState<LocalData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadUserLocations = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Erro', 'Usuário não autenticado.');
                return;
            }

            const { data, error } = await supabase
                .from('usuarios')
                .select('locais_cadastrados')
                .eq('id', user.id)
                .single();

            if (error && (error as any).code !== 'PGRST116') throw error;
            
            const fetchedLocais = (data?.locais_cadastrados || []) as LocalData[];
            setLocais(fetchedLocais);

        } catch (err: any) {
            console.error('Erro ao carregar locais:', err);
            Alert.alert('Erro', 'Falha ao carregar seus locais cadastrados.');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDeleteLocation = async (indexToDelete: number) => {
        if (isDeleting) return;
        
        Alert.alert(
            'Confirmar Exclusão',
            `Tem certeza que deseja deletar o local "${locais[indexToDelete].nome_local}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Deletar',
                    style: 'destructive',
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) throw new Error('Usuário não autenticado.');

                            const newLocaisArray = locais.filter((_, index) => index !== indexToDelete);

                            const { error } = await supabase
                                .from('usuarios')
                                .update({ locais_cadastrados: newLocaisArray })
                                .eq('id', user.id);

                            if (error) throw error;

                            setLocais(newLocaisArray);
                            Alert.alert('Sucesso', 'Local deletado com sucesso.');

                        } catch (err: any) {
                            console.error('Erro ao deletar local:', err);
                            Alert.alert('Erro', 'Não foi possível deletar o local.');
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadUserLocations();
        });

        return unsubscribe;
    }, [navigation, loadUserLocations]);

    const renderItem = ({ item, index }: { item: LocalData, index: number }) => (
        <View style={styles.localCard}>
            <View style={styles.localInfo}>
                <Text style={styles.localName}>{item.nome_local}</Text>
                <View style={styles.detailRow}>
                    <Feather name="home" size={14} color="#64748b" />
                    <Text style={styles.detailText}>CEP: {item.cep}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Feather name="map-pin" size={14} color="#64748b" />
                    <Text style={styles.detailText}>Lat: {item.latitude.toFixed(4)}, Lon: {item.longitude.toFixed(4)}</Text>
                </View>
            </View>
            <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={() => handleDeleteLocation(index)}
                disabled={isDeleting}
            >
                <Feather name="trash-2" size={24} color="#dc2626" />
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Carregando locais...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Meus Locais Cadastrados</Text>
                <Text style={styles.subtitle}>Gerencie seus {locais.length} de 3 pontos de interesse.</Text>
            </View>
            
            <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => navigation.navigate('RegisterLocal')}
                disabled={locais.length >= 3}
            >
                <Feather name="plus-circle" size={20} color="#fff" />
                <Text style={styles.addButtonText}> 
                    {locais.length >= 3 ? 'Limite Máximo Atingido (3/3)' : 'Adicionar Novo Local'}
                </Text>
            </TouchableOpacity>

            {locais.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Feather name="map" size={60} color="#cbd5e1" />
                    <Text style={styles.emptyText}>Você ainda não cadastrou nenhum local.</Text>
                    <Text style={styles.emptyTextHint}>Clique no botão "Adicionar Novo Local" acima.</Text>
                </View>
            ) : (
                <FlatList
                    data={locais}
                    renderItem={renderItem}
                    keyExtractor={(_, index) => index.toString()}
                    contentContainerStyle={styles.listContainer}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#334155',
    },
    header: {
        padding: 20,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
        marginTop: 4,
    },
    addButton: {
        flexDirection: 'row',
        backgroundColor: '#2563eb',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        marginVertical: 15,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    localCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        borderLeftWidth: 5,
        borderLeftColor: '#2563eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    localInfo: {
        flex: 1,
    },
    localName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 5,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    detailText: {
        fontSize: 14,
        color: '#64748b',
        marginLeft: 5,
    },
    deleteButton: {
        padding: 10,
        borderRadius: 5,
        marginLeft: 10,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 50,
    },
    emptyText: {
        fontSize: 18,
        color: '#94a3b8',
        marginTop: 20,
        fontWeight: 'bold',
    },
    emptyTextHint: {
        fontSize: 14,
        color: '#a1a1aa',
        marginTop: 5,
    }
});
