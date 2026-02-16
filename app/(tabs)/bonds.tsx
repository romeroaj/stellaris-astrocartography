/**
 * Friends & Bonds: Manage friends and run Synastry/Composite bond comparisons.
 * - Friends tab: List, search, requests | View Chart / View Insights (single friend)
 * - Bonds tab: Synastry/Composite type | Run Bond (compare two charts)
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Alert,
    Platform,
    TextInput,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Contacts from "expo-contacts";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/AuthContext";
import { useFriendView } from "@/lib/FriendViewContext";
import { authFetch } from "@/lib/auth";
import { getBigThreeSigns, abbrevSign } from "@/lib/zodiac";
import { lookupCityCoordinates } from "@/lib/cities";

/** Normalize phone to E.164 (US: +1XXXXXXXXXX). */
function normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (digits.length <= 10) return `+1${digits}`;
    return `+${digits}`;
}

interface UserResult {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
}

interface Friend {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    friendshipId: string;
    activeProfile: {
        id: string;
        name: string;
        birthDate: string;
        birthTime: string;
        locationName: string;
        latitude?: number;
        longitude?: number;
    } | null;
    isCustom?: boolean;
}

interface PendingRequest {
    id: string;
    user: UserResult;
    createdAt: string;
}

type MainTab = "friends" | "bonds";
type FriendsSubTab = "list" | "requests" | "search";
type BondType = "synastry" | "composite";

