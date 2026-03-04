import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCart } from '@/contexts/CartContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    FlatList,
    Platform,
    StyleSheet,
    Switch,
    TouchableOpacity,
    View,
} from 'react-native';
import { CartItem } from '@/types/database';

function CartItemCard({
    item,
    tintColor,
    cardBg,
    iconColor,
    borderColor,
    onUpdateQty,
    onRemove,
    onToggleCleaning,
}: {
    item: CartItem;
    tintColor: string;
    cardBg: string;
    iconColor: string;
    borderColor: string;
    onUpdateQty: (qty: number) => void;
    onRemove: () => void;
    onToggleCleaning: () => void;
}) {
    const itemTotal = item.product.price * item.quantity;
    const cleaningCharge = item.cleaningSelected && item.product.cleaning_price_per_kg
        ? item.product.cleaning_price_per_kg * item.quantity
        : 0;

    return (
        <View style={[styles.cartItem, { backgroundColor: cardBg }]}>
            <View style={styles.cartItemTop}>
                {item.product.image_url ? (
                    <Image
                        source={{ uri: item.product.image_url }}
                        style={styles.itemImage}
                        contentFit="cover"
                    />
                ) : (
                    <View style={[styles.itemImage, styles.placeholderImage]}>
                        <Ionicons name="fish" size={24} color={iconColor} />
                    </View>
                )}
                <View style={styles.itemInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.itemName} numberOfLines={2}>
                        {item.product.name}
                    </ThemedText>
                    <ThemedText style={[styles.itemPrice, { color: tintColor }]}>
                        ₹{item.product.price} / kg
                    </ThemedText>
                </View>
                <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                </TouchableOpacity>
            </View>

            {/* Quantity Controls */}
            <View style={[styles.cartItemBottom, { borderTopColor: borderColor }]}>
                <View style={styles.qtyControls}>
                    <TouchableOpacity
                        style={[styles.qtyButton, { borderColor }]}
                        onPress={() => onUpdateQty(item.quantity - 1)}
                    >
                        <Ionicons name="remove" size={18} color={tintColor} />
                    </TouchableOpacity>
                    <ThemedText type="defaultSemiBold" style={styles.qtyText}>
                        {item.quantity}
                    </ThemedText>
                    <TouchableOpacity
                        style={[styles.qtyButton, { borderColor }]}
                        onPress={() => onUpdateQty(item.quantity + 1)}
                    >
                        <Ionicons name="add" size={18} color={tintColor} />
                    </TouchableOpacity>
                </View>
                <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
                    ₹{itemTotal}
                </ThemedText>
            </View>

            {/* Cleaning Option */}
            {item.product.cleaning_available && (
                <View style={[styles.cleaningRow, { borderTopColor: borderColor }]}>
                    <View style={styles.cleaningInfo}>
                        <ThemedText style={styles.cleaningLabel}>
                            🧹 Fish Cleaning
                        </ThemedText>
                        <ThemedText style={[styles.cleaningPrice, { color: iconColor }]}>
                            ₹{item.product.cleaning_price_per_kg}/kg
                        </ThemedText>
                    </View>
                    <View style={styles.cleaningRight}>
                        {item.cleaningSelected && (
                            <ThemedText style={[styles.cleaningCharge, { color: '#2ECC71' }]}>
                                +₹{cleaningCharge}
                            </ThemedText>
                        )}
                        <Switch
                            value={item.cleaningSelected}
                            onValueChange={onToggleCleaning}
                            trackColor={{ false: '#ddd', true: `${tintColor}60` }}
                            thumbColor={item.cleaningSelected ? tintColor : '#f4f3f4'}
                        />
                    </View>
                </View>
            )}
        </View>
    );
}

