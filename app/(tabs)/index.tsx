import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCart } from '@/contexts/CartContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 20 * 2 - CARD_GAP) / 2;

function ProductCard({
  item,
  tintColor,
  cardBg,
  iconColor,
  onAdd,
  onPress,
  quantity,
  onQuantityChange,
  onRemove,
}: {
  item: Product;
  tintColor: string;
  cardBg: string;
  iconColor: string;
  onAdd: () => void;
  onPress: () => void;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onRemove: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.productCard, { backgroundColor: cardBg }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.productImage} contentFit="cover" />
      ) : (
        <View style={[styles.productImage, styles.placeholderImage]}>
          <Ionicons name="fish" size={40} color={iconColor} />
        </View>
      )}
      {!item.is_available && (
        <View style={styles.outOfStockOverlay}>
          <ThemedText style={styles.outOfStockText} lightColor="#fff" darkColor="#fff">
            Out of Stock
          </ThemedText>
        </View>
      )}
      {item.cleaning_available && (
        <View style={[styles.badge, { backgroundColor: '#2ECC71' }]}>
          <ThemedText style={styles.badgeText} lightColor="#fff" darkColor="#fff">
            Cleaning
          </ThemedText>
        </View>
      )}
      <View style={styles.productInfo}>
        <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.productName}>
          {item.name}
        </ThemedText>
        <ThemedText style={[styles.categoryTag, { color: iconColor }]}>
          {item.category}
        </ThemedText>
        <View style={styles.priceRow}>
          <ThemedText type="defaultSemiBold" style={[styles.price, { color: tintColor }]}>
            ₹{item.price}
          </ThemedText>
          <ThemedText style={[styles.unit, { color: iconColor }]}>per kg</ThemedText>
        </View>
        {quantity > 0 ? (
          <View style={[styles.quantityControl, { borderColor: tintColor }]}>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={(e) => {
                e.stopPropagation?.();
                if (quantity > 1) {
                  onQuantityChange(quantity - 1);
                } else {
                  onRemove();
                }
              }}
            >
              <Ionicons name="remove" size={16} color={tintColor} />
            </TouchableOpacity>
            <ThemedText style={[styles.qtyDisplay, { color: tintColor }]}>
              {quantity}
            </ThemedText>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={(e) => {
                e.stopPropagation?.();
                onQuantityChange(quantity + 1);
              }}
            >
              <Ionicons name="add" size={16} color={tintColor} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: item.is_available ? tintColor : '#ccc' },
            ]}
            activeOpacity={0.8}
            onPress={(e) => {
              e.stopPropagation?.();
              onAdd();
            }}
            disabled={!item.is_available}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <ThemedText style={styles.addButtonText} lightColor="#fff" darkColor="#000">
              Add
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { addToCart, getItemCount, items, updateQuantity, removeFromCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');
  const bgColor = useThemeColor({}, 'background');

  const searchBg = useThemeColor({ light: '#F4F6F8', dark: '#1E2022' }, 'background');
  const searchBorder = useThemeColor({ light: '#E0E4E8', dark: '#2C2F33' }, 'background');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2022' }, 'background');

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setProducts(data as Product[]);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const filteredProducts = searchQuery
    ? products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : products;

  const cartCount = getItemCount();

  const renderProduct = ({ item, index }: { item: Product; index: number }) => {
    const cartItem = items.find(ci => ci.product.id === item.id);
    const quantity = cartItem?.quantity || 0;

    return (
      <View style={[styles.productCardWrapper, index % 2 === 0 ? { marginRight: CARD_GAP } : {}]}>
        <ProductCard
          item={item}
          tintColor={tintColor}
          cardBg={cardBg}
          iconColor={iconColor}
          quantity={quantity}
          onAdd={() => addToCart(item)}
          onQuantityChange={(qty) => updateQuantity(item.id, qty)}
          onRemove={() => removeFromCart(item.id)}
          onPress={() => router.push(`/product/${item.id}`)}
        />
      </View>
    );
  };

  const ListHeader = () => (
    <>
      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: searchBg, borderColor: searchBorder }]}>
        <Ionicons name="search-outline" size={20} color={iconColor} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Search for fish, prawns, crab..."
          placeholderTextColor={iconColor}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={iconColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* Banner */}
      <View style={[styles.bannerContainer, { backgroundColor: tintColor }]}>
        <View style={styles.bannerContent}>
          <View style={styles.bannerTextArea}>
            <ThemedText style={styles.bannerTitle} lightColor="#fff" darkColor="#000">
              Fresh Catch Daily 🐟
            </ThemedText>
            <ThemedText
              style={styles.bannerSubtitle}
              lightColor="rgba(255,255,255,0.9)"
              darkColor="rgba(0,0,0,0.7)"
            >
              Premium seafood delivered to your door. Free delivery above ₹500!
            </ThemedText>
          </View>
          <View style={styles.bannerIconArea}>
            <Ionicons name="fish" size={60} color="rgba(255,255,255,0.3)" />
          </View>
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle">
          {searchQuery ? `Results for "${searchQuery}"` : 'All Products'}
        </ThemedText>
        <ThemedText style={{ color: iconColor, fontSize: 13 }}>
          {filteredProducts.length} items
        </ThemedText>
      </View>
    </>
  );

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      {loading ? (
        <ActivityIndicator size="large" color={tintColor} />
      ) : (
        <>
          <Ionicons name="fish-outline" size={56} color={iconColor} />
          <ThemedText type="subtitle" style={{ marginTop: 16 }}>
            {searchQuery ? 'No products found' : 'No products available'}
          </ThemedText>
          <ThemedText style={{ color: iconColor, marginTop: 8 }}>
            {searchQuery ? 'Try a different search term' : 'Check back later!'}
          </ThemedText>
        </>
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: bgColor }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="fish" size={26} color={tintColor} />
          <ThemedText type="defaultSemiBold" style={styles.appName}>
            FishApp
          </ThemedText>
        </View>
        <TouchableOpacity
          style={styles.cartButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => router.push('/cart')}
        >
          <Ionicons name="cart-outline" size={26} color={textColor} />
          {cartCount > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: tintColor }]}>
              <ThemedText style={styles.cartBadgeText} lightColor="#fff" darkColor="#000">
                {cartCount > 99 ? '99+' : cartCount}
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Product Grid */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={filteredProducts.length > 0 ? styles.row : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tintColor} />
        }
      />
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
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appName: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
  cartButton: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    marginTop: 16,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  bannerContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 24,
    padding: 24,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerTextArea: {
    flex: 1,
  },
  bannerIconArea: {
    marginLeft: 16,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  row: {
    justifyContent: 'flex-start',
  },
  productCardWrapper: {
    width: CARD_WIDTH,
    marginBottom: CARD_GAP,
  },
  productCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: CARD_WIDTH * 0.75,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  outOfStockText: {
    fontSize: 14,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  productInfo: {
    padding: 10,
    gap: 3,
  },
  productName: {
    fontSize: 13,
    lineHeight: 18,
  },
  categoryTag: {
    fontSize: 11,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontSize: 16,
  },
  unit: {
    fontSize: 11,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 4,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginTop: 4,
  },
  qtyButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  qtyDisplay: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
});
