import rawMenu from '../../cafeBot/data/menu.json';
import type {MenuData, MenuItem, OrderLineItem, OrderState} from '../types.ts';

type OrderListener = (state: OrderState) => void;

const MENU_DATA: MenuData = rawMenu as MenuData;

export class MockCafeBotService {
  private orderItems: OrderLineItem[] = [];
  private confirmedOrdersCount = 0;
  private lastConfirmedOrderId: string | null = null;
  private listeners = new Set<OrderListener>();

  getMenuData(): MenuData {
    return MENU_DATA;
  }

  getCategories(): string[] {
    return MENU_DATA.categories;
  }

  getItemsByCategory(category: string): MenuItem[] {
    return MENU_DATA.items.filter(
      (item) => item.category.toLowerCase() === category.toLowerCase()
    );
  }

  getState(): OrderState {
    const totalCount = this.orderItems.reduce((sum, line) => sum + line.qty, 0);
    const subtotal = this.orderItems.reduce(
      (sum, line) => sum + line.item.price * line.qty,
      0
    );
    return {
      items: this.orderItems.map((line) => ({...line})),
      totalCount,
      subtotal,
      confirmedOrdersCount: this.confirmedOrdersCount,
      lastConfirmedOrderId: this.lastConfirmedOrderId,
    };
  }

