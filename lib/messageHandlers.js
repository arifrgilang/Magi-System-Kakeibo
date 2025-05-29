// lib/messageHandlers.js - Updated Message Handler Functions
import { CONFIG } from './config.js';
import { SessionManager } from './sessionManager.js';
import { sendTelegramMessage, answerCallbackQuery } from './telegramApi.js';
import { 
  showMainMenu, 
  showMonthSelection, 
  showCategorySelection, 
  showShoppingGroupSelection, 
  showAccountSelection 
} from './menuHandlers.js';
import {
  showFixedExpenseTypeSelection,
  showFixedExpenseItemSelection,
  showFixedExpenseMonthSelection,
  showFixedExpenseAccountSelection,
  handleFixedExpenseUserInput
} from './fixedExpensesHandlers.js';
import { addVariableExpenseToNotion, addBasicFixedExpenseToNotion } from './notionApi.js';

export async function handleTextMessage(message) {
  const chatId = message.chat.id;
  const text = message.text.trim();
  const userId = message.from.id;
  
  console.log(`Message from ${userId}: "${text}"`);

  // Check if user is in a flow state
  const session = SessionManager.getSession(userId);
  
  if (session && session.awaitingInput) {
    await handleUserInput(chatId, userId, text, session);
    return;
  }
  
  // Handle commands
  if (text.startsWith('/start') || text.toLowerCase() === 'start') {
    await showMainMenu(chatId);
  } else if (text.startsWith('/help')) {
    await sendTelegramMessage(chatId, CONFIG.MESSAGES.HELP);
  } else if (text.startsWith('/cancel')) {
    SessionManager.clearSession(userId);
    await sendTelegramMessage(chatId, CONFIG.MESSAGES.CANCELLED);
  } else {
    await showMainMenu(chatId);
  }
}

export async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;
  
  await answerCallbackQuery(callbackQuery.id);
  
  const [action, ...params] = data.split('_');
  
  switch (action) {
    case 'type':
      await handleTransactionTypeSelection(chatId, userId, params[0]);
      break;
    case 'month':
      await handleMonthSelection(chatId, userId, params);
      break;
    case 'category':
      await handleCategorySelection(chatId, userId, params);
      break;
    case 'group':
      await handleShoppingGroupSelection(chatId, userId, params);
      break;
    case 'account':
      await handleAccountSelection(chatId, userId, params);
      break;
    case 'fixed':
      await handleFixedExpenseAction(chatId, userId, params);
      break;
    case 'back':
      await handleBackAction(chatId, userId, params);
      break;
    default:
      await showMainMenu(chatId);
  }
}

async function handleTransactionTypeSelection(chatId, userId, type) {
  if (type === CONFIG.TRANSACTION_TYPES.VARIABLE) {
    SessionManager.createSession(userId, type);
    await showMonthSelection(chatId, type);
  } else if (type === CONFIG.TRANSACTION_TYPES.FIXED) {
    await showFixedExpenseTypeSelection(chatId);
  } else {
    await sendTelegramMessage(chatId, `${type} functionality coming soon! 🚧`);
  }
}

async function handleFixedExpenseAction(chatId, userId, params) {
  const [subAction, ...rest] = params;
  
  switch (subAction) {
    case 'type':
      await handleFixedExpenseTypeSelection(chatId, userId, rest[0]);
      break;
    case 'item':
      await handleFixedExpenseItemSelection(chatId, userId, rest);
      break;
    case 'month':
      await handleFixedExpenseMonthSelection(chatId, userId, rest);
      break;
    case 'account':
      await handleFixedExpenseAccountSelection(chatId, userId, rest);
      break;
    default:
      await showFixedExpenseTypeSelection(chatId);
  }
}

async function handleFixedExpenseTypeSelection(chatId, userId, fixedType) {
  if (fixedType === 'basic') {
    SessionManager.createSession(userId, CONFIG.TRANSACTION_TYPES.FIXED);
    SessionManager.updateSession(userId, { subType: 'basic' });
    await showFixedExpenseItemSelection(chatId, 'basic');
  } else {
    await sendTelegramMessage(chatId, `${fixedType} fixed expenses coming soon! 🚧`);
  }
}

async function handleFixedExpenseItemSelection(chatId, userId, params) {
  const [transactionType, item] = params;
  SessionManager.updateSessionData(userId, { item });
  await showFixedExpenseMonthSelection(chatId, transactionType, item);
}

