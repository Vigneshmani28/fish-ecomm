import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCart } from '@/contexts/CartContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

export default function CategoriesScreen() {
    const router = useRouter();
    const { addToCart } = useCart();
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const tintColor = useThemeColor({}, 'tint');
    const iconColor = useThemeColor({}, 'icon');
    const bgColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');

    const categoryBg = useThemeColor({ light: '#F0F2F5', dark: '#111314' }, 'background');
    const activeCategoryBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2022' }, 'background');
    const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2022' }, 'background');
    const cardBorder = useThemeColor({ light: '#ECEEF0', dark: '#2C2F33' }, 'background');

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (selectedCategory) {
            fetchProductsByCategory(selectedCategory);
        }
    }, [selectedCategory]);

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('category')
                .eq('is_available', true);

            if (!error && data) {
                const uniqueCategories = [...new Set(data.map((p: any) => p.category))].filter(Boolean) as string[];
                setCategories(uniqueCategories);
                if (uniqueCategories.length > 0) {
                    setSelectedCategory(uniqueCategories[0]);
                }
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const fetchProductsByCategory = async (category: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('category', category)
                .eq('is_available', true)
                .order('name');

            if (!error && data) {
                setProducts(data as Product[]);
            }
        } catch (err) {
            console.error('Error fetching products:', err);
        } finally {
            setLoading(false);
        }
    };

    const getCategoryIcon = (name: string): keyof typeof Ionicons.glyphMap => {
        const lower = name.toLowerCase();
        if (lower.includes('prawn') || lower.includes('shrimp')) return 'restaurant';
        if (lower.includes('crab')) return 'skull';
        if (lower.includes('squid')) return 'water';
        if (lower.includes('fish') || lower.includes('sea')) return 'fish';
        return 'fish';
    };

    const renderProduct = ({ item }: { item: Product }) => (
        <TouchableOpacity
            style={[styles.varietyCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
            activeOpacity={0.7}
            onPress={() => router.push(`/product/${item.id}`)}
        >
            {item.image_url ? (
                <Image
                    source={{ uri: item.image_url }}
                    style={styles.varietyImage}
                    contentFit="cover"
                />
            ) : (
                <View style={[styles.varietyIconCircle, { backgroundColor: `${tintColor}18` }]}>
                    <Ionicons name="fish" size={24} color={tintColor} />
                </View>
            )}
            <View style={styles.varietyInfo}>
                <ThemedText type="defaultSemiBold" style={styles.varietyName}>
                    {item.name}
                </ThemedText>
                <ThemedText style={[styles.varietyPrice, { color: tintColor }]}>
                    ₹{item.price} / kg
                </ThemedText>
                {item.cleaning_available && (
                    <ThemedText style={[styles.cleaningTag, { color: '#2ECC71' }]}>
                        🧹 Cleaning available
                    </ThemedText>
                )}
            </View>
            <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: tintColor }]}
                activeOpacity={0.8}
                onPress={() => addToCart(item)}
            >
                <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: bgColor }]}>
                <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                    Categories
                </ThemedText>
            </View>

            <View style={styles.content}>
                {/* Left Panel — Category List */}
                <View style={[styles.leftPanel, { backgroundColor: categoryBg }]}>
                    {categories.map((cat) => {
                        const isActive = selectedCategory === cat;
                        return (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.categoryItem,
                                    {
                                        backgroundColor: isActive ? activeCategoryBg : 'transparent',
                                        borderLeftColor: isActive ? tintColor : 'transparent',
                                    },
                                ]}
                                onPress={() => setSelectedCategory(cat)}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={getCategoryIcon(cat)}
                                    size={22}
                                    color={isActive ? tintColor : iconColor}
                                />
                                <ThemedText
                                    style={[
                                        styles.categoryName,
                                        {
                                            color: isActive ? tintColor : textColor,
                                            fontWeight: isActive ? '700' : '400',
                                        },
                                    ]}
                                >
                                    {cat}
                                </ThemedText>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Right Panel — Products */}
                <View style={styles.rightPanel}>
                    <ThemedText type="subtitle" style={styles.rightTitle}>
                        {selectedCategory}
                    </ThemedText>
                    <ThemedText style={[styles.varietyCount, { color: iconColor }]}>
                        {products.length} items available
                    </ThemedText>

                    {loading ? (
                        <View style={styles.loadingCenter}>
                            <ActivityIndicator size="large" color={tintColor} />
                        </View>
                    ) : (
                        <FlatList
                            data={products}
                            renderItem={renderProduct}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.varietyList}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={
                                <View style={styles.loadingCenter}>
                                    <Ionicons name="fish-outline" size={40} color={iconColor} />
                                    <ThemedText style={{ color: iconColor, marginTop: 12 }}>
                                        No products in this category
                                    </ThemedText>
                                </View>
                            }
                        />
                    )}
                </View>
            </View>
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
    content: {
        flex: 1,
        flexDirection: 'row',
    },
    leftPanel: {
        width: 100,
        paddingTop: 8,
    },
    categoryItem: {
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderLeftWidth: 3,
        gap: 6,
    },
    categoryName: {
        fontSize: 12,
        textAlign: 'center',
    },
    rightPanel: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    rightTitle: {
        marginBottom: 2,
    },
    varietyCount: {
        fontSize: 13,
        marginBottom: 16,
    },
    varietyList: {
        gap: 10,
        paddingBottom: 20,
    },
    varietyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        gap: 12,
    },
    varietyIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    varietyImage: {
        width: 48,
        height: 48,
        borderRadius: 12,
    },
    varietyInfo: {
        flex: 1,
        gap: 2,
    },
    varietyName: {
        fontSize: 15,
    },
    varietyPrice: {
        fontSize: 14,
        fontWeight: '600',
    },
    cleaningTag: {
        fontSize: 11,
    },
    addBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
});