export default function CartScreen() {
    const router = useRouter();
    const {
        items,
        updateQuantity,
        removeFromCart,
        toggleCleaning,
        getSubtotal,
        getCleaningTotal,
        getDeliveryCharge,
        getGrandTotal,
    } = useCart();

    const tintColor = useThemeColor({}, 'tint');
    const iconColor = useThemeColor({}, 'icon');
    const bgColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');

    const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2022' }, 'background');
    const borderColor = useThemeColor({ light: '#F0F2F5', dark: '#2A2D30' }, 'background');
    const summaryBg = useThemeColor({ light: '#F8F9FA', dark: '#111314' }, 'background');

    const subtotal = getSubtotal();
    const cleaningTotal = getCleaningTotal();
    const deliveryCharge = getDeliveryCharge();
    const grandTotal = getGrandTotal();

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: bgColor }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={24} color={tintColor} />
                </TouchableOpacity>
                <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                    My Cart ({items.length})
                </ThemedText>
                <View style={{ width: 24 }} />
            </View>

            {items.length === 0 ? (
                <View style={styles.center}>
                    <View style={[styles.iconCircle, { backgroundColor: `${tintColor}15` }]}>
                        <Ionicons name="cart-outline" size={56} color={tintColor} />
                    </View>
                    <ThemedText type="subtitle" style={styles.emptyTitle}>
                        Your Cart is Empty
                    </ThemedText>
                    <ThemedText style={[styles.emptySubtitle, { color: iconColor }]}>
                        Add items to get started
                    </ThemedText>
                    <TouchableOpacity
                        style={[styles.browseButton, { backgroundColor: tintColor }]}
                        activeOpacity={0.85}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="fish-outline" size={20} color="#fff" />
                        <ThemedText
                            type="defaultSemiBold"
                            style={styles.browseButtonText}
                            lightColor="#fff"
                            darkColor="#000"
                        >
                            Browse Products
                        </ThemedText>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <FlatList
                        data={items}
                        renderItem={({ item }) => (
                            <CartItemCard
                                item={item}
                                tintColor={tintColor}
                                cardBg={cardBg}
                                iconColor={iconColor}
                                borderColor={borderColor}
                                onUpdateQty={(qty) => updateQuantity(item.product.id, qty)}
                                onRemove={() => removeFromCart(item.product.id)}
                                onToggleCleaning={() => toggleCleaning(item.product.id)}
                            />
                        )}
                        keyExtractor={(item) => item.product.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />

                    {/* Price Summary */}
                    <View style={[styles.summary, { backgroundColor: summaryBg }]}>
                        <View style={styles.summaryRow}>
                            <ThemedText style={{ color: iconColor }}>Subtotal</ThemedText>
                            <ThemedText>₹{subtotal}</ThemedText>
                        </View>
                        {cleaningTotal > 0 && (
                            <View style={styles.summaryRow}>
                                <ThemedText style={{ color: iconColor }}>Cleaning Charges</ThemedText>
                                <ThemedText>₹{cleaningTotal}</ThemedText>
                            </View>
                        )}
                        <View style={styles.summaryRow}>
                            <ThemedText style={{ color: iconColor }}>Delivery</ThemedText>
                            <ThemedText style={{ color: deliveryCharge === 0 ? '#2ECC71' : textColor }}>
                                {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                            </ThemedText>
                        </View>
                        <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: borderColor }]}>
                            <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>
                                Grand Total
                            </ThemedText>
                            <ThemedText type="defaultSemiBold" style={{ fontSize: 17, color: tintColor }}>
                                ₹{grandTotal}
                            </ThemedText>
                        </View>

                        <TouchableOpacity
                            style={[styles.checkoutButton, { backgroundColor: tintColor }]}
                            activeOpacity={0.85}
                            onPress={() => router.push('/checkout')}
                        >
                            <ThemedText
                                type="defaultSemiBold"
                                style={styles.checkoutButtonText}
                                lightColor="#fff"
                                darkColor="#000"
                            >
                                Proceed to Checkout
                            </ThemedText>
                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
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
    iconCircle: {
        width: 110,
        height: 110,
        borderRadius: 55,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    browseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
    browseButtonText: {
        fontSize: 16,
    },
    listContent: {
        padding: 20,
        gap: 14,
    },
    cartItem: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    cartItemTop: {
        flexDirection: 'row',
        padding: 14,
        gap: 12,
        alignItems: 'center',
    },
    itemImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
    },
    placeholderImage: {
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemInfo: {
        flex: 1,
        gap: 4,
    },
    itemName: {
        fontSize: 15,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '600',
    },
    cartItemBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    qtyControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    qtyButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyText: {
        fontSize: 16,
        minWidth: 20,
        textAlign: 'center',
    },
    cleaningRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    cleaningInfo: {
        gap: 2,
    },
    cleaningLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    cleaningPrice: {
        fontSize: 12,
    },
    cleaningRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cleaningCharge: {
        fontSize: 13,
        fontWeight: '600',
    },
    summary: {
        padding: 20,
        gap: 10,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 8,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalRow: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 10,
        marginTop: 4,
    },
    checkoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 54,
        borderRadius: 14,
        marginTop: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    checkoutButtonText: {
        fontSize: 17,
    },
});
