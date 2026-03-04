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
    useWindowDimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = SCREEN_WIDTH * 0.6;

export default function ProductDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { addToCart, items, updateQuantity, toggleCleaning } = useCart();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [cleaningSelected, setCleaningSelected] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);

    const scrollY = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const { width: screenWidth } = useWindowDimensions();

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

    // Load existing cart item data when product loads
    useEffect(() => {
        if (product) {
            const existingInCart = items.find((item) => item.product.id === id);
            if (existingInCart) {
                setQuantity(existingInCart.quantity);
                setCleaningSelected(existingInCart.cleaningSelected);
            }
        }
    }, [product, id, items]);

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
        const existingInCart = items.find((item) => item.product.id === id);
        if (existingInCart) {
            // Update quantity if already in cart
            updateQuantity(id!, quantity);
        } else {
            // Add new product to cart with cleaning option
            console.log('Adding to cart:', { product, quantity, cleaningSelected });
            addToCart(product, quantity, cleaningSelected);
        }
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

                {/* Product Info - Simple Top Section */}
                <View style={styles.topSection}>
                    {/* Left: Name and Category */}
                    <View style={styles.nameSection}>
                        <ThemedText style={styles.productName} numberOfLines={2}>
                            {product.name}
                        </ThemedText>
                        <View style={[styles.categoryBadge, { backgroundColor: `${tintColor}15` }]}>
                            <ThemedText style={[styles.categoryText, { color: tintColor }]}>
                                {product.category}
                            </ThemedText>
                        </View>
                    </View>

                    {/* Right: Price and Quantity */}
                    <View style={styles.rightSection}>
                        <View style={styles.priceSection}>
                            <ThemedText style={[styles.price, { color: tintColor }]}>
                                ₹{product.price}
                            </ThemedText>
                            <ThemedText style={[styles.priceUnit, { color: iconColor }]}>
                                /kg
                            </ThemedText>
                        </View>

                        {product.is_available && (
                            <View style={styles.quickQuantity}>
                                <TouchableOpacity
                                    onPress={() => setQuantity(Math.max(1, quantity - 1))}
                                    disabled={quantity <= 1}
                                    style={[styles.quickQtyBtn, { opacity: quantity <= 1 ? 0.5 : 1 }]}>
                                    <Ionicons name="remove" size={16} color={textColor} />
                                </TouchableOpacity>
                                <ThemedText style={styles.qtyValue}>{quantity}kg</ThemedText>
                                <TouchableOpacity
                                    onPress={() => setQuantity(quantity + 1)}
                                    style={styles.quickQtyBtn}>
                                    <Ionicons name="add" size={16} color={textColor} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* Availability and Cleaning Option */}
                {!product.is_available && (
                    <View style={styles.outOfStockBanner}>
                        <Ionicons name="alert-circle" size={16} color="#EF4444" />
                        <ThemedText style={styles.outOfStockText}>
                            Currently unavailable
                        </ThemedText>
                    </View>
                )}

                {product.is_available && product.cleaning_available && product.cleaning_price_per_kg && (
                    <View style={styles.cleaningQuickOption}>
                        <TouchableOpacity
                            style={[styles.cleaningToggle, cleaningSelected && { borderColor: tintColor }]}
                            onPress={() => {
                                setCleaningSelected(!cleaningSelected);
                                if (existingInCart) {
                                    toggleCleaning(id!);
                                }
                            }}>
                            <View style={[styles.checkBox, cleaningSelected && { backgroundColor: tintColor, borderColor: tintColor }]}>
                                {cleaningSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
                            </View>
                            <View style={{ flex: 1 }}>
                                <ThemedText style={styles.cleaningLabel}>
                                    Add Cleaning Service
                                </ThemedText>
                                <ThemedText style={[styles.cleaningSubtext, { color: iconColor }]}>
                                    +₹{product.cleaning_price_per_kg}/kg
                                </ThemedText>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Description Section */}
                {product.description && (
                    <View style={styles.descriptionSection}>
                        <ThemedText style={styles.sectionTitle}>About this product</ThemedText>
                        <View style={styles.descriptionBox}>
                            <ThemedText 
                                style={[styles.descriptionText, { color: iconColor }]}
                                numberOfLines={descriptionExpanded ? undefined : 3}
                            >
                                {product.description}
                            </ThemedText>
                        </View>
                        {product.description.length > 100 && (
                            <TouchableOpacity
                                onPress={() => setDescriptionExpanded(!descriptionExpanded)}
                                style={styles.expandButton}
                            >
                                <ThemedText style={[styles.expandButtonText, { color: tintColor }]}>
                                    {descriptionExpanded ? 'Show less' : 'Show more'}
                                </ThemedText>
                                <Ionicons 
                                    name={descriptionExpanded ? 'chevron-up' : 'chevron-down'} 
                                    size={16} 
                                    color={tintColor} 
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {product.is_available && (
                    <>

                        {/* Price Breakdown Card */}
                        <View style={styles.priceCard}>
                            <ThemedText style={styles.sectionTitle}>
                                Price Details
                            </ThemedText>
                            
                            <View style={styles.breakdownRow}>
                                <ThemedText style={[styles.breakdownLabel, { color: iconColor }]}>
                                    Product ({quantity} kg)
                                </ThemedText>
                                <ThemedText style={styles.breakdownValue}>
                                    ₹{itemTotal}
                                </ThemedText>
                            </View>

                            {cleaningSelected && cleaningCharge > 0 && (
                                <View style={styles.breakdownRow}>
                                    <ThemedText style={[styles.breakdownLabel, { color: iconColor }]}>
                                        Cleaning service
                                    </ThemedText>
                                    <ThemedText style={styles.breakdownValue}>
                                        +₹{cleaningCharge}
                                    </ThemedText>
                                </View>
                            )}

                            <View style={[styles.breakdownTotal, { borderTopColor: `${borderColor}40`, backgroundColor: `${tintColor}08` }]}>
                                <ThemedText style={styles.totalLabel}>
                                    Total Amount
                                </ThemedText>
                                <ThemedText style={[styles.totalValue, { color: tintColor }]}>
                                    ₹{totalPrice}
                                </ThemedText>
                            </View>
                        </View>

                        {/* Bottom Spacing */}
                        <View style={{ height: 20 }} />
                    </>
                )}
            </Animated.ScrollView>

            {/* Sticky Add to Cart Button */}
            {product?.is_available && (
                <View style={[styles.stickyButtonContainer, { backgroundColor: bgColor }]}>
                    <TouchableOpacity
                        style={[styles.addToCartButton, { backgroundColor: tintColor }]}
                        activeOpacity={0.85}
                        onPress={handleAddToCart}
                    >
                        <Ionicons name="cart" size={22} color="#FFFFFF" />
                        <ThemedText
                            type="defaultSemiBold"
                            lightColor="#fff"
                            darkColor="#000"
                            style={styles.addToCartText}
                        >
                            {existingInCart ? 'Update Cart' : 'Add to Cart'} • ₹{totalPrice}
                        </ThemedText>
                    </TouchableOpacity>
                </View>
            )}
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
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
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
        top: -8,
        right: -8,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    cartBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 100 : 92,
        paddingBottom: 32,
    },
    imageContainer: {
        width: SCREEN_WIDTH,
        height: HEADER_MAX_HEIGHT,
        backgroundColor: '#F3F4F6',
        overflow: 'hidden',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    imageLoader: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
    },
    placeholderImage: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
    },
    
    /* Info Card Section */
    topSection: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 12,
        gap: 16,
        alignItems: 'flex-start',
    },
    nameSection: {
        flex: 1,
        gap: 8,
    },
    productName: {
        fontSize: 20,
        fontWeight: '700',
        lineHeight: 28,
    },
    rightSection: {
        alignItems: 'flex-end',
        gap: 12,
    },
    priceSection: {
        alignItems: 'flex-end',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    price: {
        fontSize: 26,
        fontWeight: '800',
    },
    priceUnit: {
        fontSize: 13,
        fontWeight: '500',
    },
    quickQuantity: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    quickQtyBtn: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyValue: {
        fontSize: 13,
        fontWeight: '700',
        minWidth: 35,
        textAlign: 'center',
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    outOfStockBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FEE2E2',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 10,
        borderRadius: 8,
    },
    outOfStockText: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '600',
    },
    cleaningQuickOption: {
        marginHorizontal: 16,
        marginBottom: 12,
    },
    cleaningToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1.5,
        borderColor: 'rgba(0,0,0,0.12)',
        borderRadius: 8,
    },
    checkBox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cleaningLabel: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2,
    },
    cleaningSubtext: {
        fontSize: 11,
        fontWeight: '500',
    },
    optionsIndicator: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
        flexWrap: 'wrap',
    },
    optionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
    },
    optionBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    
    /* Description Section */
    descriptionSection: {
        marginHorizontal: 16,
        marginTop: 20,
        gap: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    descriptionBox: {
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    descriptionText: {
        fontSize: 14,
        lineHeight: 22,
    },
    expandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
    },
    expandButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    
    
    /* Price Card */
    priceCard: {
        marginHorizontal: 16,
        marginTop: 18,
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        gap: 14,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    breakdownLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    breakdownValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    breakdownTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 14,
        marginTop: 4,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderTopWidth: 1.5,
        borderRadius: 10,
    },
    totalLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
    totalValue: {
        fontSize: 22,
        fontWeight: '800',
    },
    
    /* Add to Cart Button */
    stickyButtonContainer: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        paddingBottom: Platform.OS === 'ios' ? 32 : 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    addToCartButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: 56,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 5,
    },
    addToCartText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    
    /* Not Found */
    notFoundContainer: {
        alignItems: 'center',
        paddingHorizontal: 24,
        gap: 18,
    },
    notFoundTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
    },
    notFoundSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    notFoundButton: {
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    notFoundButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});