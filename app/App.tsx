import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AuthFlowNavigator from './src/navigation/AuthFlowNavigator';

function RootContainer({ children }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      {children}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <RootContainer>
      <NavigationContainer>
        <AuthFlowNavigator />
      </NavigationContainer>
    </RootContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
});