async function handleFixedExpenseMonthSelection(chatId, userId, params) {
  const [transactionType, item, month] = params;
  SessionManager.updateSessionData(userId, { month });
  await showFixedExpenseAccountSelection(chatId, transactionType, item, month);
}

async function handleFixedExpenseAccountSelection(chatId, userId, params) {
  const [transactionType, item, month, account] = params;
  SessionManager.updateSessionData(userId, { account });
  
  // Now ask for amount
  SessionManager.updateSession(userId, { 
    step: 'amount', 
    awaitingInput: true 
  });
  
  await sendTelegramMessage(chatId, CONFIG.MESSAGES.AMOUNT_INPUT);
}

async function handleMonthSelection(chatId, userId, params) {
  const [transactionType, month] = params;
  SessionManager.updateSessionData(userId, { month });
  await showCategorySelection(chatId, transactionType, month);
}

async function handleCategorySelection(chatId, userId, params) {
  const [transactionType, month, category] = params;
  SessionManager.updateSessionData(userId, { category });
  await showShoppingGroupSelection(chatId, transactionType, month, category);
}

async function handleShoppingGroupSelection(chatId, userId, params) {
  const [transactionType, month, category, shoppingGroup] = params;
  SessionManager.updateSessionData(userId, { shoppingGroup });
  await showAccountSelection(chatId, transactionType, month, category, shoppingGroup);
}

async function handleAccountSelection(chatId, userId, params) {
  const [transactionType, month, category, shoppingGroup, account] = params;
  SessionManager.updateSessionData(userId, { account });
  
  // Now ask for amount
  SessionManager.updateSession(userId, { 
    step: 'amount', 
    awaitingInput: true 
  });
  
  await sendTelegramMessage(chatId, CONFIG.MESSAGES.AMOUNT_INPUT);
}

async function handleUserInput(chatId, userId, text, session) {
  if (session.type === CONFIG.TRANSACTION_TYPES.FIXED) {
    await handleFixedExpenseUserInput(chatId, userId, text, session);
  } else if (session.step === 'amount') {
    await handleAmountInput(chatId, userId, text, session);
  } else if (session.step === 'description') {
    await handleDescriptionInput(chatId, userId, text, session);
  }
}

async function handleAmountInput(chatId, userId, text, session) {
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

async function handleDescriptionInput(chatId, userId, text, session) {
  const description = text.trim();
  
  if (!description) {
    await sendTelegramMessage(chatId, "❌ Please enter a description:");
    return;
  }
  
  SessionManager.updateSessionData(userId, { description });
  
  // Process the transaction
  await processTransaction(chatId, userId, session);
}

async function processTransaction(chatId, userId, session) {
  const { type, data } = session;
  
  if (type === CONFIG.TRANSACTION_TYPES.VARIABLE) {
    // Add current date
    const currentDate = new Date().toISOString().split('T')[0];
    data.date = currentDate;
    
    const result = await addVariableExpenseToNotion(data);
    
    if (result.success) {
      await sendTelegramMessage(chatId, 
        `✅ Added successfully!\n\n` +
        `💰 Amount: IDR ${data.amount.toLocaleString()}\n` +
        `📝 Description: ${data.description}\n` +
        `📂 Category: ${data.category}\n` +
        `🛍️ Shopping Group: ${data.shoppingGroup}\n` +
        `🏦 Account: ${data.account}\n` +
        `📅 Month: ${data.month}`
      );
    } else {
      await sendTelegramMessage(chatId, CONFIG.MESSAGES.ERROR);
      console.error('Failed to add to Notion:', result.error);
    }
  }
  
  // Clear session and show main menu
  SessionManager.clearSession(userId);
  await showMainMenu(chatId);
}

async function handleBackAction(chatId, userId, params) {
  const [destination, ...rest] = params;
  
  switch (destination) {
    case 'main':
      SessionManager.clearSession(userId);
      await showMainMenu(chatId);
      break;
    case 'fixed':
      if (rest[0] === 'type') {
        await showFixedExpenseTypeSelection(chatId);
      } else {
        await showMainMenu(chatId);
      }
      break;
    // Add more back navigation cases as needed
    default:
      await showMainMenu(chatId);
  }
}
