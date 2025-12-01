import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { supabase } from "../config/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { Linking } from "react-native";

type Local = {
  latitude: number;
  longitude: number;
  municipio: string;
  uf: string;
  pais: string;
  tipo_local: "Residencia" | "Trabalho";
};

type Formacao = {
  instituicao: string;
  periodo: string;
  curso: string;
};

type Usuario = {
  id: string;
  full_name: string;
  email: string;
  curso: string;
  flag: number | null;
  empresa: string;
  cargo: string;
  atuacao: string;
  tipo_trabalho: string;
  tempo_empresa: string;
  cnpj: string | null;
  locais_cadastrados: Local[];
  formacao_academica: Formacao[];
  conta_verificada: boolean;
};

const formatCNPJ = (cnpj: string) => {
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return cnpj;
  return clean.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
};

const getOffset = (index: number) => {
  const radius = 0.00015;
  const angle = index * (Math.PI / 4);
  return {
    lat: Math.cos(angle) * radius,
    lng: Math.sin(angle) * radius,
  };
};

export default function MapScreen() {
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [me, setMe] = useState<Usuario | null>(null);
  const [selected, setSelected] = useState<Usuario | null>(null);

  const load = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("usuarios")
        .select(`
          id,
          full_name,
          email,
          curso,
          flag,
          empresa,
          cargo,
          atuacao,
          tipo_trabalho,
          tempo_empresa,
          cnpj,
          locais_cadastrados,
          formacao_academica,
          conta_verificada
        `);

      if (error) {
        Alert.alert("Erro", error.message);
        return;
      }

      setUsuarios(data || []);
      setMe((data || []).find(u => u.id === user.id) || null);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
      setSelected(null);
    }, [])
  );

  if (loading || !me) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (!me.conta_verificada) {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedTitle}>Conta não verificada</Text>
        <Text style={styles.blockedText}>
          Sua conta ainda não foi verificada.
        </Text>
        <Text style={styles.blockedText}>
          O acesso ao mapa será liberado após a verificação.
        </Text>
      </View>
    );
  }

  const usuariosVisiveis = usuarios.filter(u => {
    if (me.flag === 1) return true;
    return u.curso === me.curso;
  });

  return (
    <View style={{ flex: 1 }}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: -9.6658,
          longitude: -35.7353,
          latitudeDelta: 1.6,
          longitudeDelta: 1.6,
        }}
      >
        {usuariosVisiveis.flatMap(u =>
          (u.locais_cadastrados || []).map((local, i) => {
            const offset = getOffset(i);

            return (
              <Marker
                key={`${u.id}-${i}`}
                coordinate={{
                  latitude: local.latitude + offset.lat,
                  longitude: local.longitude + offset.lng,
                }}
                pinColor={u.id === me.id ? "blue" : "green"}
                onPress={() => setSelected(u)}
              />
            );
          })
        )}
      </MapView>

      <Modal visible={!!selected} animationType="slide">
        {selected && (
          <ScrollView style={styles.modal}>
            <Text style={styles.title}>{selected.full_name}</Text>

            <TouchableOpacity
              style={styles.mailBtn}
              activeOpacity={0.8}
              onPress={() =>
                Linking.openURL("mailto:" + selected.email)
              }
            >
              <Text style={styles.mailIcon}>📧</Text>
              <Text style={styles.mailText}>Enviar e-mail</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={styles.section}>Residência</Text>
            <Text style={styles.text}>
              {(() => {
                const r = selected.locais_cadastrados?.find(
                  l => l.tipo_local === "Residencia"
                );
                if (!r) return "Não informado";
                return `${r.municipio}, ${r.uf}, ${r.pais}`;
              })()}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.section}>Trabalho</Text>
            <Text style={styles.text}>Empresa: {selected.empresa}</Text>
            <Text style={styles.text}>
              CNPJ: {selected.cnpj ? formatCNPJ(selected.cnpj) : "Não informado"}
            </Text>
            <Text style={styles.text}>Atuação: {selected.atuacao}</Text>
            <Text style={styles.text}>Cargo: {selected.cargo}</Text>
            <Text style={styles.text}>Tipo: {selected.tipo_trabalho}</Text>
            <Text style={styles.text}>Tempo: {selected.tempo_empresa}</Text>

            <View style={styles.divider} />

            <Text style={styles.section}>Formação</Text>
            {(selected.formacao_academica || []).map((f, i) => (
              <View key={i} style={styles.card}>
                <Text style={styles.cardTitle}>Formação {i + 1}</Text>
                <Text>Instituição: {f.instituicao}</Text>
                <Text>Período: {f.periodo}</Text>
                <Text>Curso: {f.curso}</Text>
              </View>
            ))}

            <TouchableOpacity
              style={styles.close}
              onPress={() => setSelected(null)}
            >
              <Text style={styles.closeText}>Fechar</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#555",
  },

  blocked: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#f8fafc",
  },
  blockedTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  blockedText: {
    textAlign: "center",
    color: "#555",
  },

  modal: {
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },

  divider: {
    marginVertical: 16,
    borderBottomWidth: 1,
    borderColor: "#9ca3af",
    borderStyle: "dotted",
  },

  section: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
  text: {
    marginBottom: 4,
  },

  card: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
  },
  cardTitle: {
    fontWeight: "bold",
    marginBottom: 4,
  },

  close: {
    marginVertical: 30,
    alignItems: "center",
  },
  closeText: {
    color: "#2563eb",
    fontWeight: "bold",
  },

  mailBtn: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#eef2ff",
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#c7d2fe",
  },
  mailIcon: {
    fontSize: 18,
  },
  mailText: {
    color: "#1d4ed8",
    fontWeight: "bold",
    fontSize: 15,
  },
});