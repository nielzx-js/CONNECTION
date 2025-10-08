import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { Session } from '@supabase/supabase-js';

// Importa os componentes de tela de autenticação
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyOTPScreen from '../screens/VerifyOTPScreen';

// Importa o navegador principal para usuários logados
import AppNavigator from '../screens/AppNavigator';

type AuthScreen = 'login' | 'register' | 'verifyOtp';

export default function AuthFlowNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('login');
  const [emailForVerification, setEmailForVerification] = useState('');

  // 1. Efeito para lidar com a sessão de autenticação
  useEffect(() => {
    // Tenta obter a sessão na montagem
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Cria o listener para mudanças de estado de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Se a sessão cair, volta para o login
      if (!session) {
        setCurrentScreen('login');
      }
    });

    // Função de limpeza do listener
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleRegistrationSuccess = (email: string) => {
    setEmailForVerification(email);
    setCurrentScreen('verifyOtp');
  };

  // 2. Renderização do Conteúdo
  // Se houver sessão, carrega o navegador principal (Abas)
  if (session && session.user) {
    return <AppNavigator />;
  }

  // Se não houver sessão, renderiza as telas de autenticação
  switch (currentScreen) {
    case 'login':
      return <LoginScreen onNavigateToRegister={() => setCurrentScreen('register')} />;
    case 'register':
      return (
        <RegisterScreen
          onRegistrationSuccess={handleRegistrationSuccess}
          onNavigateToLogin={() => setCurrentScreen('login')}
        />
      );
    case 'verifyOtp':
      return <VerifyOTPScreen email={emailForVerification} />;
    default:
      return <LoginScreen onNavigateToRegister={() => setCurrentScreen('register')} />;
  }
}
