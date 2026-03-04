import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type MenuItemProps = {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    color?: string;
    onPress?: () => void;
    borderColor: string;
    tintColor: string;
    iconColor: string;
};

function MenuItem({ icon, label, color, onPress, borderColor, tintColor, iconColor }: MenuItemProps) {
    const itemColor = color || iconColor;
    return (
        <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: borderColor }]}
            onPress={onPress}
            activeOpacity={0.6}
        >
            <View style={styles.menuLeft}>
                <Ionicons name={icon} size={22} color={itemColor} />
                <ThemedText style={[styles.menuLabel, color ? { color } : undefined]}>
                    {label}
                </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={iconColor} />
        </TouchableOpacity>
    );
}

export default function AccountScreen() {
    const router = useRouter();
    const { profile, signOut, updateProfile } = useAuth();
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(profile?.name || '');

    const tintColor = useThemeColor({}, 'tint');
    const iconColor = useThemeColor({}, 'icon');
    const bgColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');

    const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2022' }, 'background');
    const borderColor = useThemeColor({ light: '#F0F2F5', dark: '#2A2D30' }, 'background');
    const inputBg = useThemeColor({ light: '#F4F6F8', dark: '#111314' }, 'background');

    const displayName = profile?.name || 'User';



    const handleSaveName = async () => {
        if (!nameInput.trim()) {
            Alert.alert('Error', 'Name cannot be empty');
            return;
        }
        const { error } = await updateProfile({ name: nameInput.trim() });
        console.log(error);
        if (error) {
            Alert.alert('Error', error);
        } else {
            setEditingName(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: () => signOut(),
            },
        ]);
    };

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: bgColor }]}>
                <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                    Account
                </ThemedText>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: cardBg }]}>
                    <View style={[styles.avatar, { backgroundColor: tintColor }]}>
                        <ThemedText style={styles.avatarText} lightColor="#fff" darkColor="#000">
                            {displayName.charAt(0).toUpperCase()}
                        </ThemedText>
                    </View>
                    <View style={styles.profileInfo}>
                        {editingName ? (
                            <View style={styles.editNameRow}>
                                <TextInput
                                    style={[styles.nameInput, { backgroundColor: inputBg, color: textColor }]}
                                    value={nameInput}
                                    onChangeText={setNameInput}
                                    placeholder="Enter your name"
                                    placeholderTextColor={iconColor}
                                    autoFocus
                                    onSubmitEditing={handleSaveName}
                                />
                                <TouchableOpacity onPress={handleSaveName}>
                                    <Ionicons name="checkmark-circle" size={28} color="#2ECC71" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setEditingName(false)}>
                                    <Ionicons name="close-circle" size={28} color="#E74C3C" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <ThemedText type="defaultSemiBold" style={styles.greeting}>
                                    Hello, {displayName}!
                                </ThemedText>
                                <ThemedText style={[styles.profileSubtext, { color: iconColor }]}>
                                    {profile?.phone || 'No phone'}
                                </ThemedText>
                            </>
                        )}
                    </View>
                    {!editingName && (
                        <TouchableOpacity
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            onPress={() => {
                                setNameInput(profile?.name || '');
                                setEditingName(true);
                            }}
                        >
                            <Ionicons name="create-outline" size={22} color={tintColor} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Menu Section */}
                <View style={[styles.menuSection, { backgroundColor: cardBg }]}>
                    <MenuItem
                        icon="location-outline"
                        label="Manage Addresses"
                        borderColor={borderColor}
                        tintColor={tintColor}
                        iconColor={iconColor}
                        onPress={() => router.push('/addresses')}
                    />
                    <MenuItem
                        icon="call-outline"
                        label={profile?.phone || 'Phone'}
                        borderColor={borderColor}
                        tintColor={tintColor}
                        iconColor={iconColor}
                    />
                    <MenuItem
                        icon="help-circle-outline"
                        label="Help & Support"
                        borderColor={borderColor}
                        tintColor={tintColor}
                        iconColor={iconColor}
                    />
                    <MenuItem
                        icon="information-circle-outline"
                        label="About Us"
                        borderColor="transparent"
                        tintColor={tintColor}
                        iconColor={iconColor}
                    />
                </View>

                {/* Danger Zone */}
                <View style={[styles.menuSection, { backgroundColor: cardBg }]}>
                    <MenuItem
                        icon="log-out-outline"
                        label="Logout"
                        color="#E74C3C"
                        borderColor="transparent"
                        tintColor={tintColor}
                        iconColor={iconColor}
                        onPress={handleLogout}
                    />
                </View>

                {/* App Version */}
                <ThemedText style={[styles.version, { color: iconColor }]}>
                    FishApp v1.0.0
                </ThemedText>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    headerTitle: {
        fontSize: 22,
        letterSpacing: -0.3,
    },
    scrollContent: {
        padding: 20,
        gap: 16,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 16,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '700',
    },
    profileInfo: {
        flex: 1,
        gap: 2,
    },
    greeting: {
        fontSize: 18,
    },
    profileSubtext: {
        fontSize: 13,
    },
    editNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    nameInput: {
        flex: 1,
        height: 40,
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 15,
    },
    menuSection: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    menuLabel: {
        fontSize: 15,
    },
    version: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
    },
});
