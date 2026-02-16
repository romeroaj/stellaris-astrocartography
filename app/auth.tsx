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
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function AuthScreen() {
    const insets = useSafeAreaInsets();
    const { refreshUser } = useAuth();

    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [pendingEmail, setPendingEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [justSignedIn, setJustSignedIn] = useState(false);

    const topInset = Platform.OS === "web" ? 67 : insets.top;
    const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

    const handleSendCode = async () => {
        if (!supabase || !isSupabaseConfigured) {
            Alert.alert("Not configured", "Add Supabase URL and anon key to use sign-in.");
            return;
        }
        const trimmed = email.trim();
        if (!trimmed) {
            Alert.alert("Email required", "Enter your email to receive a sign-in code.");
            return;
        }
        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const { error } = await supabase.auth.signInWithOtp({ email: trimmed });
            if (error) throw error;
            setPendingEmail(trimmed);
            setCode("");
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Failed to send code.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!supabase || !pendingEmail) return;
        const trimmed = code.trim();
        if (!trimmed || trimmed.length !== 6) {
            Alert.alert("Enter code", "Enter the 6-digit code from your email.");
            return;
        }
        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email: pendingEmail,
                token: trimmed,
                type: "email",
            });
            if (error) throw error;
            if (data.session) {
                const token = data.session.access_token;
                const baseUrl = (await import("@/lib/query-client")).getApiUrl();
                const meUrl = new URL("/api/auth/me", baseUrl);
                try {
                    const meRes = await fetch(meUrl.toString(), {
                        method: "GET",
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (!meRes.ok) {
                        const body = await meRes.text();
                        throw new Error(`${meRes.status}: ${body}`);
                    }
                    await refreshUser();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setJustSignedIn(true);
                    setTimeout(() => router.replace("/(tabs)"), 1200);
                } catch (e: any) {
                    Alert.alert(
                        "Connection issue",
                        `Sign-in worked, but the server call failed:\n${e?.message ?? "Unknown error"}\n\nAPI: ${meUrl.toString()}`
                    );
                }
            }
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Invalid or expired code.");
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setPendingEmail(null);
        setCode("");
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
                                {justSignedIn ? (
                                    <View style={styles.successBlock}>
                                        <View style={styles.successIcon}>
                                            <Ionicons name="checkmark-circle" size={56} color={Colors.dark.primary} />
                                        </View>
                                        <Text style={styles.successText}>Signed in!</Text>
                                    </View>
                                ) : pendingEmail ? (
                                    <>
                                        <Text style={styles.codePrompt}>
                                            Check your email for a 6-digit code
                                        </Text>
                                        <TextInput
                                            style={[styles.input, styles.codeInput]}
                                            value={code}
                                            onChangeText={setCode}
                                            placeholder="000000"
                                            placeholderTextColor={Colors.dark.textMuted}
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            autoFocus
                                            returnKeyType="done"
                                            onSubmitEditing={handleVerifyCode}
                                        />
                                        <Pressable
                                            style={({ pressed }) => [
                                                styles.magicLinkButton,
                                                loading && styles.buttonDisabled,
                                                pressed && styles.buttonPressed,
                                            ]}
                                            onPress={handleVerifyCode}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <ActivityIndicator size="small" color={Colors.dark.primary} />
                                            ) : (
                                                <Text style={styles.magicLinkButtonText}>Verify code</Text>
                                            )}
                                        </Pressable>
                                        <Pressable
                                            style={({ pressed }) => [styles.backLink, pressed && { opacity: 0.7 }]}
                                            onPress={handleBack}
                                        >
                                            <Text style={styles.backLinkText}>Use a different email</Text>
                                        </Pressable>
                                    </>
                                ) : (
                                    <>
                                        <TextInput
                                            style={styles.input}
                                            value={email}
                                            onChangeText={setEmail}
                                            placeholder="Email"
                                            placeholderTextColor={Colors.dark.textMuted}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            returnKeyType="done"
                                            onSubmitEditing={handleSendCode}
                                        />
                                        <Pressable
                                            style={({ pressed }) => [
                                                styles.magicLinkButton,
                                                loading && styles.buttonDisabled,
                                                pressed && styles.buttonPressed,
                                            ]}
                                            onPress={handleSendCode}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <ActivityIndicator size="small" color={Colors.dark.primary} />
                                            ) : (
                                                <Text style={styles.magicLinkButtonText}>Send code</Text>
                                            )}
                                        </Pressable>
                                    </>
                                )}

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
    buttonDisabled: { opacity: 0.5 },
    buttonPressed: { opacity: 0.85 },
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
    codePrompt: {
        fontSize: 14,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.textSecondary,
        textAlign: "center",
        marginBottom: 8,
    },
    codeInput: { textAlign: "center", fontSize: 24, letterSpacing: 8 },
    successBlock: { alignItems: "center", paddingVertical: 24 },
    successIcon: { marginBottom: 12 },
    successText: { fontSize: 20, fontFamily: "Outfit_600SemiBold", color: Colors.dark.primary },
    backLink: { alignItems: "center", paddingVertical: 12 },
    backLinkText: { fontSize: 14, fontFamily: "Outfit_400Regular", color: Colors.dark.textMuted },
    skipButton: { alignItems: "center", paddingVertical: 20 },
    skipText: { fontSize: 14, fontFamily: "Outfit_400Regular", color: Colors.dark.textMuted },
});
