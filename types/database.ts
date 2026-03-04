export interface Product {
    id: string;
    name: string;
    category: string;
    description: string | null;
    price: number;
    stock_quantity: number;
    image_url: string | null;
    is_available: boolean;
    created_at: string;
    cleaning_available: boolean;
    cleaning_price_per_kg: number | null;
}

export interface Profile {
    id: string;
    name: string | null;
    phone: string | null;
    role: string;
    created_at: string;
}

export interface Order {
    id: string;
    user_id: string;
    total_amount: number;
    delivery_charge: number;
    payment_method: string;
    payment_status: string;
    order_status: string;
    address_snapshot: AddressSnapshot | null;
    created_at: string;
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    price_at_time: number;
    cleaning_selected: boolean;
    cleaning_charge: number;
}

export interface OrderWithItems extends Order {
    order_items: (OrderItem & { product?: Product })[];
}

export interface AddressSnapshot {
    name: string;
    phone: string;
    address: string;
    landmark?: string;
    city: string;
    pincode: string;
}

export interface Address {
    id: string;
    user_id: string;
    label: string;
    full_name: string;
    phone: string;
    line1: string;
    line2: string | null;
    landmark: string | null;
    city: string;
    state: string | null;
    pincode: string;
    is_default: boolean;
    created_at: string;
}

export interface CartItem {
    product: Product;
    quantity: number;
    cleaningSelected: boolean;
}
