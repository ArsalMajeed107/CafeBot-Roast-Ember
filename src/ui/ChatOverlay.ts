import {cafeBotService} from '../services/mockCafeBot.ts';
import type {ChatMessage, MessageSender, OrderState} from '../types.ts';

const QUICK_PROMPTS: Array<{label: string; prompt: string}> = [
  {label: 'Full Menu', prompt: 'Show me the menu'},
  {label: 'Coffee', prompt: 'Show Coffee options'},
  {label: 'Burgers', prompt: 'Show Burgers'},
  {label: 'Desserts', prompt: 'Show Desserts'},
  {label: 'Review Order', prompt: 'Review my order'},
  {label: 'Confirm Order', prompt: 'Confirm order'},
];

export class ChatOverlay {
  private container: HTMLElement;
  private shellEl: HTMLElement;
  private messagesEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private formEl: HTMLFormElement;
  private orderBadgeEl: HTMLElement;
  private toggleBtn: HTMLButtonElement;
  private collapsed = false;
  private messages: ChatMessage[] = [];
  private unsubscribeOrder?: () => void;

  constructor(mountTarget: HTMLElement) {
    this.container = mountTarget;
    this.shellEl = document.createElement('aside');
    this.shellEl.className = 'cafebot-chat-shell';
    this.shellEl.setAttribute('aria-label', 'CafeBot Ordering Chat');

    // Header
    const header = document.createElement('header');
    header.className = 'cafebot-header';

    const brandWrap = document.createElement('div');
    brandWrap.className = 'cafebot-brand';

    const iconBox = document.createElement('div');
    iconBox.className = 'cafebot-logo';
    iconBox.setAttribute('aria-hidden', 'true');
    iconBox.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>`;

    const titleGroup = document.createElement('div');
    titleGroup.className = 'cafebot-title-group';

    const title = document.createElement('h1');
    title.className = 'cafebot-title';
    title.textContent = 'CafeBot';

    const subtitle = document.createElement('p');
    subtitle.className = 'cafebot-subtitle';
    subtitle.textContent = 'Roast & Ember · Ordering Assistant';

    titleGroup.append(title, subtitle);
    brandWrap.append(iconBox, titleGroup);

    const headerActions = document.createElement('div');
    headerActions.className = 'cafebot-header-actions';

    this.orderBadgeEl = document.createElement('div');
    this.orderBadgeEl.className = 'cafebot-order-total';
    this.orderBadgeEl.textContent = '0 items · $0.00';

    this.toggleBtn = document.createElement('button');
    this.toggleBtn.type = 'button';
    this.toggleBtn.className = 'cafebot-toggle-btn';
    this.toggleBtn.textContent = 'Hide';
    this.toggleBtn.setAttribute('aria-expanded', 'true');
    this.toggleBtn.addEventListener('click', () => this.toggleCollapse());

    headerActions.append(this.orderBadgeEl, this.toggleBtn);
    header.append(brandWrap, headerActions);

    // Quick prompt toolbar
    const quickBar = document.createElement('div');
    quickBar.className = 'cafebot-quick-bar';
    quickBar.setAttribute('aria-label', 'Quick menu prompts');
    for (const item of QUICK_PROMPTS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cafebot-quick-btn';
      btn.textContent = item.label;
      btn.addEventListener('click', () => {
        this.submitCustomerMessage(item.prompt);
      });
      quickBar.appendChild(btn);
    }

    // Conversation area
    this.messagesEl = document.createElement('div');
    this.messagesEl.className = 'cafebot-messages';
    this.messagesEl.setAttribute('aria-live', 'polite');

    // Input bar
    this.formEl = document.createElement('form');
    this.formEl.className = 'cafebot-input-form';
    this.formEl.autocomplete = 'off';

    this.inputEl = document.createElement('input');
    this.inputEl.type = 'text';
    this.inputEl.className = 'cafebot-input';
    this.inputEl.placeholder = 'Ask about our menu or place an order...';
    this.inputEl.setAttribute('aria-label', 'Message CafeBot');

    const sendBtn = document.createElement('button');
    sendBtn.type = 'submit';
    sendBtn.className = 'cafebot-send-btn';
    sendBtn.textContent = 'Send';

    this.formEl.append(this.inputEl, sendBtn);
    this.formEl.addEventListener('submit', (event) => {
      event.preventDefault();
      this.submitCustomerMessage(this.inputEl.value);
    });

    // Assemble shell
    this.shellEl.append(header, quickBar, this.messagesEl, this.formEl);
    this.container.appendChild(this.shellEl);

    // Prevent clicks inside chat from triggering 3D canvas drag/select
    this.shellEl.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.shellEl.addEventListener('wheel', (e) => e.stopPropagation(), {
      passive: true,
    });

    this.unsubscribeOrder = cafeBotService.subscribe((state) => {
      this.updateOrderDisplay(state);
    });

    this.addMessage(
      'bot',
      'Welcome to Roast & Ember Cafe! I am CafeBot. Ask to see our menu, check dietary options, or order items like "1 Velvet Flat White" or "1 Burnt Basque Cheesecake".'
    );
  }

  private toggleCollapse() {
    this.collapsed = !this.collapsed;
    this.shellEl.classList.toggle('is-collapsed', this.collapsed);
    this.toggleBtn.textContent = this.collapsed ? 'Open Chat' : 'Hide';
    this.toggleBtn.setAttribute('aria-expanded', String(!this.collapsed));
  }

  private updateOrderDisplay(state: OrderState) {
    const unit = state.totalCount === 1 ? 'item' : 'items';
    this.orderBadgeEl.textContent = `${state.totalCount} ${unit} · $${state.subtotal.toFixed(2)}`;
  }

  public submitCustomerMessage(rawText: string) {
    const text = rawText.trim();
    if (!text) return;

    this.addMessage('customer', text);
    this.inputEl.value = '';
    this.inputEl.focus();

    window.setTimeout(() => {
      const reply = cafeBotService.processCustomerMessage(text);
      this.addMessage('bot', reply);
    }, 220);
  }

  private addMessage(sender: MessageSender, text: string) {
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender,
      text,
      timestamp,
    };
    this.messages.push(msg);

    const row = document.createElement('div');
    row.className = `cafebot-msg-row ${sender}`;

    const meta = document.createElement('div');
    meta.className = 'cafebot-msg-meta';
    meta.textContent = `${sender === 'customer' ? 'You' : 'CafeBot'} · ${timestamp}`;

    const bubble = document.createElement('div');
    bubble.className = 'cafebot-msg-bubble';
    bubble.textContent = text;

    row.append(meta, bubble);
    this.messagesEl.appendChild(row);
    this.scrollToBottom();
  }

  private scrollToBottom() {
    requestAnimationFrame(() => {
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    });
  }

  dispose() {
    this.unsubscribeOrder?.();
    this.shellEl.remove();
  }
}
