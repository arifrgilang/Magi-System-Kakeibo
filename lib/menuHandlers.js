// lib/menuHandlers.js - Updated Menu Display Functions with Recurring Transactions
import { CONFIG } from './config.js';
import { sendTelegramMessage } from './telegramApi.js';

export async function showMainMenu(chatId) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "➕ Add Transaction", callback_data: "add_transaction" }],
      [{ text: "📊 Recent Transactions", callback_data: "recent_transactions" }],
      [{ text: "💰 Show Account Balances", callback_data: "show_balances" }],
      [{ text: "🔄 Recurring Transactions", callback_data: "recurring_menu" }]
    ]
  };

  await sendTelegramMessage(chatId, CONFIG.MESSAGES.WELCOME, keyboard);
}

export async function showAddTransactionMenu(chatId) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "💸 Add Variable Expenses", callback_data: "type_variable" }],
      [{ text: "💰 Add Money Transfer", callback_data: "type_transfer" }],
      [{ text: "💵 Add Income", callback_data: "type_income" }],
      [{ text: "🏠 Add Fixed Expense", callback_data: "type_fixed" }],
      [{ text: "🏦 Add Savings", callback_data: "type_savings" }],
      [{ text: "⬅️ Back to Main Menu", callback_data: "back_main" }]
    ]
  };

  const addTransactionMessage = 
    "➕ <b>Add Transaction</b>\n\n" +
    "Select the type of transaction you want to add:";

  await sendTelegramMessage(chatId, addTransactionMessage, keyboard);
}

export async function showMonthSelection(chatId, transactionType) {
  const keyboard = {
    inline_keyboard: []
  };

  // Create rows of 3 months each
  for (let i = 0; i < CONFIG.MONTHS.length; i += 3) {
    const row = [];
    for (let j = i; j < Math.min(i + 3, CONFIG.MONTHS.length); j++) {
      row.push({
        text: CONFIG.MONTHS[j],
        callback_data: `month_${transactionType}_${CONFIG.MONTHS[j]}`
      });
    }
    keyboard.inline_keyboard.push(row);
  }

  // Add back button
  keyboard.inline_keyboard.push([
    { text: "⬅️ Back", callback_data: "back_add_transaction" }
  ]);

  await sendTelegramMessage(chatId, CONFIG.MESSAGES.MONTH_SELECT, keyboard);
}

export async function showCategorySelection(chatId, transactionType, month) {
  const keyboard = {
    inline_keyboard: []
  };

  // Create buttons for each category (simple names)
  CONFIG.CATEGORIES.forEach(category => {
    keyboard.inline_keyboard.push([{
      text: category,
      callback_data: `category_${transactionType}_${month}_${category}`
    }]);
  });

  // Add back button
  keyboard.inline_keyboard.push([
    { text: "⬅️ Back", callback_data: `back_month_${transactionType}` }
  ]);

  const categoryMessage = 
    "📂 Select Category:\n\n" +
    "🟢 <b>Survival:</b> Food, Hygiene, Kids, Transport\n" +
    "🟡 <b>Optional:</b> Clothes, Skin Care, Snacks, Cafe & Resto, Vacation, Gifts\n" +
    "🔵 <b>Culture:</b> Books, Films, Course, Music\n" +
    "🔴 <b>Extra:</b> Hospital, House Renov, Electronic Broken, Someone's Loan";

  await sendTelegramMessage(chatId, categoryMessage, keyboard);
}

export async function showShoppingGroupSelection(chatId, transactionType, month, category) {
  const keyboard = {
    inline_keyboard: []
  };

  // Create rows of 2 shopping groups each
  for (let i = 0; i < CONFIG.SHOPPING_GROUPS.length; i += 2) {
    const row = [];
    for (let j = i; j < Math.min(i + 2, CONFIG.SHOPPING_GROUPS.length); j++) {
      row.push({
        text: CONFIG.SHOPPING_GROUPS[j],
        callback_data: `group_${transactionType}_${month}_${category}_${CONFIG.SHOPPING_GROUPS[j]}`
      });
    }
    keyboard.inline_keyboard.push(row);
  }

  // Add back button
  keyboard.inline_keyboard.push([
    { text: "⬅️ Back", callback_data: `back_category_${transactionType}_${month}` }
  ]);

  await sendTelegramMessage(chatId, CONFIG.MESSAGES.SHOPPING_GROUP_SELECT, keyboard);
}

export async function showAccountSelection(chatId, transactionType, month, category, shoppingGroup) {
  const keyboard = {
    inline_keyboard: []
  };

  // Create rows of 2 accounts each
  for (let i = 0; i < CONFIG.ACCOUNTS.length; i += 2) {
    const row = [];
    for (let j = i; j < Math.min(i + 2, CONFIG.ACCOUNTS.length); j++) {
      row.push({
        text: CONFIG.ACCOUNTS[j],
        callback_data: `account_${transactionType}_${month}_${category}_${shoppingGroup}_${CONFIG.ACCOUNTS[j]}`
      });
    }
    keyboard.inline_keyboard.push(row);
  }

  // Add back button
  keyboard.inline_keyboard.push([
    { text: "⬅️ Back", callback_data: `back_group_${transactionType}_${month}_${category}` }
  ]);

  await sendTelegramMessage(chatId, CONFIG.MESSAGES.ACCOUNT_SELECT, keyboard);
}

export async function showRecentTransactionsMenu(chatId) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "💸 Recent Variable Expenses", callback_data: "recent_variable" }],
      [{ text: "💰 Recent Money Transfers", callback_data: "recent_transfer" }],
      [{ text: "💵 Recent Income", callback_data: "recent_income" }],
      [{ text: "🏠 Recent Fixed Expenses", callback_data: "recent_fixed" }],
      [{ text: "🏦 Recent Savings", callback_data: "recent_savings" }],
      [{ text: "⬅️ Back to Main Menu", callback_data: "back_main" }]
    ]
  };

  const recentMessage = 
    "📊 <b>Recent Transactions</b>\n\n" +
    "Select a category to view the latest 5 transactions:";

  await sendTelegramMessage(chatId, recentMessage, keyboard);
}
