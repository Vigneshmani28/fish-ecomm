import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { Address } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type FormMode = 'list' | 'add' | 'edit';

const LABEL_OPTIONS = ['Home', 'Work', 'Other'];

export default function AddressesScreen() {
    const router = useRouter();
    const { session, profile } = useAuth();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mode, setMode] = useState<FormMode>('list');
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [line1, setLine1] = useState('');
    const [line2, setLine2] = useState('');
    const [landmark, setLandmark] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [pincode, setPincode] = useState('');
    const [isDefault, setIsDefault] = useState(false);

    const tintColor = useThemeColor({}, 'tint');
    const iconColor = useThemeColor({}, 'icon');
    const bgColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2022' }, 'background');
    const borderColor = useThemeColor({ light: '#F0F2F5', dark: '#2A2D30' }, 'background');
    const inputBg = useThemeColor({ light: '#F4F6F8', dark: '#1E2022' }, 'background');
    const inputBorder = useThemeColor({ light: '#E0E4E8', dark: '#2C2F33' }, 'background');

    const fetchAddresses = useCallback(async () => {
        if (!session?.user) return;
        try {
            const { data, error } = await supabase
                .from('addresses')
                .select('*')
                .eq('user_id', session.user.id)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

            if (!error && data) {
                setAddresses(data as Address[]);
            }
        } catch (err) {
            console.error('Error fetching addresses:', err);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        fetchAddresses();
    }, [fetchAddresses]);

    const resetForm = () => {
        setName(profile?.name || '');
        setPhone(profile?.phone || '');
        setLine1('');
        setLine2('');
        setLandmark('');
        setCity('');
        setState('');
        setPincode('');
        setIsDefault(addresses.length === 0);
        setEditingId(null);
    };

    const openAddForm = () => {
        resetForm();
        setMode('add');
    };

    const openEditForm = (addr: Address) => {
        setName(addr.full_name);
        setPhone(addr.phone);
        setLine1(addr.line1);
        setLine2(addr.line2 || '');
        setLandmark(addr.landmark || '');
        setCity(addr.city);
        setState(addr.state || '');
        setPincode(addr.pincode);
        setIsDefault(addr.is_default);
        setEditingId(addr.id);
        setMode('edit');
    };

    const handleSave = async () => {
        if (
            !name.trim() ||
            !phone.trim() ||
            !line1.trim() ||
            !city.trim() ||
            !pincode.trim()
        ) {
            Alert.alert('Missing Fields', 'Please fill in all required fields.');
            return;
        }

        if (!session?.user) return;

        setSaving(true);

        try {
            // If this address is default, unset other defaults
            if (isDefault) {
                const { error: unsetError } = await supabase
                    .from('addresses')
                    .update({ is_default: false })
                    .eq('user_id', session.user.id);

                if (unsetError) throw unsetError;
            }

            const addressData = {
                user_id: session.user.id,
                full_name: name.trim(),
                phone: phone.trim(),
                line1: line1.trim(),
                line2: line2?.trim() || null,
                city: city.trim(),
                state: state?.trim() || null,
                pincode: pincode.trim(),
                landmark: landmark?.trim() || null,
                is_default: isDefault,
            };

            if (mode === 'edit' && editingId) {
                const { error } = await supabase
                    .from('addresses')
                    .update(addressData)
                    .eq('id', editingId)
                    .eq('user_id', session.user.id); // 🔒 security

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('addresses')
                    .insert(addressData);

                if (error) throw error;
            }

            await fetchAddresses();
            setMode('list');

        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save address.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (addr: Address) => {
        Alert.alert(
            'Delete Address',
            `Are you sure you want to delete "${addr.label}" address?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await supabase.from('addresses').delete().eq('id', addr.id);
                            await fetchAddresses();
                        } catch (err: any) {
                            Alert.alert('Error', err.message);
                        }
                    },
                },
            ]
        );
    };

    const handleSetDefault = async (addr: Address) => {
        if (!session?.user) return;
        try {
            await supabase
                .from('addresses')
                .update({ is_default: false })
                .eq('user_id', session.user.id);
            await supabase
                .from('addresses')
                .update({ is_default: true })
                .eq('id', addr.id);
            await fetchAddresses();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    const getLabelIcon = (l: string): keyof typeof Ionicons.glyphMap => {
        switch (l) {
            case 'Home': return 'home';
            case 'Work': return 'briefcase';
            default: return 'location';
        }
    };

    const formatAddress = (addr: Address) => {
        const parts = [];
        if (addr.line1) parts.push(addr.line1);
        if (addr.line2) parts.push(addr.line2);
        if (addr.landmark) parts.push(addr.landmark);
        const firstLine = parts.join(', ');
        const secondLine = `${addr.city}${addr.state ? `, ${addr.state}` : ''} - ${addr.pincode}`;
        return { firstLine, secondLine };
    };

    if (loading) {
        return (
            <ThemedView style={styles.container}>
                <View style={[styles.header, { backgroundColor: bgColor }]}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={tintColor} />
                    </TouchableOpacity>
                    <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                        My Addresses
                    </ThemedText>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={tintColor} />
                </View>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: bgColor }]}>
                <TouchableOpacity onPress={() => mode !== 'list' ? setMode('list') : router.back()}>
                    <Ionicons name="arrow-back" size={24} color={tintColor} />
                </TouchableOpacity>
                <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                    {mode === 'list' ? 'My Addresses' : mode === 'add' ? 'Add Address' : 'Edit Address'}
                </ThemedText>
                <View style={{ width: 24 }} />
            </View>

            {mode === 'list' ? (
                <>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {addresses.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="location-outline" size={56} color={iconColor} />
                                <ThemedText type="subtitle" style={{ marginTop: 16 }}>
                                    No saved addresses
                                </ThemedText>
                                <ThemedText style={{ color: iconColor, marginTop: 6, textAlign: 'center' }}>
                                    Add an address to make checkout faster
                                </ThemedText>
                            </View>
                        ) : (
                            addresses.map((addr) => {
                                const { firstLine, secondLine } = formatAddress(addr);
                                return (
                                    <View
                                        key={addr.id}
                                        style={[
                                            styles.addressCard,
                                            {
                                                backgroundColor: cardBg,
                                                borderColor: addr.is_default ? tintColor : borderColor,
                                                borderWidth: addr.is_default ? 1.5 : 1,
                                            },
                                        ]}
                                    >
                                        <View style={styles.addressTop}>
                                            <View style={styles.addressLabelRow}>
                                                <View style={[styles.labelBadge, { backgroundColor: `${tintColor}15` }]}>
                                                    <Ionicons name={getLabelIcon(addr.label)} size={14} color={tintColor} />
                                                    <ThemedText type="defaultSemiBold" style={{ fontSize: 13, color: tintColor }}>
                                                        {addr.label}
                                                    </ThemedText>
                                                </View>
                                                {addr.is_default && (
                                                    <View style={[styles.defaultBadge, { backgroundColor: '#2ECC7120' }]}>
                                                        <ThemedText style={{ fontSize: 11, color: '#2ECC71', fontWeight: '600' }}>
                                                            Default
                                                        </ThemedText>
                                                    </View>
                                                )}
                                            </View>
                                            <View style={styles.addressActions}>
                                                <TouchableOpacity
                                                    onPress={() => openEditForm(addr)}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                >
                                                    <Ionicons name="create-outline" size={18} color={tintColor} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => handleDelete(addr)}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                >
                                                    <Ionicons name="trash-outline" size={18} color="#E74C3C" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>
                                            {addr.full_name}
                                        </ThemedText>
                                        <ThemedText style={{ color: iconColor, fontSize: 13, marginTop: 2 }}>
                                            {firstLine}
                                        </ThemedText>
                                        <ThemedText style={{ color: iconColor, fontSize: 13 }}>
                                            {secondLine}
                                        </ThemedText>
                                        <ThemedText style={{ color: iconColor, fontSize: 13, marginTop: 2 }}>
                                            📞 {addr.phone}
                                        </ThemedText>

                                        {!addr.is_default && (
                                            <TouchableOpacity
                                                style={[styles.setDefaultBtn, { borderColor: tintColor }]}
                                                onPress={() => handleSetDefault(addr)}
                                            >
                                                <ThemedText style={{ fontSize: 12, color: tintColor, fontWeight: '600' }}>
                                                    Set as Default
                                                </ThemedText>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>

                    {/* Add Address Button */}
                    <View style={[styles.bottomBar, { backgroundColor: bgColor }]}>
                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: tintColor }]}
                            onPress={openAddForm}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="add-circle" size={22} color="#fff" />
                            <ThemedText
                                type="defaultSemiBold"
                                style={styles.addButtonText}
                                lightColor="#fff"
                                darkColor="#000"
                            >
                                Add New Address
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                /* Add / Edit Form */
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.flex}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={[styles.formSection, { backgroundColor: cardBg }]}>
                            {/* Name and Phone */}
                            <View style={styles.formRow}>
                                <View style={styles.formField}>
                                    <ThemedText style={[styles.inputLabel, { color: iconColor }]}>Name *</ThemedText>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="Full name"
                                        placeholderTextColor={iconColor}
                                    />
                                </View>
                                <View style={styles.formField}>
                                    <ThemedText style={[styles.inputLabel, { color: iconColor }]}>Phone *</ThemedText>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                                        value={phone}
                                        onChangeText={setPhone}
                                        placeholder="Phone number"
                                        placeholderTextColor={iconColor}
                                        keyboardType="phone-pad"
                                    />
                                </View>
                            </View>

                            {/* Address Line 1 */}
                            <View style={styles.formField}>
                                <ThemedText style={[styles.inputLabel, { color: iconColor }]}>Address Line 1 *</ThemedText>
                                <TextInput
                                    style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                                    value={line1}
                                    onChangeText={setLine1}
                                    placeholder="House/flat no, street, area"
                                    placeholderTextColor={iconColor}
                                />
                            </View>

                            {/* Address Line 2 */}
                            <View style={styles.formField}>
                                <ThemedText style={[styles.inputLabel, { color: iconColor }]}>Address Line 2</ThemedText>
                                <TextInput
                                    style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                                    value={line2}
                                    onChangeText={setLine2}
                                    placeholder="Locality, landmark (optional)"
                                    placeholderTextColor={iconColor}
                                />
                            </View>

                            {/* Landmark */}
                            <View style={styles.formField}>
                                <ThemedText style={[styles.inputLabel, { color: iconColor }]}>Landmark</ThemedText>
                                <TextInput
                                    style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                                    value={landmark}
                                    onChangeText={setLandmark}
                                    placeholder="Near temple, school etc."
                                    placeholderTextColor={iconColor}
                                />
                            </View>

                            {/* City and State */}
                            <View style={styles.formRow}>
                                <View style={styles.formField}>
                                    <ThemedText style={[styles.inputLabel, { color: iconColor }]}>City *</ThemedText>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                                        value={city}
                                        onChangeText={setCity}
                                        placeholder="City"
                                        placeholderTextColor={iconColor}
                                    />
                                </View>
                                <View style={styles.formField}>
                                    <ThemedText style={[styles.inputLabel, { color: iconColor }]}>State</ThemedText>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                                        value={state}
                                        onChangeText={setState}
                                        placeholder="State"
                                        placeholderTextColor={iconColor}
                                    />
                                </View>
                            </View>

                            {/* Pincode */}
                            <View style={styles.formField}>
                                <ThemedText style={[styles.inputLabel, { color: iconColor }]}>Pincode *</ThemedText>
                                <TextInput
                                    style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                                    value={pincode}
                                    onChangeText={setPincode}
                                    placeholder="Pincode"
                                    placeholderTextColor={iconColor}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                />
                            </View>

                            {/* Default Toggle */}
                            <TouchableOpacity
                                style={styles.defaultToggle}
                                onPress={() => setIsDefault(!isDefault)}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={isDefault ? 'checkbox' : 'square-outline'}
                                    size={22}
                                    color={isDefault ? tintColor : iconColor}
                                />
                                <ThemedText style={{ fontSize: 14 }}>
                                    Set as default address
                                </ThemedText>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>

                    {/* Save Button */}
                    <View style={[styles.bottomBar, { backgroundColor: bgColor }]}>
                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: tintColor }, saving && { opacity: 0.7 }]}
                            onPress={handleSave}
                            activeOpacity={0.85}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                                    <ThemedText
                                        type="defaultSemiBold"
                                        style={styles.addButtonText}
                                        lightColor="#fff"
                                        darkColor="#000"
                                    >
                                        {mode === 'edit' ? 'Update Address' : 'Save Address'}
                                    </ThemedText>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    headerTitle: {
        fontSize: 20,
        letterSpacing: -0.3,
    },
    scrollContent: {
        padding: 20,
        gap: 14,
        paddingBottom: 30,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    addressCard: {
        borderRadius: 14,
        padding: 16,
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    addressTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    addressLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    labelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    defaultBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    addressActions: {
        flexDirection: 'row',
        gap: 14,
    },
    setDefaultBtn: {
        marginTop: 8,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignSelf: 'flex-start',
    },
    bottomBar: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(0,0,0,0.08)',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    addButtonText: {
        fontSize: 16,
    },
    formSection: {
        borderRadius: 16,
        padding: 18,
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    fieldLabel: {
        fontSize: 14,
        marginBottom: -4,
    },
    labelGroup: {
        flexDirection: 'row',
        gap: 10,
    },
    labelOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
    },
    formRow: {
        flexDirection: 'row',
        gap: 12,
    },
    formField: {
        flex: 1,
        gap: 6,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 2,
    },
    input: {
        height: 46,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        fontSize: 14,
    },
    multilineInput: {
        height: 80,
        paddingTop: 12,
        textAlignVertical: 'top',
    },
    defaultToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 4,
    },
});