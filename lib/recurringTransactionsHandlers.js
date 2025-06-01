// lib/recurringTransactionsHandlers.js - Recurring Transactions Handlers
import { CONFIG } from './config.js';
import { SessionManager } from './sessionManager.js';
import { sendTelegramMessage } from './telegramApi.js';
import { addVariableExpenseToNotion } from './notionApi.js';

// Predefined recurring transactions
const RECURRING_TRANSACTIONS = {
  'lunch_office': {
    name: 'Lunch Office',
    type: 'variable',
    category: 'Survival',
    shoppingGroup: 'Food',
    emoji: '🍱'
  }
  // Add more recurring transactions here in the future
};

export async function showRecurringTransactionsMenu(chatId) {
  const keyboard = {
    inline_keyboard: []
  };

  // Add predefined recurring transactions
  for (const [key, transaction] of Object.entries(RECURRING_TRANSACTIONS)) {
    keyboard.inline_keyboard.push([{
      text: `${transaction.emoji} ${transaction.name}`,
      callback_data: `recurring_select_${key}`
    }]);
  }

  // Add back button
  keyboard.inline_keyboard.push([
    { text: "⬅️ Back to Main Menu", callback_data: "back_main" }
  ]);

  const recurringMessage = 
    "🔄 <b>Recurring Transactions</b>\n\n" +
    "Select a quick transaction to add:";

  await sendTelegramMessage(chatId, recurringMessage, keyboard);
}

export async function handleRecurringTransactionSelection(chatId, userId, transactionKey) {
  const transaction = RECURRING_TRANSACTIONS[transactionKey];
  
  if (!transaction) {
    await sendTelegramMessage(chatId, "❌ Invalid recurring transaction selected.");
    return;
  }

  // Create session with predefined data
  SessionManager.createSession(userId, transaction.type);
  SessionManager.updateSessionData(userId, {
    category: transaction.category,
    shoppingGroup: transaction.shoppingGroup,
    isRecurring: true,
    recurringType: transactionKey
  });

  // Show month selection for the recurring transaction
  await showRecurringMonthSelection(chatId, transaction);
}

async function showRecurringMonthSelection(chatId, transaction) {
  const keyboard = {
    inline_keyboard: []
  };

  // Create rows of 3 months each
  for (let i = 0; i < CONFIG.MONTHS.length; i += 3) {
    const row = [];
    for (let j = i; j < Math.min(i + 3, CONFIG.MONTHS.length); j++) {
      row.push({
        text: CONFIG.MONTHS[j],
        callback_data: `recurring_month_${transaction.name.replace(/\s+/g, '_')}_${CONFIG.MONTHS[j]}`
      });
    }
    keyboard.inline_keyboard.push(row);
  }

  // Add back button
  keyboard.inline_keyboard.push([
    { text: "⬅️ Back to Recurring Menu", callback_data: "recurring_back_menu" }
  ]);

  await sendTelegramMessage(chatId, 
    `${transaction.emoji} <b>${transaction.name}</b>\n` +
    `📂 Category: ${transaction.category}\n` +
    `🛍️ Shopping Group: ${transaction.shoppingGroup}\n\n` +
    `📅 Select Month:`);
}

export async function handleRecurringMonthSelection(chatId, userId, transactionName, month) {
  // Update session data with selected month
  SessionManager.updateSessionData(userId, { month });

  // Show account selection
  await showRecurringAccountSelection(chatId, transactionName, month);
}

async function showRecurringAccountSelection(chatId, transactionName, month) {
  const keyboard = {
    inline_keyboard: []
  };

  // Create rows of 2 accounts each
  for (let i = 0; i < CONFIG.ACCOUNTS.length; i += 2) {
    const row = [];
    for (let j = i; j < Math.min(i + 2, CONFIG.ACCOUNTS.length); j++) {
      row.push({
        text: CONFIG.ACCOUNTS[j],
        callback_data: `recurring_account_${transactionName}_${month}_${CONFIG.ACCOUNTS[j]}`
      });
    }
    keyboard.inline_keyboard.push(row);
  }

  // Add back button
  keyboard.inline_keyboard.push([
    { text: "⬅️ Back to Month Selection", callback_data: `recurring_back_month_${transactionName}` }
  ]);

  await sendTelegramMessage(chatId, 
    `🍱 <b>${transactionName.replace(/_/g, ' ')}</b>\n` +
    `📅 Month: <b>${month}</b>\n\n` +
    `🏦 Select Account:`);
}

export async function handleRecurringAccountSelection(chatId, userId, transactionName, month, account) {
  // Update session data with selected account
  SessionManager.updateSessionData(userId, { account });

  // Now ask for amount
  SessionManager.updateSession(userId, { 
    step: 'amount', 
    awaitingInput: true 
  });

  await sendTelegramMessage(chatId, 
    `🍱 <b>${transactionName.replace(/_/g, ' ')}</b>\n` +
    `📅 Month: <b>${month}</b>\n` +
    `🏦 Account: <b>${account}</b>\n\n` +
    CONFIG.MESSAGES.AMOUNT_INPUT);
}

export async function handleRecurringUserInput(chatId, userId, text, session) {
  if (session.step === 'amount') {
    await handleRecurringAmountInput(chatId, userId, text, session);
  } else if (session.step === 'description') {
    await handleRecurringDescriptionInput(chatId, userId, text, session);
  }
}

async function handleRecurringAmountInput(chatId, userId, text, session) {
  const amount = parseInt(text.replace(/[^\d]/g, ''));
  
  if (!amount || amount <= 0) {
    await sendTelegramMessage(chatId, "❌ Please enter a valid amount (numbers only):");
    return;
  }
  
  SessionManager.updateSessionData(userId, { amount });
  SessionManager.updateSession(userId, { 
    step: 'description', 
    awaitingInput: true 
  });
  
  await sendTelegramMessage(chatId, CONFIG.MESSAGES.DESCRIPTION_INPUT);
}

async function handleRecurringDescriptionInput(chatId, userId, text, session) {
  const description = text.trim();
  
  if (!description) {
    await sendTelegramMessage(chatId, "❌ Please enter a description:");
    return;
  }
  
  SessionManager.updateSessionData(userId, { description });
  
  // Process the recurring transaction
  await processRecurringTransaction(chatId, userId, session);
}

async function processRecurringTransaction(chatId, userId, session) {
  const { data } = session;
  
  // Add current date
  const currentDate = new Date().toISOString().split('T')[0];
  data.date = currentDate;
  
  const result = await addVariableExpenseToNotion(data);
  
  if (result.success) {
    await sendTelegramMessage(chatId, 
      `✅ Recurring Transaction Added Successfully!\n\n` +
      `🍱 Type: Lunch Office\n` +
      `💰 Amount: IDR ${data.amount.toLocaleString()}\n` +
      `📝 Description: ${data.description}\n` +
      `📂 Category: ${data.category}\n` +
      `🛍️ Shopping Group: ${data.shoppingGroup}\n` +
      `🏦 Account: ${data.account}\n` +
      `📅 Month: ${data.month}`
    );
  } else {
    await sendTelegramMessage(chatId, CONFIG.MESSAGES.ERROR);
    console.error('Failed to add recurring transaction to Notion:', result.error);
  }
  
  // Clear session and show main menu
  SessionManager.clearSession(userId);
  const { showMainMenu } = await import('./menuHandlers.js');
  await showMainMenu(chatId);
}
