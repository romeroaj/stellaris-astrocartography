import React, { useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    TextInput,
    Platform,
    ActivityIndicator,
    Animated as RNAnimated,
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
import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/AuthContext";
import { authFetch, type AuthUser } from "@/lib/auth";

// Complete any in-progress auth sessions (needed for Google)
WebBrowser.maybeCompleteAuthSession();

// Google OAuth discovery document
const googleDiscovery = AuthSession.useAutoDiscovery("https://accounts.google.com");

type Step = "choose" | "email" | "check-inbox";

export default function AuthScreen() {
    const insets = useSafeAreaInsets();
    const { login } = useAuth();
    const [step, setStep] = useState<Step>("choose");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState<"apple" | "google" | null>(null);
    const fadeAnim = useRef(new RNAnimated.Value(1)).current;

    const topInset = Platform.OS === "web" ? 67 : insets.top;
    const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

    const animateStep = (next: Step) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        RNAnimated.sequence([
            RNAnimated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            RNAnimated.timing(fadeAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();
        setTimeout(() => setStep(next), 150);
    };

    // ── Email Magic Link ──────────────────────────────────────────────

    const handleEmailLogin = async () => {
        if (!email.trim() || !email.includes("@")) return;
        setLoading(true);
        try {
            const res = await authFetch("POST", "/api/auth/register", {
                email: email.trim(),
            });
            if (res.error) {
                Alert.alert("Error", res.error);
            } else {
                animateStep("check-inbox");
            }
        } catch {
            Alert.alert("Error", "Could not send login email. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // ── Apple Sign In ─────────────────────────────────────────────────

    const handleAppleLogin = async () => {
        if (socialLoading) return;
        setSocialLoading("apple");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            if (!credential.identityToken) {
                Alert.alert("Error", "Apple did not return an identity token.");
                return;
            }

            // Build display name from Apple's fullName (only sent on first sign-in)
            let displayName: string | undefined;
            if (credential.fullName?.givenName) {
                displayName = [credential.fullName.givenName, credential.fullName.familyName]
                    .filter(Boolean)
                    .join(" ");
            }

            const res = await authFetch<{ token: string; user: AuthUser }>(
                "POST",
                "/api/auth/social",
                {
                    provider: "apple",
                    idToken: credential.identityToken,
                    displayName,
                }
            );

            if (res.error || !res.data) {
                Alert.alert("Sign In Failed", res.error || "Could not authenticate with Apple.");
                return;
            }

            await login(res.data.token, res.data.user);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace("/(tabs)");
        } catch (e: any) {
            if (e.code === "ERR_CANCELED") {
                // User cancelled — do nothing
            } else {
                Alert.alert("Error", "Apple Sign In failed. Please try again.");
            }
        } finally {
            setSocialLoading(null);
        }
    };

    // ── Google Sign In ────────────────────────────────────────────────

    const handleGoogleLogin = async () => {
        if (socialLoading) return;
        setSocialLoading("google");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            // Use AuthSession with Google's discovery document
            const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

            if (!clientId) {
                Alert.alert(
                    "Not Configured",
                    "Google Sign In requires a client ID. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID."
                );
                return;
            }

            const redirectUri = AuthSession.makeRedirectUri({
                scheme: "stellaris",
            });

            const request = new AuthSession.AuthRequest({
                clientId,
                redirectUri,
                scopes: ["openid", "email", "profile"],
                responseType: AuthSession.ResponseType.IdToken,
            });

            const result = await request.promptAsync(
                googleDiscovery ?? { authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth" }
            );

            if (result.type === "success" && result.params.id_token) {
                const res = await authFetch<{ token: string; user: AuthUser }>(
                    "POST",
                    "/api/auth/social",
                    {
                        provider: "google",
                        idToken: result.params.id_token,
                    }
                );

                if (res.error || !res.data) {
                    Alert.alert("Sign In Failed", res.error || "Could not authenticate with Google.");
                    return;
                }

                await login(res.data.token, res.data.user);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.replace("/(tabs)");
            } else if (result.type === "cancel") {
                // User cancelled
            } else {
                Alert.alert("Error", "Google Sign In failed. Please try again.");
            }
        } catch (e: any) {
            Alert.alert("Error", e.message || "Google Sign In failed.");
        } finally {
            setSocialLoading(null);
        }
    };

    const handleSkip = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.replace("/(tabs)");
    };

    const isDisabled = !!socialLoading || loading;

    const renderChoose = () => (
        <View style={styles.content}>
            {/* Logo area */}
            <View style={styles.logoSection}>
                <View style={styles.logoIcon}>
                    <Ionicons name="globe-outline" size={56} color={Colors.dark.primary} />
                </View>
                <Text style={styles.title}>Welcome to Stellaris</Text>
                <Text style={styles.subtitle}>
                    Sign in to sync your charts across devices, connect with friends, and
                    unlock social features.
                </Text>
            </View>

            {/* Auth buttons */}
            <View style={styles.buttonSection}>
                {/* Apple Sign In — iOS only */}
                {Platform.OS === "ios" && (
                    <Pressable
                        style={({ pressed }) => [
                            styles.socialButton,
                            styles.appleButton,
                            (pressed || socialLoading === "apple") && { opacity: 0.85 },
                        ]}
                        onPress={handleAppleLogin}
                        disabled={isDisabled}
                    >
                        {socialLoading === "apple" ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
                                <Text style={[styles.socialButtonText, { color: "#FFFFFF" }]}>
                                    Continue with Apple
                                </Text>
                            </>
                        )}
                    </Pressable>
                )}

                {/* Google Sign In */}
                <Pressable
                    style={({ pressed }) => [
                        styles.socialButton,
                        styles.googleButton,
                        (pressed || socialLoading === "google") && { opacity: 0.85 },
                    ]}
                    onPress={handleGoogleLogin}
                    disabled={isDisabled}
                >
                    {socialLoading === "google" ? (
                        <ActivityIndicator size="small" color={Colors.dark.text} />
                    ) : (
                        <>
                            <Ionicons name="logo-google" size={20} color="#EA4335" />
                            <Text style={styles.socialButtonText}>Continue with Google</Text>
                        </>
                    )}
                </Pressable>

                {/* Divider */}
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Email */}
                <Pressable
                    style={({ pressed }) => [
                        styles.emailButton,
                        pressed && { opacity: 0.85 },
                    ]}
                    onPress={() => animateStep("email")}
                    disabled={isDisabled}
                >
                    <Ionicons name="mail-outline" size={20} color={Colors.dark.primary} />
                    <Text style={styles.emailButtonText}>Sign in with Email</Text>
                </Pressable>

                {/* Skip */}
                <Pressable
                    style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.6 }]}
                    onPress={handleSkip}
                >
                    <Text style={styles.skipText}>Continue without an account</Text>
                </Pressable>
            </View>
        </View>
    );

    const renderEmail = () => (
        <View style={styles.content}>
            <View style={styles.emailFormSection}>
                <Pressable style={styles.backButton} onPress={() => animateStep("choose")}>
                    <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
                </Pressable>
                <Text style={styles.emailTitle}>Enter your email</Text>
                <Text style={styles.emailSubtitle}>
                    We'll send you a magic link — no password needed.
                </Text>
                <TextInput
                    style={styles.emailInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    placeholderTextColor={Colors.dark.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoFocus
                    returnKeyType="send"
                    onSubmitEditing={handleEmailLogin}
                />
                <Pressable
                    style={({ pressed }) => [
                        styles.sendButton,
                        (!email.includes("@") || loading) && styles.buttonDisabled,
                        pressed && styles.buttonPressed,
                    ]}
                    onPress={handleEmailLogin}
                    disabled={!email.includes("@") || loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color={Colors.dark.background} />
                    ) : (
                        <>
                            <Text style={styles.sendButtonText}>Send Magic Link</Text>
                            <Ionicons name="arrow-forward" size={20} color={Colors.dark.background} />
                        </>
                    )}
                </Pressable>
            </View>
        </View>
    );

    const renderCheckInbox = () => (
        <View style={styles.content}>
            <View style={styles.checkInboxSection}>
                <View style={styles.checkIcon}>
                    <Ionicons name="mail-open-outline" size={56} color="#10B981" />
                </View>
                <Text style={styles.emailTitle}>Check your inbox</Text>
                <Text style={styles.emailSubtitle}>
                    We sent a sign-in link to{"\n"}
                    <Text style={{ color: Colors.dark.primary, fontFamily: "Outfit_600SemiBold" }}>
                        {email}
                    </Text>
                </Text>
                <Text style={styles.checkHint}>
                    Tap the link in the email to sign in instantly. The link expires in 15
                    minutes.
                </Text>
                <Pressable
                    style={({ pressed }) => [
                        styles.emailButton,
                        pressed && { opacity: 0.85 },
                    ]}
                    onPress={() => animateStep("email")}
                >
                    <Ionicons name="refresh" size={18} color={Colors.dark.primary} />
                    <Text style={styles.emailButtonText}>Try a different email</Text>
                </Pressable>
                <Pressable
                    style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.6 }]}
                    onPress={handleSkip}
                >
                    <Text style={styles.skipText}>Continue without an account</Text>
                </Pressable>
            </View>
        </View>
    );

    return (
        <LinearGradient
            colors={["#0B1026", "#141A38", "#1C2451"]}
            style={styles.container}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.container}
                >
                    <RNAnimated.View
                        style={[
                            styles.inner,
                            {
                                paddingTop: topInset + 24,
                                paddingBottom: bottomInset + 24,
                                opacity: fadeAnim,
                            },
                        ]}
                    >
                        {step === "choose"
                            ? renderChoose()
                            : step === "email"
                                ? renderEmail()
                                : renderCheckInbox()}
                    </RNAnimated.View>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: { flex: 1, paddingHorizontal: 24 },
    content: { flex: 1, justifyContent: "center" },

    // ── Choose Step ──
    logoSection: {
        alignItems: "center",
        gap: 12,
        marginBottom: 48,
    },
    logoIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.dark.primary + "15",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    title: {
        fontSize: 30,
        fontFamily: "Outfit_700Bold",
        color: Colors.dark.text,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 15,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.textSecondary,
        textAlign: "center",
        lineHeight: 23,
        paddingHorizontal: 16,
    },
    buttonSection: { gap: 12 },
    socialButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingVertical: 16,
        borderRadius: 14,
    },
    appleButton: {
        backgroundColor: "#000000",
    },
    googleButton: {
        backgroundColor: Colors.dark.card,
        borderWidth: 1,
        borderColor: Colors.dark.cardBorder,
    },
    socialButtonText: {
        fontSize: 16,
        fontFamily: "Outfit_600SemiBold",
        color: Colors.dark.text,
    },
    divider: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        marginVertical: 4,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.dark.cardBorder,
    },
    dividerText: {
        fontSize: 13,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.textMuted,
    },
    emailButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingVertical: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.dark.primary + "40",
        backgroundColor: Colors.dark.primary + "10",
    },
    emailButtonText: {
        fontSize: 16,
        fontFamily: "Outfit_600SemiBold",
        color: Colors.dark.primary,
    },
    skipButton: {
        alignItems: "center",
        paddingVertical: 12,
    },
    skipText: {
        fontSize: 14,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.textMuted,
    },

    // ── Email Step ──
    backButton: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    emailFormSection: { gap: 12 },
    emailTitle: {
        fontSize: 28,
        fontFamily: "Outfit_700Bold",
        color: Colors.dark.text,
    },
    emailSubtitle: {
        fontSize: 15,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.textSecondary,
        lineHeight: 23,
        marginBottom: 8,
    },
    emailInput: {
        backgroundColor: Colors.dark.card,
        borderRadius: 14,
        paddingHorizontal: 18,
        paddingVertical: 16,
        fontSize: 17,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.text,
        borderWidth: 1,
        borderColor: Colors.dark.cardBorder,
    },
    sendButton: {
        backgroundColor: Colors.dark.primary,
        borderRadius: 14,
        paddingVertical: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    sendButtonText: {
        fontSize: 16,
        fontFamily: "Outfit_700Bold",
        color: Colors.dark.background,
    },
    buttonDisabled: { opacity: 0.4 },
    buttonPressed: { transform: [{ scale: 0.98 }] },

    // ── Check Inbox Step ──
    checkInboxSection: {
        alignItems: "center",
        gap: 14,
    },
    checkIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "rgba(16, 185, 129, 0.12)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    checkHint: {
        fontSize: 14,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.textMuted,
        textAlign: "center",
        lineHeight: 21,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
});
