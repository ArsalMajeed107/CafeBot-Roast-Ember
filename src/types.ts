export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  sizes: string[];
  options: string[];
  allergens: string[];
  dietary: string[];
  available: boolean;
}

export interface MenuData {
  cafeName: string;
  currency: string;
  categories: string[];
  items: MenuItem[];
}

export interface OrderLineItem {
  item: MenuItem;
  qty: number;
  selectedOption?: string;
}

export interface OrderState {
  items: OrderLineItem[];
  totalCount: number;
  subtotal: number;
  confirmedOrdersCount: number;
  lastConfirmedOrderId: string | null;
}

export type MessageSender = 'customer' | 'bot';

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: string;
}