  subscribe(listener: OrderListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  addItem(item: MenuItem, qty = 1, selectedOption?: string): void {
    if (!item.available) return;
    const existing = this.orderItems.find((entry) => entry.item.id === item.id);
    if (existing) {
      existing.qty += qty;
      if (selectedOption) existing.selectedOption = selectedOption;
    } else {
      this.orderItems.push({item, qty, selectedOption});
    }
    this.notify();
  }

  clearOrder(): void {
    this.orderItems = [];
    this.notify();
  }

  confirmOrder(): {confirmed: boolean; orderId?: string; total: number} {
    const current = this.getState();
    if (current.items.length === 0) {
      return {confirmed: false, total: 0};
    }
    this.confirmedOrdersCount += 1;
    const orderId = `CB-${String(1000 + this.confirmedOrdersCount)}`;
    this.lastConfirmedOrderId = orderId;
    this.orderItems = [];
    this.notify();
    return {confirmed: true, orderId, total: current.subtotal};
  }

  processCustomerMessage(rawInput: string): string {
    const input = rawInput.trim();
    const lower = input.toLowerCase();

    if (!input) {
      return 'Please type a message so I can help with your cafe order.';
    }

    // 1. Explicit confirmation
    if (/\b(confirm|place order|checkout|finalize|yes confirm)\b/.test(lower)) {
      const result = this.confirmOrder();
      if (!result.confirmed) {
        return 'Your order is currently empty. Tell me what you would like from our menu before confirming.';
      }
      return `Order ${result.orderId} confirmed for $${result.total.toFixed(2)}. Thank you! (Demo mode: saved locally in session state; Phase 2 will persist confirmed orders to data/orders.json.)`;
    }

    // 2. Clear or cancel order
    if (/\b(clear order|cancel order|start over|reset order)\b/.test(lower)) {
      if (this.orderItems.length === 0) {
        return 'Your order is already empty.';
      }
      this.clearOrder();
      return 'I cleared your current order. Ready whenever you want to start fresh!';
    }

    // 3. Review / view order
    if (
      /\b(review|my order|cart|summary|bill|total|what did i order)\b/.test(
        lower
      )
    ) {
      return this.formatOrderSummary();
    }

    // 4. Remove item
    if (/\b(remove|delete|drop)\b/.test(lower)) {
      const target = this.findMentionedItem(lower);
      if (target) {
        const idx = this.orderItems.findIndex(
          (entry) => entry.item.id === target.id
        );
        if (idx >= 0) {
          this.orderItems.splice(idx, 1);
          this.notify();
          return `Removed ${target.name} from your order.\n\n${this.formatOrderSummary()}`;
        }
        return `${target.name} is not currently in your order.`;
      }
    }

    // 5. Dietary / allergen inquiry
    if (/\b(vegan|vegetarian|gluten[- ]?free|allergen|dairy|nuts?)\b/.test(lower)) {
      return this.handleDietaryQuery(lower);
    }

    // 6. Specific menu item lookup or add-to-order
    const mentionedItem = this.findMentionedItem(lower);
    if (mentionedItem) {
      if (!mentionedItem.available) {
        const alternatives = MENU_DATA.items
          .filter(
            (i) => i.category === mentionedItem.category && i.available
          )
          .map((i) => `${i.name} ($${i.price.toFixed(2)})`)
          .join(' or ');
        return `Sorry, ${mentionedItem.name} is temporarily unavailable right now. Available ${mentionedItem.category} options: ${alternatives}.`;
      }

      const isQuestionOnly =
        /\b(price|cost|how much|ingredients|describe|what is|size|sizes|options|calories|allergens)\b/.test(
          lower
        ) && !/\b(add|order|want|get|give|have|take|buy|\d+)\b/.test(lower);

      if (isQuestionOnly) {
        const allergensText =
          mentionedItem.allergens.length > 0
            ? `Allergens: ${mentionedItem.allergens.join(', ')}.`
            : 'No major allergens listed.';
        return `${mentionedItem.name} — $${mentionedItem.price.toFixed(2)}\n${mentionedItem.description}\nSizes: ${mentionedItem.sizes.join(', ')} · Options: ${mentionedItem.options.join(', ')}\n${allergensText}`;
      }

      const qtyMatch = lower.match(/\b([1-9])\b/);
      const qty = qtyMatch ? Number(qtyMatch[1]) : 1;
      const matchedOpt = mentionedItem.options.find((opt) =>
        lower.includes(opt.toLowerCase())
      );

      this.addItem(mentionedItem, qty, matchedOpt);
      const optionNote = matchedOpt ? ` (${matchedOpt})` : '';
      return `Added ${qty}x ${mentionedItem.name}${optionNote} at $${mentionedItem.price.toFixed(2)} each.\n\n${this.formatOrderSummary()}`;
    }

    // 7. Category browsing
    const matchedCategory = MENU_DATA.categories.find((cat) =>
      lower.includes(cat.toLowerCase())
    );
    if (matchedCategory) {
      return this.formatCategoryMenu(matchedCategory);
    }

    // 8. Full menu request
    if (/\b(menu|items|list|what do you have|serve|categories)\b/.test(lower)) {
      return this.formatFullMenuOverview();
    }

    // 9. Greetings / help
    if (/\b(hi|hello|hey|good morning|good afternoon|help)\b/.test(lower)) {
      return `Hello! Welcome to ${MENU_DATA.cafeName}. You can browse categories (${MENU_DATA.categories.join(', ')}), ask about allergens, or order items like "1 Velvet Flat White" or "2 Brioche Smash Burger".`;
    }

    return `I could not find a matching item on our menu. Try asking for "menu", a category (${MENU_DATA.categories.join(', ')}), or an item such as "Velvet Flat White" or "Burnt Basque Cheesecake".`;
  }

  private findMentionedItem(lower: string): MenuItem | undefined {
    // Exact full name match first
    const exact = MENU_DATA.items.find((item) =>
      lower.includes(item.name.toLowerCase())
    );
    if (exact) return exact;

    // Keyword token match (at least 1 distinctive word >= 4 chars)
    const aliases: Record<string, string> = {
      'flat white': 'cof-01',
      cortado: 'cof-02',
      'pour over': 'cof-03',
      matcha: 'tea-01',
      chai: 'tea-02',
      'cold brew': 'cld-01',
      yuzu: 'cld-02',
      tonic: 'cld-02',
      hibiscus: 'cld-03',
      spritz: 'cld-03',
      smash: 'brg-01',
      'beef burger': 'brg-01',
      halloumi: 'brg-02',
      portobello: 'brg-02',
      turkey: 'snd-01',
      focaccia: 'snd-01',
      avocado: 'snd-02',
      sourdough: 'snd-02',
      cheesecake: 'des-01',
      basque: 'des-01',
      croissant: 'des-02',
      almond: 'des-02',
    };

    for (const [alias, id] of Object.entries(aliases)) {
      if (lower.includes(alias)) {
        return MENU_DATA.items.find((item) => item.id === id);
      }
    }
    return undefined;
  }

  private formatCategoryMenu(category: string): string {
    const items = this.getItemsByCategory(category);
    const lines = items.map((item) => {
      const status = item.available ? `$${item.price.toFixed(2)}` : 'Unavailable';
      return `• ${item.name} — ${status}\n  ${item.description}`;
    });
    return `${category} Menu:\n${lines.join('\n')}\n\nSay an item name to add it to your order.`;
  }

  private formatFullMenuOverview(): string {
    const sections = MENU_DATA.categories.map((cat) => {
      const items = this.getItemsByCategory(cat)
        .map(
          (item) =>
            `${item.name} ($${item.price.toFixed(2)}${item.available ? '' : ', Sold Out'})`
        )
        .join(', ');
      return `${cat}: ${items}`;
    });
    return `${MENU_DATA.cafeName} Menu:\n${sections.join('\n')}\n\nTell me any item name or category for details and ordering.`;
  }

  private handleDietaryQuery(lower: string): string {
    if (lower.includes('vegan')) {
      const matches = MENU_DATA.items.filter(
        (item) =>
          item.available &&
          item.dietary.some((tag) => tag.toLowerCase().includes('vegan'))
      );
      return `Available Vegan & Vegan-Option items:\n${matches
        .map((i) => `• ${i.name} ($${i.price.toFixed(2)}) — ${i.dietary.join(', ')}`)
        .join('\n')}`;
    }
    if (lower.includes('gluten')) {
      const matches = MENU_DATA.items.filter(
        (item) =>
          item.available &&
          (item.dietary.includes('Gluten-Free') ||
            item.options.some((o) => o.toLowerCase().includes('gluten-free')))
      );
      return `Gluten-Free & GF-Option items:\n${matches
        .map((i) => `• ${i.name} ($${i.price.toFixed(2)})`)
        .join('\n')}`;
    }
    if (lower.includes('dairy') || lower.includes('nut') || lower.includes('allergen')) {
      const nutFree = MENU_DATA.items
        .filter((i) => i.available && !i.allergens.includes('Tree Nuts'))
        .slice(0, 6)
        .map((i) => `${i.name} (Allergens: ${i.allergens.length ? i.allergens.join(', ') : 'None'})`);
      return `Allergen note from our menu:\n${nutFree.join('\n')}\nAsk about any specific item for full allergen details.`;
    }
    return this.formatFullMenuOverview();
  }

  private formatOrderSummary(): string {
    const state = this.getState();
    if (state.items.length === 0) {
      return 'Your current order is empty. Ask for the menu or name an item to begin!';
    }
    const lines = state.items.map((entry) => {
      const opt = entry.selectedOption ? ` [${entry.selectedOption}]` : '';
      return `• ${entry.qty}x ${entry.item.name}${opt} — $${(entry.item.price * entry.qty).toFixed(2)}`;
    });
    return `Current Order (${state.totalCount} item${state.totalCount === 1 ? '' : 's'}):\n${lines.join('\n')}\nSubtotal: $${state.subtotal.toFixed(2)}\n\nReply "Confirm order" to finalize, or add more items.`;
  }
}

export const cafeBotService = new MockCafeBotService();
