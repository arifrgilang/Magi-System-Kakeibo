// lib/fixedExpensesHandlers.js - Fixed Expenses Specific Handlers
import { CONFIG } from './config.js';
import { SessionManager } from './sessionManager.js';
import { sendTelegramMessage } from './telegramApi.js';
import { addBasicFixedExpenseToNotion } from './notionApi.js';

export async function showFixedExpenseTypeSelection(chatId) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "🏠 Basic Fixed Expenses", callback_data: "fixed_type_basic" }],
      [{ text: "📱 Subscription", callback_data: "fixed_type_subscription" }],
      [{ text: "💳 Debt", callback_data: "fixed_type_debt" }],
      [{ text: "💰 Loan", callback_data: "fixed_type_loan" }],
      [{ text: "⬅️ Back", callback_data: "back_main" }]
    ]
  };

  await sendTelegramMessage(chatId, "🏠 Select Fixed Expense Type:", keyboard);
}

export async function showFixedExpenseItemSelection(chatId, transactionType) {
  // This will show available items based on the fixed expense type
  // For now, we'll implement Basic Fixed Expenses items
  if (transactionType === 'basic') {
    const keyboard = {
      inline_keyboard: [
        [{ text: "🛒 Groceries", callback_data: "fixed_item_basic_Groceries" }],
        [{ text: "🌐 Internet", callback_data: "fixed_item_basic_Internet" }],
        [{ text: "🏠 Iuran Komplek", callback_data: "fixed_item_basic_Iuran Komplek" }],
        [{ text: "🐱 Cats", callback_data: "fixed_item_basic_Cats" }],
        [{ text: "⚡ Listrik", callback_data: "fixed_item_basic_Listrik" }],
        [{ text: "⛽ Motor Gas", callback_data: "fixed_item_basic_Motor Gas" }],
        [{ text: "💨 Galon Air", callback_data: "fixed_item_basic_Galon Air" }],
        [{ text: "💊 Litany - Khilaf", callback_data: "fixed_item_basic_Litany - Khilaf" }],
        [{ text: "💊 Litany - Mamah", callback_data: "fixed_item_basic_Litany - Mamah" }],
        [{ text: "💊 Litany - Rangga", callback_data: "fixed_item_basic_Litany - Rangga" }],
        [{ text: "💊 Argil - Khilaf", callback_data: "fixed_item_basic_Argil - Khilaf" }],
        [{ text: "💊 Argil - Mamah", callback_data: "fixed_item_basic_Argil - Mamah" }],
        [{ text: "💊 Argil - Dicky", callback_data: "fixed_item_basic_Argil - Dicky" }],
        [{ text: "⬅️ Back", callback_data: "back_fixed_type" }]
      ]
    };

    await sendTelegramMessage(chatId, "🏠 Select Basic Fixed Expense Item:", keyboard);
  } else {
    await sendTelegramMessage(chatId, `${transactionType} functionality coming soon! 🚧`);
  }
}

export async function showFixedExpenseMonthSelection(chatId, transactionType, item) {
  const keyboard = {
    inline_keyboard: []
  };

  // Create rows of 3 months each
  for (let i = 0; i < CONFIG.MONTHS.length; i += 3) {
    const row = [];
    for (let j = i; j < Math.min(i + 3, CONFIG.MONTHS.length); j++) {
      row.push({
        text: CONFIG.MONTHS[j],
        callback_data: `fixed_month_${transactionType}_${item}_${CONFIG.MONTHS[j]}`
      });
    }
    keyboard.inline_keyboard.push(row);
  }

  // Add back button
  keyboard.inline_keyboard.push([
    { text: "⬅️ Back", callback_data: `back_fixed_item_${transactionType}` }
  ]);

  await sendTelegramMessage(chatId, "📅 Select Month:", keyboard);
}

export async function showFixedExpenseAccountSelection(chatId, transactionType, item, month) {
  const keyboard = {
    inline_keyboard: []
  };

  // Create rows of 2 accounts each
  for (let i = 0; i < CONFIG.ACCOUNTS.length; i += 2) {
    const row = [];
    for (let j = i; j < Math.min(i + 2, CONFIG.ACCOUNTS.length); j++) {
      row.push({
        text: CONFIG.ACCOUNTS[j],
        callback_data: `fixed_account_${transactionType}_${item}_${month}_${CONFIG.ACCOUNTS[j]}`
      });
    }
    keyboard.inline_keyboard.push(row);
  }

  // Add back button
  keyboard.inline_keyboard.push([
    { text: "⬅️ Back", callback_data: `back_fixed_month_${transactionType}_${item}` }
  ]);

  await sendTelegramMessage(chatId, "🏦 Select Account:", keyboard);
}

export async function handleFixedExpenseUserInput(chatId, userId, text, session) {
  if (session.step === 'amount') {
    await handleFixedExpenseAmountInput(chatId, userId, text, session);
  } else if (session.step === 'description') {
    await handleFixedExpenseDescriptionInput(chatId, userId, text, session);
  }
}

async function handleFixedExpenseAmountInput(chatId, userId, text, session) {
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

async function handleFixedExpenseDescriptionInput(chatId, userId, text, session) {
  const description = text.trim();
  
  if (!description) {
    await sendTelegramMessage(chatId, "❌ Please enter a description:");
    return;
  }
  
  SessionManager.updateSessionData(userId, { description });
  
  // Process the fixed expense transaction
  await processFixedExpenseTransaction(chatId, userId, session);
}

async function processFixedExpenseTransaction(chatId, userId, session) {
  const { subType, data } = session;
  
  if (subType === 'basic') {
    // Add current date
    const currentDate = new Date().toISOString().split('T')[0];
    data.date = currentDate;
    
    const result = await addBasicFixedExpenseToNotion(data);
    
    if (result.success) {
      await sendTelegramMessage(chatId, 
        `✅ Fixed Expense Added Successfully!\n\n` +
        `💰 Amount: IDR ${data.amount.toLocaleString()}\n` +
        `📝 Description: ${data.description}\n` +
        `🏠 Item: ${data.item}\n` +
        `🏦 Account: ${data.account}\n` +
        `📅 Month: ${data.month}`
      );
    } else {
      await sendTelegramMessage(chatId, CONFIG.MESSAGES.ERROR);
      console.error('Failed to add fixed expense to Notion:', result.error);
    }
  }
  
  // Clear session and show main menu
  SessionManager.clearSession(userId);
  const { showMainMenu } = await import('./menuHandlers.js');
  await showMainMenu(chatId);
}
