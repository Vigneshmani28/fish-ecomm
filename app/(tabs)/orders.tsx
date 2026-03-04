import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { supabase } from "@/lib/supabase";
import { OrderWithItems } from "@/types/database";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");

const STATUS_CONFIG: Record<
  string,
  {
    color: string;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    gradient: readonly [string, string];
  }
> = {
  PENDING: {
    color: "#F39C12",
    label: "Pending",
    icon: "time-outline",
    gradient: ["#F39C12", "#E67E22"] as const,
  },
  CONFIRMED: {
    color: "#3498DB",
    label: "Confirmed",
    icon: "checkmark-circle-outline",
    gradient: ["#3498DB", "#2980B9"] as const,
  },
  PACKED: {
    color: "#9B59B6",
    label: "Packed",
    icon: "cube-outline",
    gradient: ["#9B59B6", "#8E44AD"] as const,
  },
  PREPARING: {
    color: "#9B59B6",
    label: "Preparing",
    icon: "restaurant-outline",
    gradient: ["#9B59B6", "#8E44AD"] as const,
  },
  OUT_FOR_DELIVERY: {
    color: "#E67E22",
    label: "Out for Delivery",
    icon: "bicycle-outline",
    gradient: ["#E67E22", "#D35400"] as const,
  },
  DELIVERED: {
    color: "#2ECC71",
    label: "Delivered",
    icon: "checkmark-done-outline",
    gradient: ["#2ECC71", "#27AE60"] as const,
  },
  CANCELLED: {
    color: "#E74C3C",
    label: "Cancelled",
    icon: "close-circle-outline",
    gradient: ["#E74C3C", "#C0392B"] as const,
  },
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
  const [scaleValue] = useState(new Animated.Value(1));

  const orderStatus = order.order_status?.toUpperCase() || "PENDING";
  const status = STATUS_CONFIG[orderStatus] || {
    color: tintColor,
    label: order.order_status || "Unknown",
    icon: "help-outline" as const,
    gradient: [tintColor, tintColor] as const,
  };

  const date = new Date(order.created_at);
  const formattedDate = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 150,
      friction: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 3,
    }).start();
  };

  const itemCount = order.order_items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <View style={[styles.orderCard, { backgroundColor: cardBg }]}>
        {/* Status Banner */}
        <LinearGradient
          colors={status.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.statusBanner}
        >
          <View style={styles.statusBannerContent}>
            <Ionicons name={status.icon as any} size={16} color="#fff" />
            <ThemedText style={styles.statusBannerText}>
              {status.label}
            </ThemedText>
          </View>
        </LinearGradient>

        <TouchableOpacity
          style={styles.orderHeader}
          onPress={() => setExpanded(!expanded)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <View style={styles.orderHeaderLeft}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${status.color}15` },
              ]}
            >
              <Ionicons name="receipt-outline" size={20} color={status.color} />
            </View>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.orderId}>
                Order #{order.id.slice(-8).toUpperCase()}
              </ThemedText>
              <View style={styles.orderMeta}>
                <Ionicons name="calendar-outline" size={12} color={iconColor} />
                <ThemedText style={[styles.orderDate, { color: iconColor }]}>
                  {formattedDate}
                </ThemedText>
                <View style={styles.dot} />
                <Ionicons name="time-outline" size={12} color={iconColor} />
                <ThemedText style={[styles.orderDate, { color: iconColor }]}>
                  {formattedTime}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.orderHeaderRight}>
            <View style={styles.itemCountBadge}>
              <ThemedText style={styles.itemCountText}>
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </ThemedText>
            </View>
            <Ionicons
              name={expanded ? "chevron-up-circle" : "chevron-down-circle"}
              size={24}
              color={status.color}
            />
          </View>
        </TouchableOpacity>

        {/* Quick Summary */}
        {!expanded && (
          <View style={styles.orderSummary}>
            <View style={styles.summaryItem}>
              <Ionicons name="fast-food-outline" size={14} color={iconColor} />
              <ThemedText style={[styles.summaryText, { color: iconColor }]}>
                {order.order_items.length} items
              </ThemedText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="cash-outline" size={14} color={iconColor} />
              <ThemedText style={[styles.summaryText, { color: iconColor }]}>
                ₹{order.total_amount}
              </ThemedText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons
                name={
                  order.payment_method === "cod"
                    ? "wallet-outline"
                    : "card-outline"
                }
                size={14}
                color={iconColor}
              />
              <ThemedText style={[styles.summaryText, { color: iconColor }]}>
                {order.payment_method === "cod" ? "COD" : "Paid"}
              </ThemedText>
            </View>
          </View>
        )}

        {expanded && (
          <View style={[styles.orderDetails, { borderTopColor: borderColor }]}>
            {order.order_items.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.orderItem,
                  index < order.order_items.length - 1 &&
                    styles.orderItemBorder,
                ]}
              >
                <View style={styles.orderItemImage}>
                  <Ionicons
                    name="fish-outline"
                    size={20}
                    color={status.color}
                  />
                </View>
                <View style={styles.orderItemInfo}>
                  <View style={styles.orderItemHeader}>
                    <ThemedText
                      type="defaultSemiBold"
                      style={styles.orderItemName}
                    >
                      {item.product?.name || "Unknown Product"}
                    </ThemedText>
                    <ThemedText
                      type="defaultSemiBold"
                      style={[styles.orderItemPrice, { color: status.color }]}
                    >
                      ₹
                      {item.price_at_time * item.quantity +
                        (item.cleaning_selected ? item.cleaning_charge : 0)}
                    </ThemedText>
                  </View>
                  <View style={styles.orderItemDetails}>
                    <View style={styles.quantityBadge}>
                      <ThemedText style={styles.quantityText}>
                        Qty: {item.quantity}
                      </ThemedText>
                    </View>
                    <ThemedText
                      style={[styles.unitPrice, { color: iconColor }]}
                    >
                      ₹{item.price_at_time} each
                    </ThemedText>
                  </View>
                  {item.cleaning_selected && (
                    <View style={styles.cleaningBadge}>
                      <Ionicons
                        name="sparkles-outline"
                        size={12}
                        color="#2ECC71"
                      />
                      <ThemedText style={styles.cleaningInfo}>
                        Cleaning: ₹{item.cleaning_charge}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
            ))}

            <View style={[styles.orderTotal, { borderTopColor: borderColor }]}>
              <View style={styles.totalRow}>
                <ThemedText style={styles.totalLabel}>Subtotal</ThemedText>
                <ThemedText style={styles.totalValue}>
                  ₹{order.total_amount - order.delivery_charge}
                </ThemedText>
              </View>
              <View style={styles.totalRow}>
                <ThemedText style={styles.totalLabel}>Delivery Fee</ThemedText>
                <ThemedText style={styles.totalValue}>
                  ₹{order.delivery_charge}
                </ThemedText>
              </View>
              <View style={[styles.totalRow, styles.grandTotal]}>
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.grandTotalLabel}
                >
                  Grand Total
                </ThemedText>
                <ThemedText
                  type="defaultSemiBold"
                  style={[styles.grandTotalValue, { color: status.color }]}
                >
                  ₹{order.total_amount}
                </ThemedText>
              </View>

              {/* <View style={styles.paymentInfo}>
                                <LinearGradient
                                    colors={[`${status.color}10`, 'transparent']}
                                    style={styles.paymentGradient}
                                >
                                    <Ionicons
                                        name={order.payment_method === 'cod' ? 'cash-outline' : 'card-outline'}
                                        size={16}
                                        color={status.color}
                                    />
                                    <ThemedText style={[styles.paymentMethod, { color: status.color }]}>
                                        {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                                    </ThemedText>
                                    <View style={[styles.paymentStatus, { backgroundColor: `${status.color}20` }]}>
                                        <ThemedText style={[styles.paymentStatusText, { color: status.color }]}>
                                            {order.payment_status}
                                        </ThemedText>
                                    </View>
                                </LinearGradient>
                            </View> */}
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tintColor = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");
  const bgColor = useThemeColor({}, "background");
  const cardBg = useThemeColor(
    { light: "#FFFFFF", dark: "#1E2022" },
    "background",
  );
  const borderColor = useThemeColor(
    { light: "#F0F2F5", dark: "#2A2D30" },
    "background",
  );

  const fetchOrders = useCallback(async () => {
    if (!session?.user) return;
    try {
      let query = supabase
        .from("orders")
        .select(
          `
                    *,
                    order_items (
                        *,
                        product:products (*)
                    )
                `,
        )
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (!error && data) {
        setOrders(data as OrderWithItems[]);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  // Fetch on every focus
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[`${tintColor}30`, "transparent"]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.headerGreeting}>Your Orders</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
              Order History
            </ThemedText>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tintColor} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <LinearGradient
            colors={[`${tintColor}20`, "transparent"]}
            style={styles.emptyGradient}
          >
            <View
              style={[styles.iconCircle, { backgroundColor: `${tintColor}15` }]}
            >
              <Ionicons name="bag-handle-outline" size={52} color={tintColor} />
            </View>
          </LinearGradient>
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            {"No Orders Yet"}
          </ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: iconColor }]}>
            {"Your orders will appear here once you place one"}
          </ThemedText>
          <TouchableOpacity
            style={styles.browseButton}
            activeOpacity={0.85}
            onPress={() => router.push("/(tabs)")}
          >
            <LinearGradient
              colors={[tintColor, `${tintColor}dd`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.browseButtonGradient}
            >
              <Ionicons name="fish-outline" size={20} color="#fff" />
              <ThemedText
                type="defaultSemiBold"
                style={styles.browseButtonText}
              >
                Browse Products
              </ThemedText>
            </LinearGradient>
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={tintColor}
              colors={[tintColor]}
            />
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
  headerGradient: {
    paddingTop: 56,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerGreeting: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyGradient: {
    padding: 30,
    borderRadius: 100,
    marginBottom: 20,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: "center",
    fontSize: 24,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  browseButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  browseButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  browseButtonText: {
    fontSize: 16,
    color: "#fff",
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    gap: 16,
  },
  orderCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statusBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusBannerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  orderHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  orderId: {
    fontSize: 16,
    marginBottom: 4,
  },
  orderMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  orderDate: {
    fontSize: 11,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#999",
    marginHorizontal: 4,
  },
  orderHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemCountBadge: {
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemCountText: {
    fontSize: 11,
    fontWeight: "600",
  },
  orderSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  summaryText: {
    fontSize: 12,
  },
  summaryDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  orderDetails: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  orderItem: {
    flexDirection: "row",
    paddingVertical: 12,
    gap: 12,
  },
  orderItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  orderItemImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  orderItemInfo: {
    flex: 1,
    gap: 4,
  },
  orderItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderItemName: {
    fontSize: 14,
    flex: 1,
  },
  orderItemPrice: {
    fontSize: 14,
  },
  orderItemDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quantityBadge: {
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  quantityText: {
    fontSize: 11,
    fontWeight: "500",
  },
  unitPrice: {
    fontSize: 11,
  },
  cleaningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  cleaningInfo: {
    fontSize: 11,
    color: "#2ECC71",
  },
  orderTotal: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  totalValue: {
    fontSize: 14,
  },
  grandTotal: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
  },
  grandTotalLabel: {
    fontSize: 16,
  },
  grandTotalValue: {
    fontSize: 18,
  },
  paymentInfo: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  paymentGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  paymentMethod: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  paymentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
