import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCart } from '@/contexts/CartContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
    Animated,
    StatusBar,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = SCREEN_WIDTH * 0.6;

export default function ProductDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { addToCart, items } = useCart();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [cleaningSelected, setCleaningSelected] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    const scrollY = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const tintColor = useThemeColor({}, 'tint');
    const iconColor = useThemeColor({}, 'icon');
    const bgColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#2A2D30' }, 'background');

    useEffect(() => {
        fetchProduct();
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, [id]);

    const fetchProduct = async () => {
        if (!id) return;
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single();

            if (!error && data) {
                setProduct(data as Product);
            }
        } catch (err) {
            console.error('Error fetching product:', err);
        } finally {
            setLoading(false);
        }
    };

    const itemTotal = product ? product.price * quantity : 0;
    const cleaningCharge =
        cleaningSelected && product?.cleaning_price_per_kg
            ? product.cleaning_price_per_kg * quantity
            : 0;
    const totalPrice = itemTotal + cleaningCharge;
    const existingInCart = items.find((item) => item.product.id === id);

    const handleAddToCart = () => {
        if (!product) return;
        addToCart(product, quantity);
        router.back();
    };

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_MAX_HEIGHT - 100],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    if (loading) {
        return (
            <ThemedView style={[styles.container, styles.center]}>
                <StatusBar barStyle="dark-content" />
                <ActivityIndicator size="large" color={tintColor} />
            </ThemedView>
        );
    }

    if (!product) {
        return (
            <ThemedView style={[styles.container, styles.center]}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.notFoundContainer}>
                    <Ionicons name="fish-outline" size={64} color={iconColor} />
                    <ThemedText style={styles.notFoundTitle}>Product Not Found</ThemedText>
                    <ThemedText style={[styles.notFoundSubtitle, { color: iconColor }]}>
                        The product you're looking for doesn't exist.
                    </ThemedText>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={[styles.notFoundButton, { backgroundColor: tintColor }]}
                    >
                        <ThemedText style={styles.notFoundButtonText}>Go Back</ThemedText>
                    </TouchableOpacity>
                </View>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <Animated.View style={[styles.header, {
                backgroundColor: bgColor,
                opacity: headerOpacity,
            }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.headerButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={24} color={textColor} />
                </TouchableOpacity>

                <ThemedText style={styles.headerTitle} numberOfLines={1}>
                    {product.name}
                </ThemedText>

                <TouchableOpacity
                    onPress={() => router.push('/cart')}
                    style={styles.headerButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <View style={styles.cartIconContainer}>
                        <Ionicons name="cart-outline" size={24} color={textColor} />
                        {items.length > 0 && (
                            <View style={[styles.cartBadge, { backgroundColor: tintColor }]}>
                                <ThemedText style={styles.cartBadgeText}>
                                    {items.length}
                                </ThemedText>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Animated.View>

            <Animated.ScrollView
                style={[styles.scrollView, { opacity: fadeAnim }]}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
            >
                {/* Product Image */}
                <View style={styles.imageContainer}>
                    {product.image_url ? (
                        <>
                            {imageLoading && (
                                <View style={styles.imageLoader}>
                                    <ActivityIndicator size="small" color={tintColor} />
                                </View>
                            )}
                            <Image
                                source={{ uri: product.image_url }}
                                style={styles.productImage}
                                contentFit="cover"
                                onLoadStart={() => setImageLoading(true)}
                                onLoadEnd={() => setImageLoading(false)}
                            />
                        </>
                    ) : (
                        <View style={[styles.productImage, styles.placeholderImage]}>
                            <Ionicons name="fish" size={60} color={iconColor} />
                        </View>
                    )}
                </View>

                {/* Product Info - No Card */}
                <View style={styles.infoContainer}>
                    <View style={styles.nameRow}>
                        <ThemedText style={styles.productName}>
                            {product.name}
                        </ThemedText>
                        <View style={styles.priceRow}>
                            <ThemedText style={[styles.price, { color: tintColor }]}>
                                ₹{product.price}
                            </ThemedText>
                            <ThemedText style={[styles.priceUnit, { color: iconColor }]}>
                                /kg
                            </ThemedText>
                        </View>
                    </View>

                    <View style={styles.categoryRow}>
                        <View style={[styles.categoryBadge, { backgroundColor: `${tintColor}10` }]}>
                            <ThemedText style={[styles.categoryText, { color: tintColor }]}>
                                {product.category}
                            </ThemedText>
                        </View>
                    </View>

                    {product.description && (
                        <ThemedText style={[styles.description, { color: iconColor }]}>
                            {product.description}
                        </ThemedText>
                    )}

                    {!product.is_available && (
                        <View style={styles.outOfStockContainer}>
                            <Ionicons name="alert-circle" size={18} color="#DC2626" />
                            <ThemedText style={styles.outOfStockText}>
                                Currently out of stock
                            </ThemedText>
                        </View>
                    )}
                </View>

                {product.is_available && (
                    <>
                        {/* Separator */}
                        <View style={[styles.separator, { backgroundColor: borderColor }]} />

                        {/* Quantity Selector - Inline */}
                        <View style={styles.quantityContainer}>
                            <View style={styles.quantityHeader}>
                                <Ionicons name="scale" size={20} color={iconColor} />
                                <ThemedText style={styles.quantityLabel}>
                                    Select Quantity
                                </ThemedText>
                            </View>

                            <View style={styles.quantityControls}>
                                <TouchableOpacity
                                    style={[styles.quantityButton, { borderColor }]}
                                    onPress={() => setQuantity(Math.max(1, quantity - 1))}
                                    disabled={quantity <= 1}
                                >
                                    <Ionicons
                                        name="remove"
                                        size={20}
                                        color={quantity <= 1 ? iconColor : textColor}
                                    />
                                </TouchableOpacity>

                                <View style={styles.quantityDisplay}>
                                    <ThemedText style={styles.quantityNumber}>
                                        {quantity}
                                    </ThemedText>
                                    <ThemedText style={[styles.quantityUnit, { color: iconColor }]}>
                                        kg
                                    </ThemedText>
                                </View>

                                <TouchableOpacity
                                    style={[styles.quantityButton, { borderColor }]}
                                    onPress={() => setQuantity(quantity + 1)}
                                >
                                    <Ionicons name="add" size={20} color={textColor} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Separator */}
                        <View style={[styles.separator, { backgroundColor: borderColor }]} />

                        {/* Cleaning Option - Button Style */}
                        {product.cleaning_available && product.cleaning_price_per_kg && (
                            <View style={styles.cleaningContainer}>
                                <View style={styles.cleaningHeader}>
                                    <View style={styles.cleaningTitleContainer}>
                                        <Ionicons name="water" size={20} color={iconColor} />
                                        <ThemedText style={styles.cleaningTitle}>
                                            Cleaning Service Available
                                        </ThemedText>
                                    </View>
                                    <ThemedText style={[styles.cleaningPrice, { color: tintColor }]}>
                                        ₹{product.cleaning_price_per_kg}/kg
                                    </ThemedText>
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.cleaningOption,
                                        cleaningSelected && styles.cleaningOptionSelected,
                                        { borderColor: cleaningSelected ? tintColor : borderColor }
                                    ]}
                                    onPress={() => setCleaningSelected(!cleaningSelected)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.cleaningOptionContent}>
                                        <View style={styles.cleaningOptionLeft}>
                                            <View style={[
                                                styles.cleaningCheckbox,
                                                cleaningSelected && { backgroundColor: tintColor, borderColor: tintColor }
                                            ]}>
                                                {cleaningSelected && (
                                                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                                )}
                                            </View>
                                            <View>
                                                <ThemedText style={styles.cleaningOptionTitle}>
                                                    Get it cleaned
                                                </ThemedText>
                                                <ThemedText style={[styles.cleaningOptionDesc, { color: iconColor }]}>
                                                    Professional cleaning & preparation
                                                </ThemedText>
                                            </View>
                                        </View>
                                        {cleaningSelected && (
                                            <View style={styles.cleaningCharge}>
                                                <Ionicons name="add-circle" size={16} color={tintColor} />
                                                <ThemedText style={[styles.cleaningChargeText, { color: tintColor }]}>
                                                    ₹{cleaningCharge}
                                                </ThemedText>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Separator */}
                        <View style={[styles.separator, { backgroundColor: borderColor }]} />

                        {/* Price Breakdown - Simple */}
                        <View style={styles.priceBreakdown}>
                            <View style={styles.breakdownRow}>
                                <ThemedText style={[styles.breakdownLabel, { color: iconColor }]}>
                                    Price ({quantity} kg)
                                </ThemedText>
                                <ThemedText style={styles.breakdownValue}>
                                    ₹{itemTotal}
                                </ThemedText>
                            </View>

                            {cleaningSelected && cleaningCharge > 0 && (
                                <View style={styles.breakdownRow}>
                                    <ThemedText style={[styles.breakdownLabel, { color: iconColor }]}>
                                        Cleaning charge
                                    </ThemedText>
                                    <ThemedText style={styles.breakdownValue}>
                                        +₹{cleaningCharge}
                                    </ThemedText>
                                </View>
                            )}

                            <View style={[styles.breakdownTotal, { borderTopColor: borderColor }]}>
                                <ThemedText style={styles.totalLabel}>
                                    Total Amount
                                </ThemedText>
                                <ThemedText style={[styles.totalValue, { color: tintColor }]}>
                                    ₹{totalPrice}
                                </ThemedText>
                            </View>
                        </View>

                        {/* Add to Cart Button - Fixed at bottom */}
                        <View style={styles.buttonWrapper}>
                            <TouchableOpacity
                                style={[styles.addToCartButton, { backgroundColor: tintColor }]}
                                activeOpacity={0.9}
                                onPress={handleAddToCart}
                            >
                                <Ionicons name="cart" size={20} color="#FFFFFF" />
                                <ThemedText style={styles.addToCartText}>
                                    {existingInCart ? 'Add More' : 'Add to Cart'} • ₹{totalPrice}
                                </ThemedText>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </Animated.ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 56 : 48,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 12,
    },
    cartIconContainer: {
        position: 'relative',
    },
    cartBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    cartBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 100 : 92,
        paddingBottom: 24,
    },
    imageContainer: {
        width: SCREEN_WIDTH,
        height: HEADER_MAX_HEIGHT,
        backgroundColor: '#F9FAFB',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    imageLoader: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
    },
    placeholderImage: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
    },
    infoContainer: {
        padding: 20,
        gap: 12,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    productName: {
        fontSize: 22,
        fontWeight: '600',
        flex: 1,
        marginRight: 16,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    price: {
        fontSize: 24,
        fontWeight: '700',
    },
    priceUnit: {
        fontSize: 14,
        marginLeft: 2,
    },
    categoryRow: {
        flexDirection: 'row',
    },
    categoryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '500',
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
    },
    outOfStockContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FEF2F2',
        padding: 12,
        borderRadius: 8,
    },
    outOfStockText: {
        color: '#DC2626',
        fontSize: 14,
        fontWeight: '500',
    },
    separator: {
        height: 1,
        marginHorizontal: 20,
        marginVertical: 4,
    },
    quantityContainer: {
        padding: 20,
    },
    quantityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    quantityLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
    },
    quantityButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityDisplay: {
        alignItems: 'center',
        minWidth: 80,
    },
    quantityNumber: {
        fontSize: 26,
        fontWeight: '600',
        marginBottom: 2,
    },
    quantityUnit: {
        fontSize: 12,
    },
    cleaningContainer: {
        padding: 20,
    },
    cleaningHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cleaningTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cleaningTitle: {
        fontSize: 15,
        fontWeight: '500',
    },
    cleaningPrice: {
        fontSize: 15,
        fontWeight: '600',
    },
    cleaningOption: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
    },
    cleaningOptionSelected: {
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    cleaningOptionContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cleaningOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    cleaningCheckbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cleaningOptionTitle: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 2,
    },
    cleaningOptionDesc: {
        fontSize: 12,
    },
    cleaningCharge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cleaningChargeText: {
        fontSize: 14,
        fontWeight: '600',
    },
    priceBreakdown: {
        padding: 20,
        gap: 12,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    breakdownLabel: {
        fontSize: 14,
    },
    breakdownValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    breakdownTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        marginTop: 4,
        borderTopWidth: 1,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    buttonWrapper: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 20,
    },
    addToCartButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 54,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    addToCartText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    notFoundContainer: {
        alignItems: 'center',
        paddingHorizontal: 24,
        gap: 16,
    },
    notFoundTitle: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    notFoundSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 8,
    },
    notFoundButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
    },
    notFoundButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});