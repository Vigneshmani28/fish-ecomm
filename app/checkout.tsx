import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { Address, AddressSnapshot } from '@/types/database';
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

type PaymentMethod = 'cod' | 'online';
type AddressMode = 'saved' | 'new';

export default function CheckoutScreen() {
    const router = useRouter();
    const { session, profile } = useAuth();
    const {
        items,
        getSubtotal,
        getCleaningTotal,
        getDeliveryCharge,
        getGrandTotal,
        clearCart,
    } = useCart();

    // Address state
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loadingAddresses, setLoadingAddresses] = useState(true);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [addressMode, setAddressMode] = useState<AddressMode>('saved');

    // New address form state
    const [newName, setNewName] = useState(profile?.name || '');
    const [newPhone, setNewPhone] = useState(profile?.phone || '');
    const [newLine1, setNewLine1] = useState('');
    const [newLine2, setNewLine2] = useState('');
    const [newLandmark, setNewLandmark] = useState('');
    const [newCity, setNewCity] = useState('');
    const [newState, setNewState] = useState('');
    const [newPincode, setNewPincode] = useState('');
    const [saveNewAddress, setSaveNewAddress] = useState(true);

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
    const [loading, setLoading] = useState(false);

    const tintColor = useThemeColor({}, 'tint');
    const iconColor = useThemeColor({}, 'icon');
    const bgColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');

    const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2022' }, 'background');
    const borderColor = useThemeColor({ light: '#F0F2F5', dark: '#2A2D30' }, 'background');
    const inputBg = useThemeColor({ light: '#F4F6F8', dark: '#1E2022' }, 'background');
    const inputBorder = useThemeColor({ light: '#E0E4E8', dark: '#2C2F33' }, 'background');

    const subtotal = getSubtotal();
    const cleaningTotal = getCleaningTotal();
    const deliveryCharge = getDeliveryCharge();
    const grandTotal = getGrandTotal();

    // Fetch saved addresses
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
                const addrs = data as Address[];
                setAddresses(addrs);
                // Auto-select default or first address
                const defaultAddr = addrs.find((a) => a.is_default) || addrs[0];
                if (defaultAddr) {
                    setSelectedAddressId(defaultAddr.id);
                    setAddressMode('saved');
                } else {
                    setAddressMode('new');
                }
            }
        } catch (err) {
            console.error('Error fetching addresses:', err);
        } finally {
            setLoadingAddresses(false);
        }
    }, [session]);

    useEffect(() => {
        fetchAddresses();
    }, [fetchAddresses]);

    const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

    const formatAddress = (addr: Address) => {
        const parts = [];
        if (addr.line1) parts.push(addr.line1);
        if (addr.line2) parts.push(addr.line2);
        if (addr.landmark) parts.push(addr.landmark);
        const firstLine = parts.join(', ');
        const secondLine = `${addr.city}${addr.state ? `, ${addr.state}` : ''} - ${addr.pincode}`;
        return { firstLine, secondLine };
    };

    const getLabelIcon = (label: string): keyof typeof Ionicons.glyphMap => {
        switch (label) {
            case 'Home': return 'home';
            case 'Work': return 'briefcase';
            default: return 'location';
        }
    };

    // Validate stock before placing order
    const validateStock = async (): Promise<{ valid: boolean; issues: string[] }> => {
        const productIds = items.map((item) => item.product.id);
        const { data: products, error } = await supabase
            .from('products')
            .select('id, name, stock_quantity, is_available')
            .in('id', productIds);

        if (error || !products) {
            return { valid: false, issues: ['Unable to verify stock. Please try again.'] };
        }

        const issues: string[] = [];
        for (const item of items) {
            const product = products.find((p: any) => p.id === item.product.id);
            if (!product) {
                issues.push(`${item.product.name} is no longer available.`);
                continue;
            }
            if (!product.is_available) {
                issues.push(`${item.product.name} is currently unavailable.`);
                continue;
            }
            if (product.stock_quantity < item.quantity) {
                if (product.stock_quantity === 0) {
                    issues.push(`${item.product.name} is out of stock.`);
                } else {
                    issues.push(
                        `${item.product.name}: only ${product.stock_quantity} kg available (you have ${item.quantity} kg in cart).`
                    );
                }
            }
        }

        return { valid: issues.length === 0, issues };
    };

    // Decrement stock after successful order
    const decrementStock = async () => {
        for (const item of items) {
            await supabase.rpc('decrement_stock', {
                p_product_id: item.product.id,
                p_quantity: item.quantity,
            }).then(({ error }) => {
                if (error) {
                    // Fallback: manual update
                    supabase
                        .from('products')
                        .update({
                            stock_quantity: Math.max(0, item.product.stock_quantity - item.quantity),
                        })
                        .eq('id', item.product.id);
                }
            });
        }
    };

    const handlePlaceOrder = async () => {
        // Validate address
        let addressSnapshot: AddressSnapshot;

        if (addressMode === 'saved') {
            if (!selectedAddress) {
                Alert.alert('Select Address', 'Please select a delivery address.');
                return;
            }
            addressSnapshot = {
                name: selectedAddress.full_name,
                phone: selectedAddress.phone,
                address: [selectedAddress.line1, selectedAddress.line2].filter(Boolean).join(', '),
                landmark: selectedAddress.landmark || undefined,
                city: selectedAddress.city,
                pincode: selectedAddress.pincode,
            };
        } else {
            // Validate new address fields
            if (
                !newName.trim() ||
                !newPhone.trim() ||
                !newLine1.trim() ||
                !newCity.trim() ||
                !newPincode.trim()
            ) {
                Alert.alert('Missing Details', 'Please fill in all required address fields.');
                return;
            }
            addressSnapshot = {
                name: newName.trim(),
                phone: newPhone.trim(),
                address: [newLine1.trim(), newLine2.trim()].filter(Boolean).join(', '),
                landmark: newLandmark.trim() || undefined,
                city: newCity.trim(),
                pincode: newPincode.trim(),
            };
        }

        if (!session?.user) {
            Alert.alert('Error', 'You must be logged in to place an order.');
            return;
        }

        setLoading(true);

        try {
            // 1. Stock validation
            const { valid, issues } = await validateStock();
            if (!valid) {
                Alert.alert('⚠️ Stock Issue', issues.join('\n\n') + '\n\nPlease update your cart and try again.');
                setLoading(false);
                return;
            }

            // 2. Save new address if requested and get address ID
            let addressId = selectedAddressId;

            if (addressMode === 'new' && saveNewAddress && session?.user) {
                const isFirstAddress = addresses.length === 0;
                const { data: newAddr, error: addrError } = await supabase
                    .from('addresses')
                    .insert({
                        user_id: session.user.id,
                        label: 'Home',
                        full_name: newName.trim(),
                        phone: newPhone.trim(),
                        line1: newLine1.trim(),
                        line2: newLine2.trim() || null,
                        landmark: newLandmark.trim() || null,
                        city: newCity.trim(),
                        state: newState.trim() || null,
                        pincode: newPincode.trim(),
                        is_default: isFirstAddress,
                    })
                    .select('id')
                    .single();

                if (addrError) {
                    console.warn('Failed to save address:', addrError.message);
                } else {
                    addressId = newAddr.id;
                }
            }

            if (!addressId) {
                Alert.alert('Error', 'Please select or add a delivery address.');
                setLoading(false);
                return;
            }

            // 3. Prepare items for the RPC call
            const itemsForRpc = items.map(item => ({
                product_id: item.product.id,
                quantity: item.quantity,
                cleaning: item.cleaningSelected
            }));

            // 🔍 LOG THE EXACT DATA BEING SENT
            console.log('Sending to RPC:', JSON.stringify({
                p_user_id: session.user.id,
                p_items: itemsForRpc,
                p_delivery_charge: deliveryCharge,
                p_address_id: addressId
            }, null, 2));

            // 4. Call the place_order RPC function
            const { data: orderId, error: rpcError } = await supabase
                .rpc('place_order', {
                    p_user_id: session.user.id,
                    p_items: itemsForRpc,
                    p_delivery_charge: deliveryCharge,
                    p_address_id: addressId
                });

            if (rpcError) {
                console.error('RPC Error:', rpcError);
                throw new Error(rpcError.message);
            }

            if (!orderId) {
                throw new Error('Failed to create order');
            }

            // 5. Success
            clearCart();
            Alert.alert(
                '🎉 Order Placed!',
                `Your order #${orderId.toString().slice(-6).toUpperCase()} has been placed successfully.`,
                [
                    {
                        text: 'View Orders',
                        onPress: () => router.replace('/(tabs)/orders'),
                    },
                ]
            );
        } catch (err: any) {
            console.error('Order placement error:', err);
            Alert.alert('Error', err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (items.length === 0) {
        return (
            <ThemedView style={styles.container}>
                <View style={[styles.header, { backgroundColor: bgColor }]}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={tintColor} />
                    </TouchableOpacity>
                    <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                        Checkout
                    </ThemedText>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.center}>
                    <ThemedText type="subtitle">Cart is empty</ThemedText>
                    <ThemedText style={{ color: iconColor, marginTop: 8 }}>
                        Add items before checking out
                    </ThemedText>
                </View>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: bgColor }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={tintColor} />
                </TouchableOpacity>
                <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                    Checkout
                </ThemedText>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Delivery Address */}
                    <View style={[styles.section, { backgroundColor: cardBg }]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="location" size={20} color={tintColor} />
                            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                                Delivery Address
                            </ThemedText>
                        </View>

                        {loadingAddresses ? (
                            <ActivityIndicator size="small" color={tintColor} style={{ paddingVertical: 20 }} />
                        ) : (
                            <>
                                {/* Saved Addresses */}
                                {addresses.map((addr) => {
                                    const { firstLine, secondLine } = formatAddress(addr);
                                    const isSelected = addressMode === 'saved' && selectedAddressId === addr.id;
                                    return (
                                        <TouchableOpacity
                                            key={addr.id}
                                            style={[
                                                styles.addressOption,
                                                {
                                                    borderColor: isSelected ? tintColor : inputBorder,
                                                    backgroundColor: isSelected ? `${tintColor}08` : 'transparent',
                                                },
                                            ]}
                                            onPress={() => {
                                                setSelectedAddressId(addr.id);
                                                setAddressMode('saved');
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.addressOptionTop}>
                                                <View style={styles.addressOptionLeft}>
                                                    <View style={[styles.radio, { borderColor: isSelected ? tintColor : iconColor }]}>
                                                        {isSelected && (
                                                            <View style={[styles.radioInner, { backgroundColor: tintColor }]} />
                                                        )}
                                                    </View>
                                                    <View style={styles.addressDetails}>
                                                        <View style={styles.addressLabelRow}>
                                                            <Ionicons
                                                                name={getLabelIcon(addr.label)}
                                                                size={14}
                                                                color={tintColor}
                                                            />
                                                            <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>
                                                                {addr.full_name}
                                                            </ThemedText>
                                                            {addr.is_default && (
                                                                <View style={[styles.defaultBadge, { backgroundColor: '#2ECC7120' }]}>
                                                                    <ThemedText style={{ fontSize: 10, color: '#2ECC71', fontWeight: '600' }}>
                                                                        Default
                                                                    </ThemedText>
                                                                </View>
                                                            )}
                                                        </View>
                                                        <ThemedText style={{ color: iconColor, fontSize: 13, marginTop: 2 }}>
                                                            {firstLine}
                                                        </ThemedText>
                                                        <ThemedText style={{ color: iconColor, fontSize: 13 }}>
                                                            {secondLine}
                                                        </ThemedText>
                                                        <ThemedText style={{ color: iconColor, fontSize: 12, marginTop: 2 }}>
                                                            📞 {addr.phone}
                                                        </ThemedText>
                                                    </View>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}

                                {/* Add New Address Option */}
                                <TouchableOpacity
                                    style={[
                                        styles.addressOption,
                                        {
                                            borderColor: addressMode === 'new' ? tintColor : inputBorder,
                                            backgroundColor: addressMode === 'new' ? `${tintColor}08` : 'transparent',
                                        },
                                    ]}
                                    onPress={() => setAddressMode('new')}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.addressOptionTop}>
                                        <View style={styles.addressOptionLeft}>
                                            <View style={[styles.radio, { borderColor: addressMode === 'new' ? tintColor : iconColor }]}>
                                                {addressMode === 'new' && (
                                                    <View style={[styles.radioInner, { backgroundColor: tintColor }]} />
                                                )}
                                            </View>
                                            <Ionicons name="add-circle-outline" size={20} color={tintColor} />
                                            <ThemedText type="defaultSemiBold" style={{ fontSize: 14, color: tintColor }}>
                                                Add New Address
                                            </ThemedText>
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                {/* New Address Form (shown only when addressMode is 'new') */}
                                {addressMode === 'new' && (
                                    <View style={styles.newAddressForm}>
                                        <View style={styles.formRow}>
                                            <View style={styles.formField}>
                                                <ThemedText style={[styles.fieldLabel, { color: iconColor }]}>Name *</ThemedText>
                                                <TextInput
                                                    style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                                                    value={newName}
                                                    onChangeText={setNewName}
                                                    placeholder="Full name"
                                                    placeholderTextColor={iconColor}
                                                />
                                            </View>
                                            <View style={styles.formField}>
                                                <ThemedText style={[styles.fieldLabel, { color: iconColor }]}>Phone *</ThemedText>
                                                <TextInput
                                                    style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                                                    value={newPhone}
                                                    onChangeText={setNewPhone}
                                                    placeholder="Phone number"
                                                    placeholderTextColor={iconColor}
                                                    keyboardType="phone-pad"
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.formField}>
                                            <ThemedText style={[styles.fieldLabel, { color: iconColor }]}>Address Line 1 *</ThemedText>
                                            <TextInput
                                                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                                                value={newLine1}
                                                onChangeText={setNewLine1}
                                                placeholder="House/flat no, street, area"
                                                placeholderTextColor={iconColor}
                                            />
                                        </View>

                                        <View style={styles.formField}>
                                            <ThemedText style={[styles.fieldLabel, { color: iconColor }]}>Address Line 2</ThemedText>
                                            <TextInput
                                                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                                                value={newLine2}
                                                onChangeText={setNewLine2}
                                                placeholder="Locality (optional)"
                                                placeholderTextColor={iconColor}
                                            />
                                        </View>

                                        <View style={styles.formField}>
                                            <ThemedText style={[styles.fieldLabel, { color: iconColor }]}>Landmark</ThemedText>
                                            <TextInput
                                                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                                                value={newLandmark}
                                                onChangeText={setNewLandmark}
                                                placeholder="Near temple, school etc."
                                                placeholderTextColor={iconColor}
                                            />
                                        </View>

                                        <View style={styles.formRow}>
                                            <View style={styles.formField}>
                                                <ThemedText style={[styles.fieldLabel, { color: iconColor }]}>City *</ThemedText>
                                                <TextInput
                                                    style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                                                    value={newCity}
                                                    onChangeText={setNewCity}
                                                    placeholder="City"
                                                    placeholderTextColor={iconColor}
                                                />
                                            </View>
                                            <View style={styles.formField}>
                                                <ThemedText style={[styles.fieldLabel, { color: iconColor }]}>State</ThemedText>
                                                <TextInput
                                                    style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                                                    value={newState}
                                                    onChangeText={setNewState}
                                                    placeholder="State"
                                                    placeholderTextColor={iconColor}
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.formField}>
                                            <ThemedText style={[styles.fieldLabel, { color: iconColor }]}>Pincode *</ThemedText>
                                            <TextInput
                                                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                                                value={newPincode}
                                                onChangeText={setNewPincode}
                                                placeholder="Pincode"
                                                placeholderTextColor={iconColor}
                                                keyboardType="number-pad"
                                                maxLength={6}
                                            />
                                        </View>

                                        {/* Save address toggle */}
                                        <TouchableOpacity
                                            style={styles.saveToggle}
                                            onPress={() => setSaveNewAddress(!saveNewAddress)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons
                                                name={saveNewAddress ? 'checkbox' : 'square-outline'}
                                                size={22}
                                                color={saveNewAddress ? tintColor : iconColor}
                                            />
                                            <ThemedText style={{ fontSize: 13 }}>
                                                Save this address for future orders
                                            </ThemedText>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </>
                        )}
                    </View>

                    {/* Payment Method */}
                    <View style={[styles.section, { backgroundColor: cardBg }]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="card" size={20} color={tintColor} />
                            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                                Payment Method
                            </ThemedText>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.paymentOption,
                                {
                                    borderColor: paymentMethod === 'cod' ? tintColor : inputBorder,
                                    backgroundColor: paymentMethod === 'cod' ? `${tintColor}10` : 'transparent',
                                },
                            ]}
                            onPress={() => setPaymentMethod('cod')}
                            activeOpacity={0.7}
                        >
                            <View style={styles.paymentLeft}>
                                <Ionicons name="cash-outline" size={24} color={paymentMethod === 'cod' ? tintColor : iconColor} />
                                <View>
                                    <ThemedText type="defaultSemiBold">Cash on Delivery</ThemedText>
                                    <ThemedText style={[styles.paymentDesc, { color: iconColor }]}>
                                        Pay when you receive
                                    </ThemedText>
                                </View>
                            </View>
                            <View style={[styles.radio, { borderColor: paymentMethod === 'cod' ? tintColor : iconColor }]}>
                                {paymentMethod === 'cod' && (
                                    <View style={[styles.radioInner, { backgroundColor: tintColor }]} />
                                )}
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.paymentOption,
                                {
                                    borderColor: paymentMethod === 'online' ? tintColor : inputBorder,
                                    backgroundColor: paymentMethod === 'online' ? `${tintColor}10` : 'transparent',
                                },
                            ]}
                            onPress={() => setPaymentMethod('online')}
                            activeOpacity={0.7}
                        >
                            <View style={styles.paymentLeft}>
                                <Ionicons name="card-outline" size={24} color={paymentMethod === 'online' ? tintColor : iconColor} />
                                <View>
                                    <ThemedText type="defaultSemiBold">Online Payment</ThemedText>
                                    <ThemedText style={[styles.paymentDesc, { color: iconColor }]}>
                                        UPI, Cards, Net Banking
                                    </ThemedText>
                                </View>
                            </View>
                            <View style={[styles.radio, { borderColor: paymentMethod === 'online' ? tintColor : iconColor }]}>
                                {paymentMethod === 'online' && (
                                    <View style={[styles.radioInner, { backgroundColor: tintColor }]} />
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Order Summary */}
                    <View style={[styles.section, { backgroundColor: cardBg }]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="receipt" size={20} color={tintColor} />
                            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                                Order Summary
                            </ThemedText>
                        </View>

                        {items.map((item) => (
                            <View key={item.product.id} style={[styles.summaryItem, { borderBottomColor: borderColor }]}>
                                <ThemedText style={styles.summaryItemName} numberOfLines={1}>
                                    {item.product.name} × {item.quantity}
                                </ThemedText>
                                <ThemedText>₹{item.product.price * item.quantity}</ThemedText>
                            </View>
                        ))}

                        <View style={[styles.summaryTotals, { borderTopColor: borderColor }]}>
                            <View style={styles.summaryRow}>
                                <ThemedText style={{ color: iconColor }}>Subtotal</ThemedText>
                                <ThemedText>₹{subtotal}</ThemedText>
                            </View>
                            {cleaningTotal > 0 && (
                                <View style={styles.summaryRow}>
                                    <ThemedText style={{ color: iconColor }}>Cleaning</ThemedText>
                                    <ThemedText>₹{cleaningTotal}</ThemedText>
                                </View>
                            )}
                            <View style={styles.summaryRow}>
                                <ThemedText style={{ color: iconColor }}>Delivery</ThemedText>
                                <ThemedText style={{ color: deliveryCharge === 0 ? '#2ECC71' : textColor }}>
                                    {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                                </ThemedText>
                            </View>
                            <View style={[styles.summaryRow, styles.grandTotalRow, { borderTopColor: borderColor }]}>
                                <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>
                                    Grand Total
                                </ThemedText>
                                <ThemedText type="defaultSemiBold" style={{ fontSize: 17, color: tintColor }}>
                                    ₹{grandTotal}
                                </ThemedText>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Place Order Button */}
            <View style={[styles.bottomBar, { backgroundColor: bgColor }]}>
                <View>
                    <ThemedText style={{ color: iconColor, fontSize: 12 }}>Total Amount</ThemedText>
                    <ThemedText type="defaultSemiBold" style={{ fontSize: 20, color: tintColor }}>
                        ₹{grandTotal}
                    </ThemedText>
                </View>
                <TouchableOpacity
                    style={[styles.placeOrderButton, { backgroundColor: tintColor }, loading && styles.disabledButton]}
                    activeOpacity={0.85}
                    onPress={handlePlaceOrder}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <ThemedText
                                type="defaultSemiBold"
                                style={styles.placeOrderText}
                                lightColor="#fff"
                                darkColor="#000"
                            >
                                Place Order
                            </ThemedText>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
            </View>
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
        paddingTop: Platform.OS === 'ios' ? 56 : 44,
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    headerTitle: {
        fontSize: 20,
        letterSpacing: -0.3,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    scrollContent: {
        padding: 20,
        gap: 16,
        paddingBottom: 40,
    },
    section: {
        borderRadius: 16,
        padding: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
    },
    // Address picker
    addressOption: {
        borderRadius: 12,
        borderWidth: 1.5,
        padding: 14,
        marginBottom: 10,
    },
    addressOptionTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    addressOptionLeft: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        flex: 1,
    },
    addressDetails: {
        flex: 1,
        gap: 0,
    },
    addressLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    defaultBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 4,
    },
    // New address form
    newAddressForm: {
        gap: 14,
        paddingTop: 4,
    },
    formRow: {
        flexDirection: 'row',
        gap: 12,
    },
    formField: {
        flex: 1,
        gap: 6,
    },
    fieldLabel: {
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
    saveToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 2,
    },
    // Payment
    paymentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1.5,
        marginBottom: 10,
    },
    paymentLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    paymentDesc: {
        fontSize: 12,
        marginTop: 2,
    },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    // Order summary
    summaryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    summaryItemName: {
        flex: 1,
        marginRight: 12,
        fontSize: 14,
    },
    summaryTotals: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 12,
        marginTop: 4,
        gap: 8,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    grandTotalRow: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 10,
        marginTop: 4,
    },
    // Bottom bar
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(0,0,0,0.08)',
    },
    placeOrderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    disabledButton: {
        opacity: 0.7,
    },
    placeOrderText: {
        fontSize: 16,
    },
});
