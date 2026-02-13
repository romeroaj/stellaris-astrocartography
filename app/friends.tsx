/**
 * Friends screen: Search users, send/accept friend requests, view friends list.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    Pressable,
    ActivityIndicator,
    Alert,
    Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/AuthContext";
import { authFetch } from "@/lib/auth";

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
}

interface PendingRequest {
    id: string;
    requester: UserResult;
    createdAt: string;
}

type Tab = "friends" | "requests" | "search";

export default function FriendsScreen() {
    const insets = useSafeAreaInsets();
    const { isLoggedIn } = useAuth();
    const [tab, setTab] = useState<Tab>("friends");
    const [friends, setFriends] = useState<Friend[]>([]);
    const [pending, setPending] = useState<PendingRequest[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const topInset = Platform.OS === "web" ? 67 : insets.top;

    const loadFriends = useCallback(async () => {
        setLoading(true);
        try {
            const [friendsRes, pendingRes] = await Promise.all([
                authFetch<{ friends: Friend[] }>("GET", "/api/friends"),
                authFetch<{ requests: PendingRequest[] }>("GET", "/api/friends/pending"),
            ]);
            setFriends(friendsRes.data?.friends || []);
            setPending(pendingRes.data?.requests || []);
        } catch {
            // silent fail
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isLoggedIn) loadFriends();
    }, [isLoggedIn, loadFriends]);

    const handleSearch = async () => {
        setSearching(true);
        try {
            const q = searchQuery.trim();
            const res = await authFetch<{ users: UserResult[] }>(
                "GET",
                `/api/users/search?q=${encodeURIComponent(q)}`
            );
            setSearchResults(res.data?.users || []);
        } catch {
            Alert.alert("Error", "Search failed.");
        } finally {
            setSearching(false);
        }
    };

    const sendRequest = async (userId: string) => {
        setActionLoading(userId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const res = await authFetch("POST", "/api/friends/request", { addresseeId: userId });
            if (res.error) {
                Alert.alert("Error", res.error);
            } else {
                Alert.alert("Sent!", "Friend request sent.");
                // Remove from search results
                setSearchResults((prev) => prev.filter((u) => u.id !== userId));
            }
        } catch {
            Alert.alert("Error", "Could not send request.");
        } finally {
            setActionLoading(null);
        }
    };

    const respondToRequest = async (friendshipId: string, accept: boolean) => {
        setActionLoading(friendshipId);
        Haptics.impactAsync(accept ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
        try {
            const res = await authFetch("POST", `/api/friends/${friendshipId}/respond`, {
                accept,
            });
            if (res.error) {
                Alert.alert("Error", res.error);
            } else {
                loadFriends();
            }
        } catch {
            Alert.alert("Error", "Failed to respond.");
        } finally {
            setActionLoading(null);
        }
    };

    const removeFriend = async (friendshipId: string) => {
        Alert.alert("Remove Friend", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Remove",
                style: "destructive",
                onPress: async () => {
                    setActionLoading(friendshipId);
                    try {
                        await authFetch("DELETE", `/api/friends/${friendshipId}`);
                        loadFriends();
                    } catch {
                        Alert.alert("Error", "Failed to remove friend.");
                    } finally {
                        setActionLoading(null);
                    }
                },
            },
        ]);
    };

    if (!isLoggedIn) {
        return (
            <View style={[styles.container, { paddingTop: topInset + 12 }]}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={Colors.dark.text} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Friends</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={64} color={Colors.dark.textMuted} />
                    <Text style={styles.emptyTitle}>Sign in to add friends</Text>
                    <Text style={styles.emptyDesc}>
                        Create an account to search for friends, send requests, and view each other's maps.
                    </Text>
                    <Pressable
                        style={({ pressed }) => [styles.ctaButton, pressed && { opacity: 0.85 }]}
                        onPress={() => {
                            router.back();
                            setTimeout(() => router.push("/auth"), 300);
                        }}
                    >
                        <Text style={styles.ctaButtonText}>Sign In</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    const renderTabs = () => (
        <View style={styles.tabBar}>
            {(["friends", "requests", "search"] as Tab[]).map((t) => (
                <Pressable
                    key={t}
                    style={[styles.tabItem, tab === t && styles.tabItemActive]}
                    onPress={() => {
                        setTab(t);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                >
                    <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                        {t === "friends" ? "Friends" : t === "requests" ? `Requests${pending.length > 0 ? ` (${pending.length})` : ""}` : "Search"}
                    </Text>
                </Pressable>
            ))}
        </View>
    );

    const renderFriendsList = () => {
        if (loading) {
            return <ActivityIndicator size="large" color={Colors.dark.primary} style={{ marginTop: 40 }} />;
        }
        if (friends.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={48} color={Colors.dark.textMuted} />
                    <Text style={styles.emptyTitle}>No friends yet</Text>
                    <Text style={styles.emptyDesc}>Search for friends by username to get started!</Text>
                </View>
            );
        }
        return friends.map((f) => (
            <View key={f.friendshipId} style={styles.userCard}>
                <View style={styles.avatarSmall}>
                    <Ionicons name="person" size={20} color={Colors.dark.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{f.displayName}</Text>
                    <Text style={styles.userHandle}>@{f.username}</Text>
                </View>
                <Pressable
                    style={({ pressed }) => [styles.actionBtnDanger, pressed && { opacity: 0.7 }]}
                    onPress={() => removeFriend(f.friendshipId)}
                    disabled={actionLoading === f.friendshipId}
                >
                    {actionLoading === f.friendshipId ? (
                        <ActivityIndicator size="small" color={Colors.dark.danger} />
                    ) : (
                        <Ionicons name="person-remove-outline" size={18} color={Colors.dark.danger} />
                    )}
                </Pressable>
            </View>
        ));
    };

    const renderRequests = () => {
        if (loading) {
            return <ActivityIndicator size="large" color={Colors.dark.primary} style={{ marginTop: 40 }} />;
        }
        if (pending.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <Ionicons name="mail-outline" size={48} color={Colors.dark.textMuted} />
                    <Text style={styles.emptyTitle}>No pending requests</Text>
                    <Text style={styles.emptyDesc}>When someone sends you a friend request, it'll show up here.</Text>
                </View>
            );
        }
        return pending.map((p) => (
            <View key={p.id} style={styles.userCard}>
                <View style={styles.avatarSmall}>
                    <Ionicons name="person" size={20} color={Colors.dark.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{p.requester.displayName}</Text>
                    <Text style={styles.userHandle}>@{p.requester.username}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                        style={({ pressed }) => [styles.acceptBtn, pressed && { opacity: 0.7 }]}
                        onPress={() => respondToRequest(p.id, true)}
                        disabled={actionLoading === p.id}
                    >
                        {actionLoading === p.id ? (
                            <ActivityIndicator size="small" color={Colors.dark.background} />
                        ) : (
                            <Ionicons name="checkmark" size={20} color={Colors.dark.background} />
                        )}
                    </Pressable>
                    <Pressable
                        style={({ pressed }) => [styles.declineBtn, pressed && { opacity: 0.7 }]}
                        onPress={() => respondToRequest(p.id, false)}
                        disabled={actionLoading === p.id}
                    >
                        <Ionicons name="close" size={20} color={Colors.dark.danger} />
                    </Pressable>
                </View>
            </View>
        ));
    };

    const renderSearch = () => (
        <View style={{ gap: 16 }}>
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
                <Pressable
                    style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.85 }]}
                    onPress={handleSearch}
                >
                    {searching ? (
                        <ActivityIndicator size="small" color={Colors.dark.background} />
                    ) : (
                        <Ionicons name="search" size={20} color={Colors.dark.background} />
                    )}
                </Pressable>
            </View>
            {searchResults.map((u) => (
                <View key={u.id} style={styles.userCard}>
                    <View style={styles.avatarSmall}>
                        <Ionicons name="person" size={20} color={Colors.dark.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.userName}>{u.displayName}</Text>
                        <Text style={styles.userHandle}>@{u.username}</Text>
                    </View>
                    <Pressable
                        style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
                        onPress={() => sendRequest(u.id)}
                        disabled={actionLoading === u.id}
                    >
                        {actionLoading === u.id ? (
                            <ActivityIndicator size="small" color={Colors.dark.primary} />
                        ) : (
                            <Ionicons name="person-add-outline" size={18} color={Colors.dark.primary} />
                        )}
                    </Pressable>
                </View>
            ))}
            {searchResults.length === 0 && !searching && (
                <Text style={styles.noResults}>
                    {searchQuery.trim() ? `No users found matching "${searchQuery}"` : "Hit Search to see all users in the database."}
                </Text>
            )}
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: topInset + 12 }]}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={Colors.dark.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Friends</Text>
                <View style={{ width: 40 }} />
            </View>

            {renderTabs()}

            <ScrollView
                style={styles.scrollContent}
                contentContainerStyle={styles.scrollInner}
                showsVerticalScrollIndicator={false}
            >
                {tab === "friends" && renderFriendsList()}
                {tab === "requests" && renderRequests()}
                {tab === "search" && renderSearch()}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    closeBtn: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: "Outfit_700Bold",
        color: Colors.dark.text,
    },
    tabBar: {
        flexDirection: "row",
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 8,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
        backgroundColor: Colors.dark.card,
    },
    tabItemActive: {
        backgroundColor: Colors.dark.primary + "20",
        borderWidth: 1,
        borderColor: Colors.dark.primary + "40",
    },
    tabText: {
        fontSize: 14,
        fontFamily: "Outfit_500Medium",
        color: Colors.dark.textMuted,
    },
    tabTextActive: {
        color: Colors.dark.primary,
        fontFamily: "Outfit_600SemiBold",
    },
    scrollContent: { flex: 1 },
    scrollInner: { padding: 16, paddingBottom: 40 },
    userCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: Colors.dark.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.dark.cardBorder,
    },
    avatarSmall: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.dark.primary + "18",
        alignItems: "center",
        justifyContent: "center",
    },
    userName: {
        fontSize: 15,
        fontFamily: "Outfit_600SemiBold",
        color: Colors.dark.text,
    },
    userHandle: {
        fontSize: 13,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.textMuted,
    },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.dark.primary + "15",
        alignItems: "center",
        justifyContent: "center",
    },
    acceptBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.dark.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    declineBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.dark.danger + "15",
        alignItems: "center",
        justifyContent: "center",
    },
    actionBtnDanger: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.dark.danger + "12",
        alignItems: "center",
        justifyContent: "center",
    },
    searchRow: {
        flexDirection: "row",
        gap: 10,
    },
    searchInput: {
        flex: 1,
        backgroundColor: Colors.dark.card,
        borderRadius: 14,
        paddingHorizontal: 18,
        paddingVertical: 14,
        fontSize: 15,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.text,
        borderWidth: 1,
        borderColor: Colors.dark.cardBorder,
    },
    searchBtn: {
        width: 50,
        height: 50,
        borderRadius: 14,
        backgroundColor: Colors.dark.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    noResults: {
        fontSize: 14,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.textMuted,
        textAlign: "center",
        marginTop: 20,
    },
    emptyState: {
        alignItems: "center",
        gap: 12,
        marginTop: 60,
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: "Outfit_600SemiBold",
        color: Colors.dark.text,
    },
    emptyDesc: {
        fontSize: 14,
        fontFamily: "Outfit_400Regular",
        color: Colors.dark.textSecondary,
        textAlign: "center",
        lineHeight: 21,
    },
    ctaButton: {
        backgroundColor: Colors.dark.primary,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 40,
        marginTop: 8,
    },
    ctaButtonText: {
        fontSize: 16,
        fontFamily: "Outfit_700Bold",
        color: Colors.dark.background,
    },
});
