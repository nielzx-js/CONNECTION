import React, { useState, useEffect, useMemo, ReactNode } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useNavigation } from '@react-navigation/native';

// Importa o cliente Supabase (módulo externo)
import { supabase } from "../config/supabase";

// ----------------------------------------------------------------------
// 1. TIPAGEM E INTERFACES
// ----------------------------------------------------------------------

interface BaseComponentProps {
    children?: ReactNode;
    style?: any;
    key?: React.Key;
}

interface UserData {
  id: string;
  email: string | undefined;
  full_name?: string;
}

interface Stat {
  label: string;
  value: string;
  iconName: string; 
}

interface Feature {
  iconName: string; 
  title: string;
  description: string;
}

// ----------------------------------------------------------------------
// 2. COMPONENTES SIMPLES PARA REACT NATIVE (DEFINIDOS LOCALMENTE)
// ----------------------------------------------------------------------

const Card: React.FC<BaseComponentProps> = ({ children, style }) => (
  <View style={[styles.card, style]}>
    {children}
  </View>
);

interface ButtonProps extends BaseComponentProps {
  onPress?: () => void;
  variant?: 'primary' | 'outline';
}

const Button: React.FC<ButtonProps> = ({ children, onPress, style, variant = 'primary' }) => (
  <TouchableOpacity 
    style={[
      styles.button, 
      variant === 'outline' ? styles.buttonOutline : styles.buttonPrimary,
      style
    ]} 
    onPress={onPress}
  >
    {typeof children === 'string' ? (
      <Text style={[
        styles.buttonText, 
        variant === 'outline' ? styles.buttonTextOutline : styles.buttonTextPrimary
      ]}>
        {children}
      </Text>
    ) : (
      children
    )}
  </TouchableOpacity>
);

const Badge: React.FC<BaseComponentProps> = ({ children, style }) => (
  <View style={[styles.badge, style]}>
    {typeof children === 'string' ? (
      <Text style={styles.badgeText}>{children}</Text>
    ) : (
      children
    )}
  </View>
);

const Icon: React.FC<{ name: string, size?: number }> = ({ name, size = 24 }) => {
  const iconMap: { [key: string]: string } = {
    sparkles: "✨",
    shield: "🛡️",
    smartphone: "📱",
    globe: "🌍",
    users: "👥",
    trending: "📈",
    heart: "❤️",
    star: "⭐",
    arrow: "→",
    check: "✅"
  };

  return (
    <Text style={{ fontSize: size }}>
      {iconMap[name] || "📋"}
    </Text>
  );
};

// ----------------------------------------------------------------------
// 3. COMPONENTE HOME PRINCIPAL
// ----------------------------------------------------------------------

