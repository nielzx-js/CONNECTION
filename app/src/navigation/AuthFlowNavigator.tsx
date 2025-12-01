import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { Session } from '@supabase/supabase-js';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyOTPScreen from '../screens/VerifyOTPScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

import AppNavigator from '../screens/AppNavigator';

type AuthScreen = 'login' | 'register' | 'verifyOtp' | 'forgotPassword';

export default function AuthFlowNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('login');

  const [emailForVerification, setEmailForVerification] = useState('');
  const [otpType, setOtpType] = useState<'signup' | 'recovery'>('signup');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      if (!session) {
        setCurrentScreen('login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleRegistrationSuccess = (email: string) => {
    setEmailForVerification(email);
    setOtpType('signup');
    setCurrentScreen('verifyOtp');
  };

  const handleRecoverySuccess = (email: string) => {
    setEmailForVerification(email);
    setOtpType('recovery');
    setCurrentScreen('verifyOtp');
  };

  if (session && session.user) {
    return <AppNavigator />;
  }

  switch (currentScreen) {
    case 'login':
      return (
        <LoginScreen
          onNavigateToRegister={() => setCurrentScreen('register')}
          onNavigateToForgotPassword={() => setCurrentScreen('forgotPassword')}
        />
      );

    case 'register':
      return (
        <RegisterScreen
          onRegistrationSuccess={handleRegistrationSuccess}
          onNavigateToLogin={() => setCurrentScreen('login')}
        />
      );

    case 'forgotPassword':
      return (
        <ForgotPasswordScreen
          onNavigateBack={() => setCurrentScreen('login')}
          onSendRecoveryCodeSuccess={handleRecoverySuccess}
        />
      );

    case 'verifyOtp':
      return (
        <VerifyOTPScreen
          email={emailForVerification}
          otpType={otpType}
          onPasswordResetSuccess={() => setCurrentScreen('login')}
        />
      );

    default:
      return (
        <LoginScreen
          onNavigateToRegister={() => setCurrentScreen('register')}
        />
      );
  }
}
