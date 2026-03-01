import React, { useCallback, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  Linking,
  FlatList,
  TextInput,
} from "react-native";
import { supabase } from "../config/supabase";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import MapLibreGL from "@maplibre/maplibre-react-native";

MapLibreGL.setAccessToken(null);

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Local = {
  uf: string;
  cep: string;
  pais: string;
  latitude: number;
  longitude: number;
  municipio: string;
  nome_local: string;
  tipo_local: "Residencia" | "Trabalho";
  endereco_nome: string;
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
  locais_cadastrados: Local[] | string;
  formacao_academica: Formacao[] | string;
  conta_verificada: boolean;
};

// Marcador agrupado por CEP
type MarkerGroup = {
  cep: string;
  latitude: number;
  longitude: number;
  users: Usuario[];
};

const { height } = Dimensions.get("window");

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function parseJSON<T>(raw: T | string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  return raw as T;
}

const getLocais = (u: Usuario): Local[] => {
  return parseJSON<Local[]>(u.locais_cadastrados, []);
};

const getFormacoes = (u: Usuario): Formacao[] => {
  return parseJSON<Formacao[]>(u.formacao_academica, []);
};

const getCourseSet = (u: Usuario): Set<string> => {
  const s = new Set<string>();
  getFormacoes(u).forEach((f) => {
    if (f.curso?.trim()) s.add(f.curso.trim().toLowerCase());
  });
  if (u.curso?.trim()) s.add(u.curso.trim().toLowerCase());
  return s;
};

