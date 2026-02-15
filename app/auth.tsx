import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    TextInput,
    Platform,
    ActivityIndicator,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
    Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession?.(); // Required for OAuth redirect on web

function parseParamsFromUrl(url: string): Record<string, string> {
    const out: Record<string, string> = {};
    try {
        const hash = url.includes("#") ? url.split("#")[1] : "";
        const query = url.includes("?") ? url.split("?")[1]?.split("#")[0] ?? "" : "";
        const parse = (s: string) => {
            s.split("&").forEach((p) => {
                const [k, v] = p.split("=");
                if (k && v) out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " "));
            });
        };
        if (hash) parse(hash);
        if (query) parse(query);
    } catch {}
    return out;
}

export default function AuthScreen() {
    const insets = useSafeAreaInsets();
    const { refreshUser } = useAuth();

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState<string | null>(null); // "apple" | "google" | "email" | null

    const topInset = Platform.OS === "web" ? 67 : insets.top;
    const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

    const handleOAuth = async (provider: "apple" | "google") => {
        if (!supabase || !isSupabaseConfigured) {
            Alert.alert("Not configured", "Add Supabase URL and anon key to use sign-in.");
            return;
        }
        setLoading(provider);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const redirectTo = makeRedirectUri({ path: "auth/callback", scheme: "stellaris" });
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: { redirectTo, skipBrowserRedirect: true },
            });
            if (error) throw error;
            if (!data?.url) {
                Alert.alert("Error", "Could not start sign-in.");
                return;
            }
            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
            if (result.type === "success" && result.url) {
                const params = parseParamsFromUrl(result.url);
                const access_token = params.access_token;
                const refresh_token = params.refresh_token;
                if (access_token) {
                    await supabase.auth.setSession({ access_token, refresh_token: refresh_token ?? "" });
                    await refreshUser();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    router.replace("/(tabs)");
                } else if (params.error_description) {
                    Alert.alert("Sign-in failed", params.error_description);
                }
            }
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Sign-in failed.");
        } finally {
            setLoading(null);
        }
    };

    const handleMagicLink = async () => {
        if (!supabase || !isSupabaseConfigured) {
            Alert.alert("Not configured", "Add Supabase URL and anon key to use sign-in.");
            return;
        }
        const trimmed = email.trim();
        if (!trimmed) {
            Alert.alert("Email required", "Enter your email to receive a sign-in link.");
            return;
        }
        setLoading("email");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const redirectTo = makeRedirectUri({ path: "auth/callback", scheme: "stellaris" });
            const { error } = await supabase.auth.signInWithOtp({
                email: trimmed,
                options: { emailRedirectTo: redirectTo },
            });
            if (error) throw error;
            Alert.alert("Check your email", "We sent you a sign-in link. Open it to continue.");
            setEmail("");
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Failed to send link.");
        } finally {
            setLoading(null);
        }
    };

    const handleSkip = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.replace("/(tabs)");
    };

    if (!isSupabaseConfigured) {
        return (
            <LinearGradient colors={["#0B1026", "#141A38", "#1C2451"]} style={styles.container}>
                <View style={[styles.inner, { paddingTop: topInset + 24, paddingBottom: bottomInset + 24 }]}>
                    <View style={styles.content}>
                        <View style={styles.logoSection}>
                            <View style={styles.logoIcon}>
                                <Ionicons name="globe-outline" size={56} color={Colors.dark.primary} />
                            </View>
                            <Text style={styles.title}>Welcome to Stellaris</Text>
                            <Text style={styles.subtitle}>Sign-in is not configured. Continue without an account to explore.</Text>
                        </View>
                        <Pressable style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.85 }]} onPress={handleSkip}>
                            <Text style={styles.skipText}>Continue without an account</Text>
                        </Pressable>
                    </View>
                </View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={["#0B1026", "#141A38", "#1C2451"]} style={styles.container}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.container}
                >
                    <View style={[styles.inner, { paddingTop: topInset + 24, paddingBottom: bottomInset + 24 }]}>
                        <View style={styles.content}>
                            <View style={styles.logoSection}>
                                <View style={styles.logoIcon}>
                                    <Ionicons name="globe-outline" size={56} color={Colors.dark.primary} />
                                </View>
                                <Text style={styles.title}>Welcome to Stellaris</Text>
                                <Text style={styles.subtitle}>Sign in to save your chart and find friends</Text>
                            </View>

                            <View style={styles.formSection}>
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.oauthButton,
                                        (loading === "apple" || loading === "google") && styles.buttonDisabled,
                                        pressed && styles.buttonPressed,
                                    ]}
                                    onPress={() => handleOAuth("apple")}
                                    disabled={!!loading}
                                >
                                    {loading === "apple" ? (
                                        <ActivityIndicator size="small" color={Colors.dark.background} />
                                    ) : (
                                        <>
                                            <Ionicons name="logo-apple" size={22} color={Colors.dark.background} />
                                            <Text style={styles.oauthButtonText}>Continue with Apple</Text>
                                        </>
                                    )}
                                </Pressable>
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.oauthButton,
                                        (loading === "apple" || loading === "google") && styles.buttonDisabled,
                                        pressed && styles.buttonPressed,
                                    ]}
                                    onPress={() => handleOAuth("google")}
                                    disabled={!!loading}
                                >
                                    {loading === "google" ? (
                                        <ActivityIndicator size="small" color={Colors.dark.background} />
                                    ) : (
                                        <>
                                            <Ionicons name="logo-google" size={20} color={Colors.dark.background} />
                                            <Text style={styles.oauthButtonText}>Continue with Google</Text>
                                        </>
                                    )}
                                </Pressable>

                                <View style={styles.divider}>
                                    <View style={styles.dividerLine} />
                                    <Text style={styles.dividerText}>or</Text>
                                    <View style={styles.dividerLine} />
                                </View>

                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="Email (magic link)"
                                    placeholderTextColor={Colors.dark.textMuted}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    returnKeyType="done"
                                    onSubmitEditing={handleMagicLink}
                                />
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.magicLinkButton,
                                        loading === "email" && styles.buttonDisabled,
                                        pressed && styles.buttonPressed,
                                    ]}
                                    onPress={handleMagicLink}
                                    disabled={loading === "email"}
                                >
                                    {loading === "email" ? (
                                        <ActivityIndicator size="small" color={Colors.dark.primary} />
                                    ) : (
                                        <Text style={styles.magicLinkButtonText}>Send magic link</Text>
                                    )}
                                </Pressable>

                                <Pressable style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.6 }]} onPress={handleSkip}>
                                    <Text style={styles.skipText}>Continue without an account</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: { flex: 1, paddingHorizontal: 24 },
    content: { flex: 1, justifyContent: "center" },
    logoSection: { alignItems: "center", marginBottom: 40 },
    logoIcon: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: "rgba(124, 58, 237, 0.12)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 24,
    },
    title: { fontSize: 28, fontFamily: "Outfit_700Bold", color: Colors.dark.text, marginBottom: 8 },
    subtitle: { fontSize: 15, fontFamily: "Outfit_400Regular", color: Colors.dark.textSecondary, textAlign: "center", lineHeight: 22 },
    formSection: { gap: 14 },
    oauthButton: {
        height: 52,
        borderRadius: 14,
        backgroundColor: Colors.dark.card,
        borderWidth: 1,
        borderColor: Colors.dark.cardBorder,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    oauthButtonText: { fontSize: 16, fontFamily: "Outfit_600SemiBold", color: Colors.dark.text },
    buttonDisabled: { opacity: 0.5 },
    buttonPressed: { opacity: 0.85 },
    divider: { flexDirection: "row", alignItems: "center", marginVertical: 8 },
    dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.12)" },
    dividerText: { marginHorizontal: 12, fontSize: 13, fontFamily: "Outfit_400Regular", color: Colors.dark.textMuted },
    input: {
        height: 52,
        backgroundColor: "rgba(255,255,255,0.07)",
        borderRadius: 14,
        paddingHorizontal: 18,
        fontSize: 16,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.text,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },
    magicLinkButton: {
        height: 52,
        borderRadius: 14,
        backgroundColor: Colors.dark.primary + "20",
        borderWidth: 1,
        borderColor: Colors.dark.primary + "50",
        alignItems: "center",
        justifyContent: "center",
    },
    magicLinkButtonText: { fontSize: 16, fontFamily: "Outfit_600SemiBold", color: Colors.dark.primary },
    skipButton: { alignItems: "center", paddingVertical: 20 },
    skipText: { fontSize: 14, fontFamily: "Outfit_400Regular", color: Colors.dark.textMuted },
});
