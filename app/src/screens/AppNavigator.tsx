import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../config/supabase';

import HomeScreen from './HomeScreen';
import MapScreen from './Mapscreen';
import StatsScreen from './StatsScreen';
import SettingsScreen from './SettingsScreen';
import RegisterLocalScreen from './RegisterLocalScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';

type ConfigStackParamList = {
  SettingsMain: undefined;
};

type RegisterLocalStackParamList = {
  RegisterLocal: undefined;
};

export type RootTabParamList = {
  Início: undefined;
  Mapa: undefined;
  Estatísticas: undefined;
  Configurações: undefined;
  RegisterLocalStack: undefined;
};

type TabIconProps = {
  color: string;
  size: number;
  focused: boolean;
};

type UserProfile = {
  cpf: string | null;
  data_nascimento: string | null;
  cidade_residencia: string | null;
  empresa: string | null;
  cargo: string | null;
  [key: string]: string | number | null | undefined;
};

const REQUIRED_FIELDS = ['cpf', 'data_nascimento', 'cidade_residencia', 'empresa', 'cargo'];

const ACTIVE_COLOR = '#2563eb';
const INACTIVE_COLOR = '#64748b';

const ConfigStack = createNativeStackNavigator<ConfigStackParamList>();
const RegisterLocalStack = createNativeStackNavigator<RegisterLocalStackParamList>();

function ConfigStackScreen() {
  return (
    <ConfigStack.Navigator screenOptions={{ headerShown: false }}>
      <ConfigStack.Screen name="SettingsMain" component={SettingsScreen} />
    </ConfigStack.Navigator>
  );
}

function RegisterLocalStackScreen() {
  return (
    <RegisterLocalStack.Navigator screenOptions={{ headerShown: false }}>
      <RegisterLocalStack.Screen name="RegisterLocal" component={RegisterLocalScreen} />
    </RegisterLocalStack.Navigator>
  );
}

const checkProfileCompleteness = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true;

    const { data, error } = await supabase
      .from('usuarios')
      .select(REQUIRED_FIELDS.join(','))
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar perfil:', error.message);
      return false;
    }

    if (data && typeof data === 'object') {
      const profile = data as Partial<UserProfile>;
      return REQUIRED_FIELDS.every(
        field => profile[field] !== null && profile[field] !== undefined && String(profile[field]).trim() !== ''
      );
    }

    return false;
  } catch (e) {
    console.error('Falha ao verificar completude do perfil:', e);
    return false;
  }
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function AppNavigator() {
  const [isConfigIncomplete, setIsConfigIncomplete] = useState(false);
  const authListenerRef = useRef<any>(null);

  useEffect(() => {
    const setupListener = async () => {
      const isComplete = await checkProfileCompleteness();
      setIsConfigIncomplete(!isComplete);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      authListenerRef.current = supabase
        .channel('public:usuarios_channel')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'usuarios',
          filter: `id=eq.${user.id}`
        }, async () => {
          const updatedComplete = await checkProfileCompleteness();
          setIsConfigIncomplete(!updatedComplete);
        })
        .subscribe();
    };

    setupListener();

    return () => {
      if (authListenerRef.current) authListenerRef.current.unsubscribe();
    };
  }, []);
  
  return (
    <Tab.Navigator
      initialRouteName="Início"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 90 : 60,
          paddingBottom: Platform.OS === 'ios' ? 25 : 5,
          paddingTop: 5,
          backgroundColor: '#fff'
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' }
      }}
    >
      <Tab.Screen
        name="Início"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }: TabIconProps) => <Feather name="home" color={color} size={size} />
        }}
      />

      <Tab.Screen
        name="Mapa"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, size }: TabIconProps) => <Feather name="map" color={color} size={size} />
        }}
      />

      <Tab.Screen
        name="Estatísticas"
        component={StatsScreen}
        options={{
          tabBarIcon: ({ color, size }: TabIconProps) => <Feather name="trending-up" color={color} size={size} />
        }}
      />

      <Tab.Screen
        name="Configurações"
        component={ConfigStackScreen}
        options={{
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <View>
              <Feather name="settings" color={color} size={size} />
              {isConfigIncomplete && (
                <View style={{
                  position: 'absolute',
                  right: -6,
                  top: -6,
                  backgroundColor: 'red',
                  borderRadius: 7.5,
                  width: 15,
                  height: 15,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: '#fff'
                }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold', lineHeight: 12 }}>!</Text>
                </View>
              )}
            </View>
          )
        }}
      />

      <Tab.Screen
        name="RegisterLocalStack"
        component={RegisterLocalStackScreen}
        options={{ tabBarButton: () => null }}
      />
    </Tab.Navigator>
  );
}