// Deterministic color from user id — stable across re-renders
const colorFromId = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 58%)`;
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [me, setMe] = useState<Usuario | null>(null);

  const [nameQuery, setNameQuery] = useState("");
  const [courseQuery, setCourseQuery] = useState("");
  const [showCourseSuggestions, setShowCourseSuggestions] = useState(false);

  const [selectedGroup, setSelectedGroup] = useState<MarkerGroup | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const [showMarkers, setShowMarkers] = useState(false);
  const isFocused = useIsFocused();
  const cameraRef = useRef(null as any);

  // ── Map lifecycle: never unmount MapView, just hide markers ─────────────────
  React.useEffect(() => {
    if (isFocused) {
      const t = setTimeout(() => setShowMarkers(true), 150);
      return () => clearTimeout(t);
    } else {
      setShowMarkers(false);
      setSelectedGroup(null);
      setExpandedUserId(null);
    }
  }, [isFocused]);

  // ── Load data ────────────────────────────────────────────────────────────────
  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Usuário não autenticado");

      const { data, error: dbError } = await supabase
        .from("usuarios")
        .select(
          `id, full_name, email, curso, flag, empresa, cargo,
           atuacao, tipo_trabalho, tempo_empresa, cnpj,
           locais_cadastrados, formacao_academica, conta_verificada`
        );

      if (dbError) throw dbError;
      const all: Usuario[] = data || [];
      setUsuarios(all);
      setMe(all.find((u) => u.id === user.id) || null);
    } catch (err: any) {
      Alert.alert("Erro de Conexão", err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const isAdmin = me?.flag === 1;

  // ── All unique courses (for admin suggestions) ────────────────────────────────
  const allCourses = useMemo(() => {
    const set = new Set<string>();
    usuarios.forEach((u) => getCourseSet(u).forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [usuarios]);

  const courseSuggestions = useMemo(() => {
    if (!courseQuery.trim()) return allCourses;
    const q = courseQuery.trim().toLowerCase();
    return allCourses.filter((c) => c.includes(q));
  }, [allCourses, courseQuery]);

  // ── Visible users ────────────────────────────────────────────────────────────
  const usuariosVisiveis = useMemo((): Usuario[] => {
    if (!me) return [];
    let pool: Usuario[] = [];

    if (isAdmin) {
      pool = usuarios;
      if (courseQuery.trim()) {
        const q = courseQuery.trim().toLowerCase();
        pool = pool.filter((u) =>
          Array.from(getCourseSet(u)).some((c) => c.includes(q))
        );
      }
    } else {
      const myCourses = getCourseSet(me);
      pool = usuarios.filter((u) => {
        if (u.id === me.id) return true;
        for (const c of getCourseSet(u)) {
          if (myCourses.has(c)) return true;
        }
        return false;
      });
    }

    if (nameQuery.trim()) {
      const q = nameQuery.trim().toLowerCase();
      pool = pool.filter((u) =>
        (u.full_name || "").toLowerCase().includes(q)
      );
    }

    return pool;
  }, [usuarios, me, isAdmin, nameQuery, courseQuery]);

  // ── Group markers by CEP ──────────────────────────────────────────────────────
  // Each local has a CEP. We group all locais from all visible users by CEP.
  // The marker sits at the first lat/lon seen for that CEP.
  // The users list = all users that have at least one local with that CEP.
  const markerGroups = useMemo((): MarkerGroup[] => {
    const map = new Map<string, { lat: number; lon: number; userSet: Map<string, Usuario> }>();

    usuariosVisiveis.forEach((u) => {
      getLocais(u).forEach((loc) => {
        const lat = Number(loc.latitude);
        const lon = Number(loc.longitude);
        if (!loc.cep || !isFinite(lat) || !isFinite(lon)) return;

        if (!map.has(loc.cep)) {
          map.set(loc.cep, { lat, lon, userSet: new Map() });
        }
        map.get(loc.cep)!.userSet.set(u.id, u);
      });
    });

    return Array.from(map.entries()).map(([cep, val]) => ({
      cep,
      latitude: val.lat,
      longitude: val.lon,
      users: Array.from(val.userSet.values()),
    }));
  }, [usuariosVisiveis]);

  // ── Marker press ─────────────────────────────────────────────────────────────
  const handleMarkerPress = useCallback((group: MarkerGroup) => {
    if (!isFocused) return;
    setSelectedGroup(group);
    setExpandedUserId(null);
    cameraRef.current?.setCamera({
      centerCoordinate: [group.longitude, group.latitude],
      zoomLevel: 14,
      animationDuration: 500,
    });
  }, [isFocused]);

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`).catch(() =>
      Alert.alert("Erro", "Não foi possível abrir o app de e-mail")
    );
  };

  // ── Loading / blocked ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingSubtitle}>Mapeando conexões...</Text>
      </View>
    );
  }

  if (!me?.conta_verificada) {
    return (
      <View style={styles.blockedContainer}>
        <View style={styles.blockedIconContainer}>
          <Text style={{ fontSize: 40 }}>🔒</Text>
        </View>
        <Text style={styles.blockedTitle}>Acesso em Análise</Text>
        <Text style={styles.blockedText}>Sua conta ainda não foi verificada.</Text>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" />

      {/*
        MapView is ALWAYS mounted — unmounting it during tile loading causes a
        native Java/JNI crash on Android. We hide it with display:'none' instead.
      */}
      <View style={[styles.mapWrapper, !isFocused && styles.mapHidden]}>
        <MapLibreGL.MapView
          style={styles.fullMap}
          mapStyle={{
            version: 8,
            sources: {
              "raster-tiles": {
                type: "raster",
                tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"],
                tileSize: 256,
              },
            },
            layers: [
              { id: "background", type: "background", paint: { "background-color": "#0b1220" } },
              { id: "dark-tiles", type: "raster", source: "raster-tiles", minzoom: 0, maxzoom: 19 },
            ],
          }}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <MapLibreGL.Camera
            ref={cameraRef}
            defaultSettings={{ centerCoordinate: [-35.7353, -9.6658], zoomLevel: 10 }}
          />

          {showMarkers && markerGroups.map((group) => {
            const count = group.users.length;
            const color = count === 1 ? colorFromId(group.users[0].id) : "#6366f1";
            const label = count === 1
              ? (group.users[0].full_name || "?").charAt(0).toUpperCase()
              : String(count);

            return (
              <MapLibreGL.PointAnnotation
                key={group.cep}
                id={`cep-${group.cep}`}
                coordinate={[group.longitude, group.latitude]}
                onSelected={() => handleMarkerPress(group)}
              >
                <View style={styles.markerContainer}>
                  <View style={[styles.markerBubble, { backgroundColor: color }]}>
                    <Text style={styles.markerLabel}>{label}</Text>
                  </View>
                  <View style={[styles.markerShadow, { backgroundColor: color }]} />
                </View>
              </MapLibreGL.PointAnnotation>
            );
          })}
        </MapLibreGL.MapView>

        {/* Search overlay */}
        <View style={styles.searchOverlay} pointerEvents="box-none">
          <TextInput
            value={nameQuery}
            onChangeText={setNameQuery}
            placeholder="🔍  Pesquisar por nome"
            placeholderTextColor="#64748b"
            style={styles.searchInput}
            returnKeyType="search"
          />

          {isAdmin && (
            <View style={styles.courseFilterWrapper}>
              <TextInput
                value={courseQuery}
                onChangeText={(t) => { setCourseQuery(t); setShowCourseSuggestions(true); }}
                onFocus={() => setShowCourseSuggestions(true)}
                placeholder="🎓  Filtrar por curso (admin)"
                placeholderTextColor="#64748b"
                style={[styles.searchInput, { marginTop: 6 }]}
                returnKeyType="search"
                onSubmitEditing={() => setShowCourseSuggestions(false)}
              />
              {showCourseSuggestions && courseSuggestions.length > 0 && (
                <View style={styles.suggestionsBox}>
                  <FlatList
                    data={courseSuggestions.slice(0, 8)}
                    keyExtractor={(item) => item}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.suggestionItem}
                        onPress={() => { setCourseQuery(item); setShowCourseSuggestions(false); }}
                      >
                        <Text style={styles.suggestionText}>{item}</Text>
                      </TouchableOpacity>
                    )}
                  />
                  {courseQuery.trim() !== "" && (
                    <TouchableOpacity
                      style={[styles.suggestionItem, styles.clearSuggestion]}
                      onPress={() => { setCourseQuery(""); setShowCourseSuggestions(false); }}
                    >
                      <Text style={[styles.suggestionText, { color: "#ef4444" }]}>✕  Limpar filtro</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* BOTTOM SHEET */}
      <Modal
        visible={!!selectedGroup}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedGroup(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheetContent}>
            <View style={styles.dragIndicator} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>
                  {selectedGroup
                    ? `${selectedGroup.users.length} pessoa${selectedGroup.users.length > 1 ? "s" : ""} nesta área`
                    : ""}
                </Text>
                {selectedGroup && (
                  <Text style={styles.sheetSubtitle}>CEP {selectedGroup.cep}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setSelectedGroup(null)} style={styles.closeX}>
                <Text style={styles.closeXText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {selectedGroup?.users.map((user) => {
                const isExpanded = expandedUserId === user.id;
                const locais = getLocais(user);
                const formacoes = getFormacoes(user);
                const color = colorFromId(user.id);

                return (
                  <View key={user.id} style={styles.userCard}>
                    <TouchableOpacity
                      style={styles.userRow}
                      onPress={() => setExpandedUserId(isExpanded ? null : user.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.avatar, { backgroundColor: color }]}>
                        <Text style={styles.avatarLetter}>
                          {(user.full_name || "?").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.userRowInfo}>
                        <Text style={styles.userName}>{user.full_name}</Text>
                        <Text style={styles.userSub}>
                          {user.cargo}{user.cargo && user.empresa ? " · " : ""}{user.empresa}
                        </Text>
                      </View>
                      <Text style={styles.chevron}>{isExpanded ? "▲" : "▼"}</Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        <TouchableOpacity style={styles.emailBtn} onPress={() => handleEmail(user.email)}>
                          <Text style={styles.emailBtnText}>📧  Enviar E-mail</Text>
                        </TouchableOpacity>

                        {/* Locais — tap faz zoom */}
                        {locais.length > 0 && (
                          <View style={styles.section}>
                            <Text style={styles.sectionTitle}> LOCAIS</Text>
                            {locais.map((loc, i) => (
                              <TouchableOpacity
                                key={i}
                                style={styles.localRow}
                                onPress={() => {
                                  const lat = Number(loc.latitude);
                                  const lon = Number(loc.longitude);
                                  if (!isFinite(lat) || !isFinite(lon)) return;
                                  setSelectedGroup(null);
                                  setTimeout(() => {
                                    cameraRef.current?.setCamera({
                                      centerCoordinate: [lon, lat],
                                      zoomLevel: 16,
                                      animationDuration: 500,
                                    });
                                  }, 300);
                                }}
                              >
                                <View style={styles.localIconBadge}>
                                  <Text style={styles.localIcon}>
                                    {loc.tipo_local === "Residencia" ? "🏠" : "💼"}
                                  </Text>
                                </View>
                                <View style={styles.localInfo}>
                                  <Text style={styles.localType}>
                                    {loc.nome_local || loc.tipo_local}
                                  </Text>
                                  <Text style={styles.localAddr}>{loc.endereco_nome}</Text>
                                  <Text style={styles.localCity}>
                                    {loc.municipio}, {loc.uf} · CEP {loc.cep}
                                  </Text>
                                </View>
                                <Text style={styles.localArrow}>›</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}

                        {/* Formação acadêmica */}
                        {formacoes.length > 0 && (
                          <View style={styles.section}>
                            <Text style={styles.sectionTitle}> FORMAÇÃO ACADÊMICA</Text>
                            {formacoes.map((f, i) => (
                              <View key={i} style={styles.formacaoRow}>
                                <Text style={styles.formacaoCurso}>{f.curso}</Text>
                                <Text style={styles.formacaoInst}>
                                  {f.instituicao}{f.periodo ? ` · ${f.periodo}` : ""}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#020617" },
  mapWrapper: { flex: 1 },
  mapHidden: { display: "none" },
  fullMap: { flex: 1 },

  markerContainer: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  markerBubble: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 2.5, borderColor: "#fff",
    justifyContent: "center", alignItems: "center",
    zIndex: 2, elevation: 4,
  },
  markerLabel: { color: "#fff", fontSize: 13, fontWeight: "800" },
  markerShadow: {
    position: "absolute", width: 42, height: 42,
    borderRadius: 21, opacity: 0.25, zIndex: 1,
  },

  searchOverlay: { position: "absolute", top: 12, left: 12, right: 12, zIndex: 100 },
  searchInput: {
    height: 42, borderRadius: 10, borderWidth: 1, borderColor: "#1e293b",
    paddingHorizontal: 12, color: "#f1f5f9",
    backgroundColor: "rgba(6,8,20,0.85)", fontSize: 14,
  },
  courseFilterWrapper: { position: "relative" },
  suggestionsBox: {
    backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#1e293b",
    borderRadius: 10, marginTop: 2, overflow: "hidden", maxHeight: 220,
  },
  suggestionItem: {
    paddingVertical: 10, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: "#1e293b",
  },
  clearSuggestion: { borderBottomWidth: 0 },
  suggestionText: { color: "#cbd5e1", fontSize: 13 },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#020617" },
  loadingSubtitle: { marginTop: 14, color: "#94a3b8", fontSize: 14 },
  blockedContainer: { flex: 1, backgroundColor: "#020617", justifyContent: "center", alignItems: "center", padding: 40 },
  blockedIconContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#1e293b", justifyContent: "center", alignItems: "center", marginBottom: 20,
  },
  blockedTitle: { fontSize: 22, fontWeight: "bold", color: "#f8fafc", marginBottom: 8 },
  blockedText: { textAlign: "center", color: "#94a3b8" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  sheetContent: {
    backgroundColor: "#0c1628", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: height * 0.82, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 0,
  },
  dragIndicator: {
    width: 38, height: 4, backgroundColor: "#334155",
    borderRadius: 2, alignSelf: "center", marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: "#f1f5f9" },
  sheetSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
  closeX: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#1e293b", justifyContent: "center", alignItems: "center",
  },
  closeXText: { color: "#94a3b8", fontSize: 13, fontWeight: "700" },

  userCard: {
    backgroundColor: "#111827", borderRadius: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#1e293b", overflow: "hidden",
  },
  userRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  avatarLetter: { color: "#fff", fontSize: 16, fontWeight: "800" },
  userRowInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "700", color: "#f1f5f9" },
  userSub: { fontSize: 12, color: "#64748b", marginTop: 1 },
  chevron: { color: "#475569", fontSize: 11, marginLeft: 8 },

  expandedContent: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: "#1e293b" },
  emailBtn: {
    backgroundColor: "#1d4ed8", padding: 11, borderRadius: 10,
    alignItems: "center", marginTop: 12, marginBottom: 14,
  },
  emailBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 10, fontWeight: "900", color: "#475569", letterSpacing: 1, marginBottom: 8 },

  localRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0f172a", borderRadius: 10, padding: 10, marginBottom: 6,
  },
  localIconBadge: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "#1e293b", justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  localIcon: { fontSize: 16 },
  localInfo: { flex: 1 },
  localType: { fontSize: 13, fontWeight: "700", color: "#cbd5e1" },
  localAddr: { fontSize: 12, color: "#94a3b8", marginTop: 1 },
  localCity: { fontSize: 11, color: "#475569", marginTop: 1 },
  localArrow: { color: "#3b82f6", fontSize: 20, marginLeft: 6 },

  formacaoRow: { backgroundColor: "#0f172a", borderRadius: 10, padding: 10, marginBottom: 6 },
  formacaoCurso: { fontSize: 13, fontWeight: "700", color: "#cbd5e1" },
  formacaoInst: { fontSize: 12, color: "#64748b", marginTop: 2 },
});