export default function FriendsBondsScreen() {
    const insets = useSafeAreaInsets();
    const { isLoggedIn } = useAuth();
    const [mainTab, setMainTab] = useState<MainTab>("friends");
    const [friendsSubTab, setFriendsSubTab] = useState<FriendsSubTab>("list");
    const [bondType, setBondType] = useState<BondType>("synastry");
    const [selectedBondFriend, setSelectedBondFriend] = useState<Friend | null>(null);

    const [friends, setFriends] = useState<Friend[]>([]);
    const [customFriends, setCustomFriends] = useState<Friend[]>([]);
    const [isPremium, setIsPremium] = useState(true);
    const [pending, setPending] = useState<PendingRequest[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [contactUsers, setContactUsers] = useState<UserResult[]>([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const topInset = Platform.OS === "web" ? 67 : insets.top;
    const searchLoadedRef = useRef(false);

    const loadFriends = useCallback(async () => {
        setLoading(true);
        try {
            const [friendsRes, pendingRes, premiumRes, customRes] = await Promise.all([
                authFetch<{ friends: any[] }>("GET", "/api/friends"),
                authFetch<{ requests: any[] }>("GET", "/api/friends/pending"),
                authFetch<{ premium: boolean }>("GET", "/api/me/premium"),
                authFetch<{ customFriends: any[] }>("GET", "/api/custom-friends").catch(() => ({ data: undefined, error: "Failed" })),
            ]);
            const raw = friendsRes.data?.friends || [];
            const normalized: Friend[] = raw.map((f: any) => ({
                id: f.user?.id ?? f.id,
                username: f.user?.username ?? f.username ?? "",
                displayName: f.user?.displayName ?? f.displayName ?? "Unknown",
                avatarUrl: f.user?.avatarUrl ?? f.avatarUrl ?? null,
                friendshipId: f.friendshipId ?? f.id,
                activeProfile: f.activeProfile ? {
                    ...f.activeProfile,
                    latitude: f.activeProfile.latitude ?? f.activeProfile.lat,
                    longitude: f.activeProfile.longitude ?? f.activeProfile.lon,
                    birthTime: f.activeProfile.birthTime ?? f.activeProfile.birth_time,
                } : null,
                isCustom: false,
            }));
            setFriends(normalized);
            setIsPremium(premiumRes.data?.premium ?? true);
            const cfRaw = customRes.data?.customFriends ?? (customRes.error ? [] : []);
            const cfNorm: Friend[] = cfRaw.map((cf: any) => ({
                id: `custom_${cf.id}`,
                username: "",
                displayName: cf.name,
                avatarUrl: null,
                friendshipId: cf.id,
                activeProfile: {
                    id: cf.id,
                    name: cf.name,
                    birthDate: cf.birthDate,
                    birthTime: cf.birthTime,
                    locationName: cf.locationName,
                    latitude: cf.latitude,
                    longitude: cf.longitude,
                },
                isCustom: true,
            }));
            setCustomFriends(cfNorm);
            setPending((pendingRes.data?.requests || []).map((p: any) => ({
                id: p.friendshipId ?? p.id,
                user: p.user ?? p.requester,
                createdAt: p.sentAt ?? p.createdAt ?? new Date().toISOString(),
            })));
        } catch { /* silent */ } finally { setLoading(false); }
    }, []);

    useFocusEffect(useCallback(() => {
        if (isLoggedIn) loadFriends();
    }, [isLoggedIn, loadFriends]));

    useEffect(() => {
        if (mainTab === "friends" && friendsSubTab === "search" && isLoggedIn && !searchLoadedRef.current) {
            searchLoadedRef.current = true;
            (async () => {
                setSearching(true);
                try {
                    const res = await authFetch<{ users: UserResult[] }>("GET", "/api/users/search?q=");
                    setSearchResults(res.data?.users || []);
                } catch { Alert.alert("Error", "Failed to load users."); }
                finally { setSearching(false); }
            })();
        }
        if (friendsSubTab !== "search") searchLoadedRef.current = false;
    }, [mainTab, friendsSubTab, isLoggedIn]);

    const handleSearch = async () => {
        const q = searchQuery.trim();
        setSearching(true);
        try {
            const res = await authFetch<{ users: UserResult[] }>("GET", `/api/users/search?q=${encodeURIComponent(q)}`);
            setSearchResults(res.data?.users || []);
        } catch { Alert.alert("Error", "Search failed."); }
        finally { setSearching(false); }
    };

    const handleImportContacts = async () => {
        setContactsLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission needed", "Allow access to contacts to find friends on Stellaris.");
                return;
            }
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers],
            });
            const phones: string[] = [];
            for (const c of data) {
                const nums = c.phoneNumbers ?? [];
                for (const n of nums) {
                    const p = n.number?.trim();
                    if (p && p.replace(/\D/g, "").length >= 10) {
                        phones.push(normalizePhone(p));
                    }
                }
            }
            const unique = [...new Set(phones)];
            if (unique.length === 0) {
                setContactUsers([]);
                return;
            }
            const res = await authFetch<{ users: UserResult[] }>("POST", "/api/users/by-phones", { phones: unique });
            setContactUsers(res.data?.users ?? []);
        } catch {
            Alert.alert("Error", "Could not load contacts.");
        } finally {
            setContactsLoading(false);
        }
    };

    const sendRequest = async (userId: string) => {
        setActionLoading(userId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const res = await authFetch("POST", "/api/friends/request", { addresseeId: userId });
            if (res.error) Alert.alert("Error", res.error);
            else {
                Alert.alert("Sent!", "Friend request sent.");
                setSearchResults((prev) => prev.filter((u) => u.id !== userId));
            }
        } catch { Alert.alert("Error", "Could not send request."); }
        finally { setActionLoading(null); }
    };

    const respondToRequest = async (friendshipId: string, accept: boolean) => {
        setActionLoading(friendshipId);
        Haptics.impactAsync(accept ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
        try {
            const res = await authFetch("POST", "/api/friends/respond", { friendshipId, action: accept ? "accept" : "block" });
            if (res.error) Alert.alert("Error", res.error);
            else loadFriends();
        } catch { Alert.alert("Error", "Failed to respond."); }
        finally { setActionLoading(null); }
    };

    const removeFriend = async (f: Friend) => {
        const isCustom = f.isCustom ?? f.id.startsWith("custom_");
        Alert.alert(
            isCustom ? "Remove Custom Friend" : "Remove Friend",
            `Are you sure you want to remove ${f.displayName}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        setActionLoading(f.id);
                        try {
                            if (isCustom) {
                                const cfId = f.id.startsWith("custom_") ? f.id.replace("custom_", "") : f.friendshipId;
                                await authFetch("DELETE", `/api/custom-friends/${cfId}`);
                            } else {
                                await authFetch("DELETE", `/api/friends/${f.id}`);
                            }
                            loadFriends();
                        } catch {
                            Alert.alert("Error", "Failed to remove.");
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    };

    const handleCreateCustomFriend = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!isPremium) {
            Alert.alert("Premium Required", "Custom friends are a premium feature. Upgrade to add birth charts for people without Stellaris accounts.");
            return;
        }
        router.push("/create-custom-friend");
    };

    const handleEditCustomFriend = (f: Friend) => {
        if (!f.isCustom) return;
        const cfId = f.id.startsWith("custom_") ? f.id.replace("custom_", "") : f.friendshipId;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/create-custom-friend", params: { editId: cfId } });
    };

    const { setFriendView } = useFriendView();

    const viewFriendChart = (friend: Friend) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setFriendView(friend.id, friend.displayName);
        router.navigate("/(tabs)");
    };

    const viewFriendInsights = (friend: Friend) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setFriendView(friend.id, friend.displayName);
        router.navigate("/(tabs)/insights");
    };

    const handleRunBond = () => {
        if (!selectedBondFriend) {
            Alert.alert("Select a Friend", "Choose a friend to create a bond with.");
            return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({
            pathname: "/bond-results",
            params: {
                bondType,
                partnerId: selectedBondFriend.id,
                partnerName: selectedBondFriend.displayName,
            },
        });
    };

    const formatDateNoYear = (dateStr: string) => {
        const [, m, d] = dateStr.split("-");
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
    };

    if (!isLoggedIn) {
        return (
            <View style={[styles.container, { paddingTop: topInset }]}>
                <View style={styles.header}>
                    <Text style={styles.screenTitle}>Friends & Bonds</Text>
                </View>
                <View style={styles.signInCta}>
                    <Text style={styles.signInCtaTitle}>Sign in to explore</Text>
                    <Text style={styles.signInCtaDesc}>
                        Add friends, view their charts, and compare your astrocartography with Synastry or Composite bonds.
                    </Text>
                    <Pressable style={({ pressed }) => [styles.ctaButton, pressed && { opacity: 0.85 }]} onPress={() => router.push("/auth")}>
                        <Text style={styles.ctaButtonText}>Sign In</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: topInset }]}>
            <View style={styles.header}>
                <Text style={styles.screenTitle}>Friends & Bonds</Text>
            </View>

            {/* Main tabs: Friends | Bonds */}
            <View style={styles.mainTabBar}>
                <Pressable
                    style={[styles.mainTabItem, mainTab === "friends" && styles.mainTabItemActive]}
                    onPress={() => { setMainTab("friends"); Haptics.selectionAsync(); }}
                >
                    <Text style={[styles.mainTabText, mainTab === "friends" && styles.mainTabTextActive]}>Friends</Text>
                </Pressable>
                <Pressable
                    style={[styles.mainTabItem, mainTab === "bonds" && styles.mainTabItemActive]}
                    onPress={() => { setMainTab("bonds"); Haptics.selectionAsync(); }}
                >
                    <Text style={[styles.mainTabText, mainTab === "bonds" && styles.mainTabTextActive]}>Bonds</Text>
                </Pressable>
            </View>

            {mainTab === "friends" ? (
                <>
                    {/* Friends sub-tabs */}
                    <View style={styles.subTabBar}>
                        {(["list", "requests", "search"] as FriendsSubTab[]).map((t) => (
                            <Pressable
                                key={t}
                                style={[styles.subTabItem, friendsSubTab === t && styles.subTabItemActive]}
                                onPress={() => { setFriendsSubTab(t); Haptics.selectionAsync(); }}
                            >
                                <Text style={[styles.subTabText, friendsSubTab === t && styles.subTabTextActive]}>
                                    {t === "list" ? "Friends" : t === "requests" ? `Requests${pending.length > 0 ? ` (${pending.length})` : ""}` : "Search"}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
                        {friendsSubTab === "list" && (
                            <>
                                <View style={styles.createCustomSection}>
                                    <Text style={styles.createCustomDesc}>Create unlimited friends, partners, and more.</Text>
                                    <Pressable
                                        style={({ pressed }) => [styles.createCustomBtn, pressed && { opacity: 0.85 }]}
                                        onPress={handleCreateCustomFriend}
                                    >
                                        <Text style={styles.createCustomBtnText}>Create a Custom Friend or Partner</Text>
                                    </Pressable>
                                </View>
                                {loading ? (
                                    <ActivityIndicator size="large" color={Colors.dark.primary} style={{ marginTop: 40 }} />
                                ) : (friends.length === 0 && customFriends.length === 0) ? (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="people-outline" size={48} color={Colors.dark.textMuted} />
                                        <Text style={styles.emptyTitle}>No friends yet</Text>
                                        <Text style={styles.emptyDesc}>Use Search to find and add friends, or create a custom friend above.</Text>
                                    </View>
                                ) : (
                                    [...friends, ...customFriends].map((f) => {
                                    const ap = f.activeProfile;
                                const lat = ap?.latitude ?? ap?.lat;
                                const lon = ap?.longitude ?? ap?.lon;
                                const coords = (lat != null && lon != null) ? { latitude: lat, longitude: lon }
                                    : (ap?.locationName ? lookupCityCoordinates(ap.locationName) : null);
                                const bigThree = ap ? getBigThreeSigns({
                                    birthDate: ap.birthDate,
                                    birthTime: ap.birthTime ?? (ap as any).birth_time,
                                    latitude: coords?.latitude,
                                    longitude: coords?.longitude,
                                }) : null;
                                return (
                                    <View key={f.id} style={styles.userCard}>
                                        <View style={styles.avatarSmall}>
                                            <Ionicons name="person" size={20} color={Colors.dark.primary} />
                                        </View>
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                            <Text style={styles.userName}>{f.displayName}</Text>
                                            <Text style={styles.userHandle}>{f.isCustom ? "Custom Friend" : `@${f.username}`}</Text>
                                            {f.activeProfile ? (
                                                <>
                                                    <Text style={styles.userMeta}>{formatDateNoYear(f.activeProfile.birthDate)} • {f.activeProfile.locationName}</Text>
                                                    {bigThree?.sun && (
                                                        <View style={styles.bigThreeRow}>
                                                            <Text style={styles.bigThreeText}>☀️ {abbrevSign(bigThree.sun)}</Text>
                                                            <Text style={styles.bigThreeDot}>•</Text>
                                                            <Text style={[styles.bigThreeText, !bigThree.moon && styles.bigThreeMuted]}>{bigThree.moon ? `🌙 ${abbrevSign(bigThree.moon)}` : "🌙 --"}</Text>
                                                            <Text style={styles.bigThreeDot}>•</Text>
                                                            <Text style={[styles.bigThreeText, !bigThree.rising && styles.bigThreeMuted]}>{bigThree.rising ? `↗️ ${abbrevSign(bigThree.rising)}` : "↗️ --"}</Text>
                                                        </View>
                                                    )}
                                                </>
                                            ) : (
                                                <Text style={styles.userMeta}>No birth profile yet</Text>
                                            )}
                                        </View>
                                        <View style={styles.friendActions}>
                                            {f.isCustom && (
                                                <Pressable style={({ pressed }) => [styles.actionBtnInfo, pressed && { opacity: 0.7 }]} onPress={() => handleEditCustomFriend(f)}>
                                                    <Ionicons name="create-outline" size={18} color={Colors.dark.primary} />
                                                </Pressable>
                                            )}
                                            <Pressable style={({ pressed }) => [styles.actionBtnInfo, pressed && { opacity: 0.7 }]} onPress={() => viewFriendChart(f)}>
                                                <Ionicons name="map-outline" size={18} color={Colors.dark.primary} />
                                            </Pressable>
                                            <Pressable style={({ pressed }) => [styles.actionBtnInfo, pressed && { opacity: 0.7 }]} onPress={() => viewFriendInsights(f)}>
                                                <Ionicons name="sparkles-outline" size={18} color={Colors.dark.primary} />
                                            </Pressable>
                                        </View>
                                        <Pressable style={({ pressed }) => [styles.actionBtnDanger, pressed && { opacity: 0.7 }]} onPress={() => removeFriend(f)} disabled={actionLoading === f.id}>
                                            {actionLoading === f.id ? <ActivityIndicator size="small" color={Colors.dark.danger} /> : <Ionicons name="person-remove-outline" size={18} color={Colors.dark.danger} />}
                                        </Pressable>
                                    </View>
                                );
                                    })
                                )}
                            </>
                        )}

                        {friendsSubTab === "requests" && (
                            loading ? <ActivityIndicator size="large" color={Colors.dark.primary} style={{ marginTop: 40 }} />
                            : pending.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="mail-outline" size={48} color={Colors.dark.textMuted} />
                                    <Text style={styles.emptyTitle}>No pending requests</Text>
                                </View>
                            ) : pending.map((p) => (
                                <View key={p.id} style={styles.userCard}>
                                    <View style={styles.avatarSmall}><Ionicons name="person" size={20} color={Colors.dark.primary} /></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.userName}>{p.user.displayName}</Text>
                                        <Text style={styles.userHandle}>@{p.user.username}</Text>
                                    </View>
                                    <View style={{ flexDirection: "row", gap: 8 }}>
                                        <Pressable style={({ p: pr }) => [styles.acceptBtn, pr && { opacity: 0.7 }]} onPress={() => respondToRequest(p.id, true)} disabled={actionLoading === p.id}>
                                            {actionLoading === p.id ? <ActivityIndicator size="small" color={Colors.dark.background} /> : <Ionicons name="checkmark" size={20} color={Colors.dark.background} />}
                                        </Pressable>
                                        <Pressable style={({ p: pr }) => [styles.declineBtn, pr && { opacity: 0.7 }]} onPress={() => respondToRequest(p.id, false)} disabled={actionLoading === p.id}>
                                            <Ionicons name="close" size={20} color={Colors.dark.danger} />
                                        </Pressable>
                                    </View>
                                </View>
                            ))
                        )}

                        {friendsSubTab === "search" && (
                            <View style={{ gap: 16 }}>
                                <Pressable
                                    style={({ pressed }) => [styles.importContactsBtn, pressed && { opacity: 0.85 }]}
                                    onPress={handleImportContacts}
                                    disabled={contactsLoading}
                                >
                                    {contactsLoading ? (
                                        <ActivityIndicator size="small" color={Colors.dark.primary} />
                                    ) : (
                                        <>
                                            <Ionicons name="people-outline" size={20} color={Colors.dark.primary} />
                                            <Text style={styles.importContactsText}>Find friends from contacts</Text>
                                        </>
                                    )}
                                </Pressable>
                                {contactUsers.length > 0 && (
                                    <View style={styles.contactsSection}>
                                        <Text style={styles.contactsSectionTitle}>On Stellaris</Text>
                                        {contactUsers.map((u) => (
                                            <View key={u.id} style={styles.userCard}>
                                                <View style={styles.avatarSmall}><Ionicons name="person" size={20} color={Colors.dark.primary} /></View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.userName}>{u.displayName}</Text>
                                                    <Text style={styles.userHandle}>@{u.username}</Text>
                                                </View>
                                                <Pressable style={({ p: pr }) => [styles.addBtn, pr && { opacity: 0.7 }]} onPress={() => sendRequest(u.id)} disabled={actionLoading === u.id}>
                                                    {actionLoading === u.id ? <ActivityIndicator size="small" color={Colors.dark.primary} /> : <Ionicons name="person-add-outline" size={18} color={Colors.dark.primary} />}
                                                </Pressable>
                                            </View>
                                        ))}
                                    </View>
                                )}
                                <View style={styles.searchRow}>
                                    <TextInput
                                        style={styles.searchInput}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholder="Search by username..."
                                        placeholderTextColor={Colors.dark.textMuted}
                                        autoCapitalize="none"
                                        returnKeyType="search"
                                        onSubmitEditing={handleSearch}
                                    />
                                    <Pressable style={({ p }) => [styles.searchBtn, p && { opacity: 0.85 }]} onPress={handleSearch}>
                                        {searching ? <ActivityIndicator size="small" color={Colors.dark.background} /> : <Ionicons name="search" size={20} color={Colors.dark.background} />}
                                    </Pressable>
                                </View>
                                {searchResults.map((u) => (
                                    <View key={u.id} style={styles.userCard}>
                                        <View style={styles.avatarSmall}><Ionicons name="person" size={20} color={Colors.dark.primary} /></View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.userName}>{u.displayName}</Text>
                                            <Text style={styles.userHandle}>@{u.username}</Text>
                                        </View>
                                        <Pressable style={({ p: pr }) => [styles.addBtn, pr && { opacity: 0.7 }]} onPress={() => sendRequest(u.id)} disabled={actionLoading === u.id}>
                                            {actionLoading === u.id ? <ActivityIndicator size="small" color={Colors.dark.primary} /> : <Ionicons name="person-add-outline" size={18} color={Colors.dark.primary} />}
                                        </Pressable>
                                    </View>
                                ))}
                                {searchResults.length === 0 && !searching && (
                                    <Text style={styles.noResults}>{searchQuery.trim() ? `No users found` : "Search for friends by username."}</Text>
                                )}
                            </View>
                        )}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </>
            ) : (
                /* Bonds tab */
                <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionTitle}>Bond Type</Text>
                    <Pressable style={[styles.eduCard, bondType === "synastry" && styles.eduCardActive]} onPress={() => { setBondType("synastry"); Haptics.selectionAsync(); }}>
                        <LinearGradient colors={bondType === "synastry" ? [Colors.dark.primary + "30", Colors.dark.card] : [Colors.dark.card, Colors.dark.card]} style={styles.eduGradient}>
                            <View style={styles.eduHeader}>
                                <Ionicons name={bondType === "synastry" ? "radio-button-on" : "radio-button-off"} size={20} color={bondType === "synastry" ? Colors.dark.primary : Colors.dark.textMuted} />
                                <Text style={styles.eduTitle}>Synastry</Text>
                            </View>
                            <Text style={styles.eduDesc}>How each of you individually feels in a location — short-term comfort, personal energy.</Text>
                        </LinearGradient>
                    </Pressable>
                    <Pressable style={[styles.eduCard, bondType === "composite" && styles.eduCardActive]} onPress={() => { setBondType("composite"); Haptics.selectionAsync(); }}>
                        <LinearGradient colors={bondType === "composite" ? [Colors.dark.secondary + "30", Colors.dark.card] : [Colors.dark.card, Colors.dark.card]} style={styles.eduGradient}>
                            <View style={styles.eduHeader}>
                                <Ionicons name={bondType === "composite" ? "radio-button-on" : "radio-button-off"} size={20} color={bondType === "composite" ? Colors.dark.secondary : Colors.dark.textMuted} />
                                <Text style={styles.eduTitle}>Composite</Text>
                            </View>
                            <Text style={styles.eduDesc}>Your merged energy — shared purpose and where you thrive as a unit over the long term.</Text>
                        </LinearGradient>
                    </Pressable>

                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                        {bondType === "synastry" ? "Select Friend" : "Select Partner"}
                    </Text>
                    {loading ? <ActivityIndicator size="small" color={Colors.dark.primary} style={{ marginTop: 20 }} />
                    : (friends.length === 0 && customFriends.length === 0) ? (
                        <View style={styles.noFriendsBox}>
                            <Text style={styles.noFriendsText}>Add friends or create a custom friend in the Friends tab first.</Text>
                        </View>
                    ) : (
                        <View style={styles.friendsGrid}>
                            {[...friends, ...customFriends].map((friend) => (
                                <Pressable
                                    key={friend.id}
                                    style={[styles.friendItem, selectedBondFriend?.id === friend.id && styles.friendItemActive]}
                                    onPress={() => { setSelectedBondFriend(friend); Haptics.selectionAsync(); }}
                                >
                                    <View style={[styles.bondAvatar, selectedBondFriend?.id === friend.id && styles.bondAvatarActive]}>
                                        <Ionicons name="person" size={20} color={selectedBondFriend?.id === friend.id ? Colors.dark.background : Colors.dark.textMuted} />
                                    </View>
                                    <Text style={[styles.friendName, selectedBondFriend?.id === friend.id && styles.friendNameActive]} numberOfLines={1}>{friend.displayName}</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                    <View style={{ height: 120 }} />
                </ScrollView>
            )}

            {mainTab === "bonds" && selectedBondFriend && (
                <View style={[styles.fabContainer, { paddingBottom: (insets.bottom || 0) + 70 }]}>
                    <Pressable style={({ pressed }) => [styles.runBtn, pressed && { transform: [{ scale: 0.98 }] }]} onPress={handleRunBond}>
                        <LinearGradient colors={[Colors.dark.primary, Colors.dark.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.runGradient}>
                            <Ionicons name="sparkles" size={20} color="#fff" />
                            <Text style={styles.runBtnText}>View {bondType === "synastry" ? "Harmony" : "Destiny"} with {selectedBondFriend.displayName.split(" ")[0]}</Text>
                        </LinearGradient>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.dark.background },
    header: { paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.dark.background },
    screenTitle: { fontSize: 28, fontFamily: "Outfit_700Bold", color: Colors.dark.text },
    mainTabBar: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 12 },
    mainTabItem: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: Colors.dark.card, borderWidth: 1, borderColor: Colors.dark.cardBorder },
    mainTabItemActive: { backgroundColor: Colors.dark.primaryMuted, borderColor: Colors.dark.primary },
    mainTabText: { fontSize: 15, fontFamily: "Outfit_500Medium", color: Colors.dark.textMuted },
    mainTabTextActive: { color: Colors.dark.primary, fontFamily: "Outfit_600SemiBold" },
    subTabBar: { flexDirection: "row", paddingHorizontal: 20, gap: 6, marginBottom: 8 },
    subTabItem: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: Colors.dark.surface },
    subTabItemActive: { backgroundColor: Colors.dark.primary + "18", borderWidth: 1, borderColor: Colors.dark.primary + "40" },
    subTabText: { fontSize: 13, fontFamily: "Outfit_500Medium", color: Colors.dark.textMuted },
    subTabTextActive: { color: Colors.dark.primary, fontFamily: "Outfit_600SemiBold" },
    content: { flex: 1 },
    contentInner: { paddingHorizontal: 20, paddingBottom: 40 },
    sectionTitle: { fontSize: 16, fontFamily: "Outfit_600SemiBold", color: Colors.dark.text, marginBottom: 12 },
    userCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.dark.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.dark.cardBorder },
    avatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.dark.primary + "18", alignItems: "center", justifyContent: "center" },
    userName: { fontSize: 15, fontFamily: "Outfit_600SemiBold", color: Colors.dark.text },
    userHandle: { fontSize: 13, fontFamily: "Outfit_400Regular", color: Colors.dark.textMuted },
    userMeta: { marginTop: 2, fontSize: 12, fontFamily: "Outfit_400Regular", color: Colors.dark.textSecondary },
    bigThreeRow: { flexDirection: "row", alignItems: "center", flexWrap: "nowrap", gap: 3, marginTop: 4 },
    bigThreeText: { fontSize: 11, fontFamily: "Outfit_500Medium", color: Colors.dark.primary },
    bigThreeMuted: { color: Colors.dark.textMuted },
    bigThreeDot: { fontSize: 10, color: Colors.dark.textMuted },
    friendActions: { flexDirection: "row", gap: 8 },
    actionBtnInfo: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.dark.primary + "12", alignItems: "center", justifyContent: "center" },
    actionBtnDanger: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.dark.danger + "12", alignItems: "center", justifyContent: "center" },
    addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.dark.primary + "15", alignItems: "center", justifyContent: "center" },
    acceptBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.dark.primary, alignItems: "center", justifyContent: "center" },
    declineBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.dark.danger + "15", alignItems: "center", justifyContent: "center" },
    searchRow: { flexDirection: "row", gap: 10 },
    searchInput: { flex: 1, backgroundColor: Colors.dark.card, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, fontSize: 15, fontFamily: "Outfit_400Regular", color: Colors.dark.text, borderWidth: 1, borderColor: Colors.dark.cardBorder },
    searchBtn: { width: 50, height: 48, borderRadius: 14, backgroundColor: Colors.dark.primary, alignItems: "center", justifyContent: "center" },
    noResults: { fontSize: 14, color: Colors.dark.textMuted, fontFamily: "Outfit_400Regular" },
    importContactsBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 20, backgroundColor: Colors.dark.primary + "15", borderRadius: 14, borderWidth: 1, borderColor: Colors.dark.primary + "40" },
    importContactsText: { fontSize: 15, fontFamily: "Outfit_600SemiBold", color: Colors.dark.primary },
    contactsSection: { gap: 8 },
    contactsSectionTitle: { fontSize: 14, fontFamily: "Outfit_600SemiBold", color: Colors.dark.textMuted, marginBottom: 4 },
    emptyState: { alignItems: "center", marginTop: 40, gap: 12 },
    emptyTitle: { fontSize: 18, fontFamily: "Outfit_600SemiBold", color: Colors.dark.text },
    emptyDesc: { fontSize: 14, fontFamily: "Outfit_400Regular", color: Colors.dark.textSecondary, textAlign: "center" },
    eduCard: { borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.dark.cardBorder, overflow: "hidden" },
    eduCardActive: { borderColor: Colors.dark.primary },
    eduGradient: { padding: 16 },
    eduHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
    eduTitle: { fontSize: 16, fontFamily: "Outfit_600SemiBold", color: Colors.dark.text },
    eduDesc: { fontSize: 14, fontFamily: "Outfit_400Regular", color: Colors.dark.textSecondary, lineHeight: 20, paddingLeft: 30 },
    friendsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    friendItem: { width: "30%", aspectRatio: 0.8, backgroundColor: Colors.dark.card, borderRadius: 12, alignItems: "center", justifyContent: "center", padding: 10, borderWidth: 1, borderColor: Colors.dark.cardBorder },
    friendItemActive: { borderColor: Colors.dark.primary, backgroundColor: Colors.dark.primary + "15" },
    bondAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.dark.surface, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    bondAvatarActive: { backgroundColor: Colors.dark.primary },
    friendName: { fontSize: 13, fontFamily: "Outfit_500Medium", color: Colors.dark.text, textAlign: "center" },
    friendNameActive: { color: Colors.dark.primary, fontFamily: "Outfit_600SemiBold" },
    noFriendsBox: { alignItems: "center", padding: 24, backgroundColor: Colors.dark.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.dark.cardBorder, borderStyle: "dashed" },
    noFriendsText: { color: Colors.dark.textMuted, fontFamily: "Outfit_400Regular" },
    fabContainer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, backgroundColor: Colors.dark.background, borderTopWidth: 1, borderTopColor: Colors.dark.cardBorder, paddingTop: 16 },
    runBtn: { borderRadius: 16, shadowColor: Colors.dark.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    runGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16 },
    runBtnText: { fontSize: 16, fontFamily: "Outfit_700Bold", color: "#fff" },
    createCustomSection: { marginBottom: 20, gap: 12 },
    createCustomDesc: { fontSize: 14, fontFamily: "Outfit_400Regular", color: Colors.dark.textSecondary, lineHeight: 20 },
    createCustomBtn: { backgroundColor: Colors.dark.text, borderRadius: 14, paddingVertical: 18, alignItems: "center" },
    createCustomBtnText: { fontSize: 16, fontFamily: "Outfit_600SemiBold", color: Colors.dark.background },
    signInCta: { alignItems: "center", padding: 32, gap: 16 },
    signInCtaTitle: { fontSize: 20, fontFamily: "Outfit_600SemiBold", color: Colors.dark.text },
    signInCtaDesc: { fontSize: 15, fontFamily: "Outfit_400Regular", color: Colors.dark.textSecondary, textAlign: "center", lineHeight: 22 },
    ctaButton: { backgroundColor: Colors.dark.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14 },
    ctaButtonText: { fontSize: 16, fontFamily: "Outfit_700Bold", color: Colors.dark.background },
});
