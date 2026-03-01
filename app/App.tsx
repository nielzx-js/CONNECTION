import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Platform, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AuthFlowNavigator from './src/navigation/AuthFlowNavigator';
import * as NavigationBar from 'expo-navigation-bar';

function RootContainer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const configureSystemUI = async () => {
      if (Platform.OS === 'android') {
        try {
          await NavigationBar.setBehaviorAsync('overlay-swipe' as any);
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBackgroundColorAsync('#0f172a'); 
          await NavigationBar.setButtonStyleAsync('light'); 
        } catch (e) {
          console.log(e);
        }
      }
    };

    configureSystemUI();
  }, []);

  return (
    <View style={styles.wrapper}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent={true}
      />
      <SafeAreaView style={styles.container}>
        {children}
      </SafeAreaView>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <RootContainer>
        <AuthFlowNavigator />
      </RootContainer>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});