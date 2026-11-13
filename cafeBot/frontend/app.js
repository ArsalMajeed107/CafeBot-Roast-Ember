// CafeBot Standalone Mock Chat UI (Phase 1 — No AI API or Backend Connected)

const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const orderSummaryBadge = document.getElementById('orderSummaryBadge');

let menuItems = [];
const orderItems = [];

async function loadMenu() {
  try {
    const response = await fetch('../data/menu.json');
    if (!response.ok) throw new Error('Menu fetch failed');
    const data = await response.json();
    menuItems = data.items || [];
  } catch {
    menuItems = [];
  }
}

function appendMessage(sender, text) {
  const row = document.createElement('div');
  row.className = `message-row ${sender}`;

  const label = document.createElement('div');
  label.className = 'message-sender';
  label.textContent = sender === 'customer' ? 'You' : 'CafeBot';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;

  row.append(label, bubble);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateOrderBadge() {
  const count = orderItems.reduce((sum, entry) => sum + entry.qty, 0);
  const total = orderItems.reduce((sum, entry) => sum + entry.item.price * entry.qty, 0);
  orderSummaryBadge.textContent = `Order: ${count} item${count === 1 ? '' : 's'} · $${total.toFixed(2)}`;
}

function generateMockReply(userText) {
  const lower = userText.toLowerCase();

  if (lower.includes('menu') || lower.includes('show')) {
    if (menuItems.length === 0) {
      return 'Our menu features Coffee, Tea, Cold Drinks, Burgers, Sandwiches, and Desserts. Try asking for "coffee" or "burgers".';
    }
    const available = menuItems.filter((item) => item.available);
    const preview = available
      .slice(0, 6)
      .map((item) => `• ${item.name} ($${item.price.toFixed(2)}) — ${item.category}`)
      .join('\n');
    return `Here are some popular items from our menu:\n${preview}\n\nTell me a category or item name to order!`;
  }

  const matchedCategory = ['coffee', 'tea', 'cold drinks', 'burgers', 'sandwiches', 'desserts'].find(
    (cat) => lower.includes(cat)
  );
  if (matchedCategory) {
    const matches = menuItems.filter(
      (item) => item.category.toLowerCase() === matchedCategory
    );
    if (matches.length > 0) {
      const list = matches
        .map(
          (item) =>
            `• ${item.name} — $${item.price.toFixed(2)}${item.available ? '' : ' (Currently Unavailable)'}`
        )
        .join('\n');
      return `Here is our ${matchedCategory} selection:\n${list}`;
    }
  }

  const matchedItem = menuItems.find((item) =>
    lower.includes(item.name.toLowerCase())
  );
  if (matchedItem) {
    if (!matchedItem.available) {
      return `Sorry, ${matchedItem.name} is temporarily unavailable right now. Would you like to try our Kyoto Slow-Drip Cold Brew or Yuzu Espresso Tonic instead?`;
    }
    const existing = orderItems.find((entry) => entry.item.id === matchedItem.id);
    if (existing) {
      existing.qty += 1;
    } else {
      orderItems.push({ item: matchedItem, qty: 1 });
    }
    updateOrderBadge();
    return `Added 1x ${matchedItem.name} ($${matchedItem.price.toFixed(2)}) to your order. Would you like to add anything else or review your order?`;
  }

  if (lower.includes('review') || lower.includes('order')) {
    if (orderItems.length === 0) {
      return 'Your current order is empty. Ask for the menu or type an item name like "Velvet Flat White" to start!';
    }
    const lines = orderItems
      .map(
        (entry) =>
          `• ${entry.qty}x ${entry.item.name} — $${(entry.item.price * entry.qty).toFixed(2)}`
      )
      .join('\n');
    const total = orderItems.reduce((sum, entry) => sum + entry.item.price * entry.qty, 0);
    return `Here is your current order:\n${lines}\n\nTotal: $${total.toFixed(2)}\nReply "Confirm order" when you're ready to finalize.`;
  }

  if (lower.includes('confirm')) {
    if (orderItems.length === 0) {
      return 'You have no items in your order yet. Add an item first before confirming.';
    }
    const total = orderItems.reduce((sum, entry) => sum + entry.item.price * entry.qty, 0);
    orderItems.length = 0;
    updateOrderBadge();
    return `Thank you! Your mock order ($${total.toFixed(2)}) has been confirmed. (In Phase 2, this will save directly to data/orders.json.)`;
  }

  return 'I can help you browse our menu (Coffee, Tea, Cold Drinks, Burgers, Sandwiches, Desserts), add items to your order, or review your current order.';
}

function handleSend(messageText) {
  const trimmed = messageText.trim();
  if (!trimmed) return;

  appendMessage('customer', trimmed);
  chatInput.value = '';

  window.setTimeout(() => {
    const reply = generateMockReply(trimmed);
    appendMessage('bot', reply);
  }, 240);
}

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  handleSend(chatInput.value);
});

document.querySelectorAll('.prompt-chip').forEach((button) => {
  button.addEventListener('click', () => {
    const prompt = button.getAttribute('data-prompt') || '';
    handleSend(prompt);
  });
});

async function init() {
  await loadMenu();
  updateOrderBadge();
  appendMessage(
    'bot',
    'Welcome to Roast & Ember Cafe! I am CafeBot. Ask to see our menu, check allergens or prices, or tell me what you would like to order.'
  );
}

init();
