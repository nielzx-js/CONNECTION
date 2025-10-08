// src/screens/MapScreen.tsx

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';

// Coordenadas aproximadas da Orla de Pajuçara em Maceió
const maceioCoordinates = {
  latitude: -9.6659,
  longitude: -35.7211,
};

// Detalhes do ponto fixo para o teste
const fixedPoint = {
  coordinate: {
    latitude: -12.9531517, // Um pouco deslocado para ficar visível
    longitude: -38.4688771,
  },
  title: 'josenielson990 está aqui',
};

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE} 
        initialRegion={{
          ...maceioCoordinates,
          latitudeDelta: 0.0922, // Zoom do mapa
          longitudeDelta: 0.0421, // Zoom do mapa
        }}
      >
        <Marker
          coordinate={fixedPoint.coordinate}
          pinColor="red"
        >
          <Callout>
            <View style={styles.calloutView}>
              <Text style={styles.calloutText}>{fixedPoint.title}</Text>
            </View>
          </Callout>
        </Marker>
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  calloutView: {
    padding: 10,
  },
  calloutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});