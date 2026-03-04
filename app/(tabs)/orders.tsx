import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { OrderWithItems } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

const STATUS_COLORS: Record<string, string> = {
    pending: '#F39C12',
    confirmed: '#3498DB',
    preparing: '#9B59B6',
    out_for_delivery: '#E67E22',
    delivered: '#2ECC71',
    cancelled: '#E74C3C',
};

const STATUS_LABELS: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
};

function OrderCard({
    order,
    tintColor,
    cardBg,
    iconColor,
    borderColor,
}: {
    order: OrderWithItems;
    tintColor: string;
    cardBg: string;
    iconColor: string;
    borderColor: string;
}) {
    const [expanded, setExpanded] = useState(false);
    const statusColor = STATUS_COLORS[order.order_status] || tintColor;
    const statusLabel = STATUS_LABELS[order.order_status] || order.order_status;

    const date = new Date(order.created_at);
    const formattedDate = date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <View style={[styles.orderCard, { backgroundColor: cardBg }]}>
            <TouchableOpacity
                style={styles.orderHeader}
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.7}
            >
                <View style={styles.orderHeaderLeft}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <View>
                        <ThemedText type="defaultSemiBold" style={styles.orderId}>
                            Order #{order.id.slice(-6).toUpperCase()}
                        </ThemedText>
                        <ThemedText style={[styles.orderDate, { color: iconColor }]}>
                            {formattedDate} • {formattedTime}
                        </ThemedText>
                    </View>
                </View>
                <View style={styles.orderHeaderRight}>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                        <ThemedText style={[styles.statusText, { color: statusColor }]}>
                            {statusLabel}
                        </ThemedText>
                    </View>
                    <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={iconColor}
                    />
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={[styles.orderDetails, { borderTopColor: borderColor }]}>
                    {order.order_items.map((item, index) => (
                        <View
                            key={item.id}
                            style={[
                                styles.orderItem,
                                index < order.order_items.length - 1 && {
                                    borderBottomWidth: StyleSheet.hairlineWidth,
                                    borderBottomColor: borderColor,
                                },
                            ]}
                        >
                            <View style={styles.orderItemInfo}>
                                <ThemedText style={styles.orderItemName}>
                                    {item.product?.name || 'Unknown Product'}
                                </ThemedText>
                                <ThemedText style={[styles.orderItemQty, { color: iconColor }]}>
                                    Qty: {item.quantity} × ₹{item.price_at_time}
                                </ThemedText>
                                {item.cleaning_selected && (
                                    <ThemedText style={[styles.cleaningInfo, { color: '#2ECC71' }]}>
                                        🧹 Cleaning: ₹{item.cleaning_charge}
                                    </ThemedText>
                                )}
                            </View>
                            <ThemedText type="defaultSemiBold">
                                ₹{item.price_at_time * item.quantity + (item.cleaning_selected ? item.cleaning_charge : 0)}
                            </ThemedText>
                        </View>
                    ))}

                    <View style={[styles.orderTotal, { borderTopColor: borderColor }]}>
                        <View style={styles.totalRow}>
                            <ThemedText style={{ color: iconColor }}>Delivery</ThemedText>
                            <ThemedText style={{ color: iconColor }}>₹{order.delivery_charge}</ThemedText>
                        </View>
                        <View style={styles.totalRow}>
                            <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
                                Total
                            </ThemedText>
                            <ThemedText type="defaultSemiBold" style={{ fontSize: 16, color: tintColor }}>
                                ₹{order.total_amount}
                            </ThemedText>
                        </View>
                        <View style={styles.paymentRow}>
                            <Ionicons
                                name={order.payment_method === 'cod' ? 'cash-outline' : 'card-outline'}
                                size={14}
                                color={iconColor}
                            />
                            <ThemedText style={[styles.paymentMethod, { color: iconColor }]}>
                                {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'} •{' '}
                                {order.payment_status}
                            </ThemedText>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

export default function OrdersScreen() {
    const router = useRouter();
    const { session } = useAuth();
    const [orders, setOrders] = useState<OrderWithItems[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const tintColor = useThemeColor({}, 'tint');
    const iconColor = useThemeColor({}, 'icon');
    const bgColor = useThemeColor({}, 'background');

    const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E2022' }, 'background');
    const borderColor = useThemeColor({ light: '#F0F2F5', dark: '#2A2D30' }, 'background');

    const fetchOrders = useCallback(async () => {
        if (!session?.user) return;
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
          *,
          order_items (
            *,
            product:products (*)
          )
        `)
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setOrders(data as OrderWithItems[]);
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [session]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrders();
    };

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: bgColor }]}>
                <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                    My Orders
                </ThemedText>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={tintColor} />
                </View>
            ) : orders.length === 0 ? (
                <View style={styles.center}>
                    <View style={[styles.iconCircle, { backgroundColor: `${tintColor}15` }]}>
                        <Ionicons name="receipt-outline" size={48} color={tintColor} />
                    </View>
                    <ThemedText type="subtitle" style={styles.emptyTitle}>
                        No Orders Yet
                    </ThemedText>
                    <ThemedText style={[styles.emptySubtitle, { color: iconColor }]}>
                        Your orders will appear here once you place one
                    </ThemedText>
                    <TouchableOpacity
                        style={[styles.browseButton, { backgroundColor: tintColor }]}
                        activeOpacity={0.85}
                        onPress={() => router.push('/(tabs)')}
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
                <FlatList
                    data={orders}
                    renderItem={({ item }) => (
                        <OrderCard
                            order={item}
                            tintColor={tintColor}
                            cardBg={cardBg}
                            iconColor={iconColor}
                            borderColor={borderColor}
                        />
                    )}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tintColor} />
                    }
                />
            )}
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
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
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
    orderCard: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    orderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    orderHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    orderId: {
        fontSize: 15,
    },
    orderDate: {
        fontSize: 12,
        marginTop: 2,
    },
    orderHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    orderDetails: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 16,
    },
    orderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    orderItemInfo: {
        flex: 1,
        gap: 2,
    },
    orderItemName: {
        fontSize: 14,
    },
    orderItemQty: {
        fontSize: 12,
    },
    cleaningInfo: {
        fontSize: 11,
    },
    orderTotal: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingVertical: 12,
        gap: 6,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    paymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    paymentMethod: {
        fontSize: 12,
    },
});