export default function Home() {
  const navigation = useNavigation();
  const [user, setUser] = useState<UserData | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Efeito para carregar o usuário e iniciar o relógio
  useEffect(() => {
    loadUser();
    
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Função para carregar o usuário do Supabase
  const loadUser = async (): Promise<void> => {
    setLoadingUser(true);
    setError(null);
    
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw new Error("Erro ao carregar dados de autenticação.");
      }

      if (authUser) {
        // Busca o perfil na tabela 'usuarios' para obter o 'full_name'
        const { data: profileData, error: profileError } = await supabase
          .from('usuarios')
          .select('full_name')
          .eq('id', authUser.id)
          .single();

        // Ignora o erro 'PGRST116' que significa "nenhum resultado encontrado", o que é esperado se o perfil ainda não foi criado.
        if (profileError && profileError.code !== 'PGRST116') {
          console.warn("Aviso ao carregar perfil:", profileError.message);
        }

        // Monta o objeto de usuário com fallbacks
        const userData: UserData = {
          id: authUser.id,
          email: authUser.email,
          full_name: profileData?.full_name || authUser.user_metadata?.full_name,
        };

        setUser(userData);
      } else {
        setUser(null);
        // Não é um erro, apenas nenhum usuário logado
      }

    } catch (err: any) {
      console.error("Erro inesperado ao carregar usuário:", err);
      setError(err.message || "Ocorreu um erro inesperado.");
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  // Memoiza a saudação ("Bom dia", "Boa tarde", etc.)
  const getGreeting = useMemo<string>(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Tenha um bom dia";
    if (hour < 18) return "Tenha uma boa tarde";
    return "Tenha uma boa noite";
  }, [currentTime]);

  // **NOVA LÓGICA AQUI**
  // Extrai e memoiza o primeiro nome do usuário para exibição.
  const displayName = useMemo(() => {
    if (loadingUser) return 'Carregando...';
    if (!user) return 'Visitante'; // Se não há usuário, exibe 'Visitante'

    // 1. Verifica se 'full_name' existe e não está vazio
    if (user.full_name && user.full_name.trim() !== '') {
      // 2. Divide o nome pelos espaços e pega o primeiro item
      return user.full_name.split(' ')[0];
    }
    
    // 3. (Fallback) Se não tiver nome, usa a parte antes do @ do e-mail
    if (user.email) {
      return user.email.split('@')[0];
    }

    // 4. (Último Fallback) Se não tiver nem e-mail
    return 'Usuário';
  }, [user, loadingUser]);

  // Função de navegação para o cadastro de local
  const handleNavigateToRegisterLocal = () => {
    navigation.navigate('RegisterLocalStack' as never); 
  };


  // ----------------------------------------------------------------------
  // 4. DADOS ESTÁTICOS
  // ----------------------------------------------------------------------

  const features: Feature[] = [
    { iconName: "shield", title: "Segurança Avançada", description: "Proteção de dados com os mais altos padrões de segurança" },
    { iconName: "smartphone", title: "Mobile-First", description: "Experiência perfeita em todos os dispositivos" },
    { iconName: "globe", title: "Multi-idiomas", description: "Suporte para português, espanhol e inglês" },
    { iconName: "users", title: "Colaboração", description: "Trabalhe em equipe de forma eficiente" }
  ];

  const stats: Stat[] = [
    { label: "Usuários Ativos", value: "10K+", iconName: "users" },
    { label: "Taxa de Sucesso", value: "99.9%", iconName: "trending" },
    { label: "Avaliação", value: "4.8★", iconName: "star" },
    { label: "Uptime", value: "99.9%", iconName: "check" }
  ];

  // ----------------------------------------------------------------------
  // 5. RENDERIZAÇÃO
  // ----------------------------------------------------------------------

  return (
    <ScrollView style={styles.container}>
      {/* Header / Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroContent}>
          <Badge style={styles.welcomeBadge}>
            <Icon name="sparkles" size={16} />
            <Text style={styles.badgeText}> Bem-vindo à plataforma</Text>
          </Badge>
          
          {loadingUser ? (
            <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 10, height: 40 }} />
          ) : (
            // **MUDANÇA NA SAUDAÇÃO AQUI**
            <Text style={styles.heroTitle}>
              Olá, {displayName}!
            </Text>
          )}
          
          <Text style={styles.heroSubtitle}>
            Sua plataforma completa para gerenciamento e produtividade, 
            agora com a mais alta segurança e design responsivo.
          </Text>
          
          <View style={styles.buttonContainer}>
            <Button 
              style={styles.primaryButton}
              onPress={handleNavigateToRegisterLocal}
            >
              <Text style={styles.buttonTextPrimary}>Cadastrar Local </Text>
              <Icon name="arrow" size={16} />
            </Button>
            
            <Button 
              variant="outline"
              style={styles.secondaryButton}
              onPress={() => console.log('Saiba Mais')}
            >
              Saiba Mais
            </Button>
          </View>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <Card key={index} style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Icon name={stat.iconName} size={24} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Card>
          ))}
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recursos Principais</Text>
          <Text style={styles.sectionSubtitle}>
            Tudo que você precisa para ter sucesso, em uma plataforma única e segura.
          </Text>
        </View>
        
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <Card key={index} style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Icon name={feature.iconName} size={28} />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </Card>
          ))}
        </View>
      </View>

      {/* Footer CTA Section */}
      <View style={styles.footerSection}>
        <View style={styles.footerIconContainer}>
          <Icon name="heart" size={32} />
        </View>
        <Text style={styles.footerTitle}>
          Obrigado por escolher nossa plataforma!
        </Text>
        <Text style={styles.footerSubtitle}>
            {getGreeting}. Estamos aqui para ajudá-lo a alcançar seus objetivos.
        </Text>
        
        <View style={styles.userInfo}>
          {loadingUser ? (
            <Text style={styles.userInfoText}>Carregando dados do usuário...</Text>
          ) : error ? (
            <Text style={styles.errorText}>Erro: {error}</Text>
          ) : user ? (
            <View>
              <Text style={styles.userInfoText}>
                Usuário: {user.full_name || user.email || 'N/A'}
              </Text>
              <Text style={styles.userIdText}>
                ID: {user.id.substring(0, 8)}...
              </Text>
            </View>
          ) : (
            <Text style={styles.userInfoText}>Nenhum usuário logado.</Text>
          )}
          <Text style={styles.timeText}>
            {currentTime.toLocaleDateString('pt-BR')} - {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
      
    </ScrollView>
  );
}

// ----------------------------------------------------------------------
// 6. ESTILOS (Sem alterações, mantidos como no original)
// ----------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  heroSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  heroContent: {
    alignItems: 'center',
  },
  welcomeBadge: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 28,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {},
  statsSection: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    backgroundColor: '#f8fafc',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#e0e7ff',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  featuresSection: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    backgroundColor: '#ffffff',
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 26,
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    padding: 24,
    alignItems: 'flex-start', // Alinhado à esquerda para melhor leitura
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    backgroundColor: '#e0e7ff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'left', // Alinhado à esquerda
  },
  featureDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'left', // Alinhado à esquerda
    lineHeight: 24,
  },
  footerSection: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 20,
    paddingVertical: 48,
    alignItems: 'center',
    marginTop: 20,
  },
  footerIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  footerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  footerSubtitle: {
    fontSize: 16,
    color: '#bfdbfe',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
  },
  userInfo: {
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 24,
    width: '100%',
  },
  userInfoText: {
    fontSize: 16,
    color: '#bfdbfe',
  },
  userIdText: {
    fontSize: 14,
    color: '#93c5fd',
    fontFamily: 'monospace', // Melhor para IDs
  },
  errorText: {
    fontSize: 16,
    color: '#fca5a5',
    backgroundColor: '#7f1d1d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#bfdbfe',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#334155',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2563eb',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: '#ffffff',
  },
  buttonTextOutline: {
    color: '#334155',
  },
  badge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 14,
    color: '#3730a3',
    fontWeight: '600',
  },
});