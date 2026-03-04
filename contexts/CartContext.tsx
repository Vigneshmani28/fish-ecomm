import React, { createContext, useContext, useState, useCallback } from 'react';
import { CartItem, Product } from '@/types/database';

interface CartContextType {
    items: CartItem[];
    addToCart: (product: Product, quantity?: number, cleaningSelected?: boolean) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    toggleCleaning: (productId: string) => void;
    clearCart: () => void;
    getItemCount: () => number;
    getSubtotal: () => number;
    getCleaningTotal: () => number;
    getDeliveryCharge: () => number;
    getGrandTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const DELIVERY_CHARGE = 40;
const FREE_DELIVERY_ABOVE = 500;

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);

    const addToCart = useCallback((product: Product, quantity: number = 1, cleaningSelected: boolean = false) => {
        setItems(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { product, quantity, cleaningSelected }];
        });
    }, []);

    const removeFromCart = useCallback((productId: string) => {
        setItems(prev => prev.filter(item => item.product.id !== productId));
    }, []);

    const updateQuantity = useCallback((productId: string, quantity: number) => {
        if (quantity <= 0) {
            setItems(prev => prev.filter(item => item.product.id !== productId));
            return;
        }
        setItems(prev =>
            prev.map(item =>
                item.product.id === productId ? { ...item, quantity } : item
            )
        );
    }, []);

    const toggleCleaning = useCallback((productId: string) => {
        setItems(prev =>
            prev.map(item =>
                item.product.id === productId
                    ? { ...item, cleaningSelected: !item.cleaningSelected }
                    : item
            )
        );
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
    }, []);

    const getItemCount = useCallback(() => {
        return items.reduce((sum, item) => sum + item.quantity, 0);
    }, [items]);

    const getSubtotal = useCallback(() => {
        return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    }, [items]);

    const getCleaningTotal = useCallback(() => {
        return items.reduce((sum, item) => {
            if (item.cleaningSelected && item.product.cleaning_available && item.product.cleaning_price_per_kg) {
                return sum + item.product.cleaning_price_per_kg * item.quantity;
            }
            return sum;
        }, 0);
    }, [items]);

    const getDeliveryCharge = useCallback(() => {
        const subtotal = getSubtotal();
        if (subtotal === 0) return 0;
        return subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_CHARGE;
    }, [getSubtotal]);

    const getGrandTotal = useCallback(() => {
        return getSubtotal() + getCleaningTotal() + getDeliveryCharge();
    }, [getSubtotal, getCleaningTotal, getDeliveryCharge]);

    return (
        <CartContext.Provider
            value={{
                items,
                addToCart,
                removeFromCart,
                updateQuantity,
                toggleCleaning,
                clearCart,
                getItemCount,
                getSubtotal,
                getCleaningTotal,
                getDeliveryCharge,
                getGrandTotal,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
