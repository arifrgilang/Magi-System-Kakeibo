// lib/messageHandlers.js - Updated Message Handler Functions with User Whitelist
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
  showFixedExpenseItemSelection,
  showFixedExpenseMonthSelection,
  showFixedExpenseAccountSelection,
  handleFixedExpenseUserInput
} from './fixedExpensesHandlers.js';
import {
  showIncomeGroupSelection,
  showIncomeMonthSelection,
  showIncomeAccountSelection,
  handleIncomeUserInput
} from './incomeHandlers.js';
import {
  showTransferFromAccountSelection,
  showTransferToAccountSelection,
  showTransferTypeSelection,
  handleTransferUserInput
} from './transferHandlers.js';
import {
  showSavingsPlanSelection,
  showSavingsMonthSelection,
  showSavingsFromAccountSelection,
  showSavingsToAccountSelection,
  handleSavingsUserInput
} from './savingsHandlers.js';
import { showRecentTransactions } from './recentTransactionsHandlers.js';
import { addVariableExpenseToNotion, addBasicFixedExpenseToNotion, addIncomeToNotion, addTransferToNotion, addSavingsToNotion } from './notionApi.js';

// Security: Load allowed user IDs from environment variables (supports multiple users)
const ALLOWED_USER_IDS = process.env.ALLOWED_USER_IDS?.split(',').map(id => id.trim()) || [];

function isUserAllowed(userId) {
  const userIdString = userId.toString();
  const isAllowed = ALLOWED_USER_IDS.includes(userIdString);
  console.log(`🔐 Security check for user ${userIdString}: ${isAllowed ? '✅ ALLOWED' : '❌ BLOCKED'}`);
  console.log(`📋 Whitelist: [${ALLOWED_USER_IDS.join(', ')}]`);
  return isAllowed;
}

export async function handleTextMessage(message) {
  const chatId = message.chat.id;
  const text = message.text.trim();
  const userId = message.from.id;
  
  console.log(`Message from ${userId}: "${text}"`);

  // Security check: Only allow whitelisted users
  if (!isUserAllowed(userId)) {
    console.log(`🚫 Blocked unauthorized user: ${userId}`);
    await sendTelegramMessage(chatId, "❌ Access denied. This bot is private.");
    return;
  }

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
  
  console.log(`Callback from ${userId}: "${data}"`);

  // Security check: Only allow whitelisted users
  if (!isUserAllowed(userId)) {
    console.log(`🚫 Blocked unauthorized callback from: ${userId}`);
    await answerCallbackQuery(callbackQuery.id, "❌ Access denied");
    return;
  }
  
  await answerCallbackQuery(callbackQuery.id);
  
  const [action, ...params] = data.split('_');
  
  switch (action) {
    case 'add':
      await handleAddTransactionAction(chatId, userId, params);
      break;
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
    case 'income':
      await handleIncomeAction(chatId, userId, params);
      break;
    case 'transfer':
      await handleTransferAction(chatId, userId, params);
      break;
    case 'savings':
      await handleSavingsAction(chatId, userId, params);
      break;
    case 'recent':
      await handleRecentAction(chatId, userId, params);
      break;
    case 'back':
      await handleBackAction(chatId, userId, params);
      break;
    default:
      await showMainMenu(chatId);
  }
}

async function handleAddTransactionAction(chatId, userId, params) {
  const [subAction] = params;
  
  if (subAction === 'transaction') {
    const { showAddTransactionMenu } = await import('./menuHandlers.js');
    await showAddTransactionMenu(chatId);
  }
}

async function handleTransactionTypeSelection(chatId, userId, type) {
  if (type === CONFIG.TRANSACTION_TYPES.VARIABLE) {
    SessionManager.createSession(userId, type);
    await showMonthSelection(chatId, type);
  } else if (type === CONFIG.TRANSACTION_TYPES.FIXED) {
    SessionManager.createSession(userId, CONFIG.TRANSACTION_TYPES.FIXED);
    await showFixedExpenseItemSelection(chatId);
  } else if (type === CONFIG.TRANSACTION_TYPES.INCOME) {
    SessionManager.createSession(userId, CONFIG.TRANSACTION_TYPES.INCOME);
    await showIncomeGroupSelection(chatId);
  } else if (type === CONFIG.TRANSACTION_TYPES.TRANSFER) {
    SessionManager.createSession(userId, CONFIG.TRANSACTION_TYPES.TRANSFER);
    await showTransferFromAccountSelection(chatId);
  } else if (type === CONFIG.TRANSACTION_TYPES.SAVINGS) {
    SessionManager.createSession(userId, CONFIG.TRANSACTION_TYPES.SAVINGS);
    await showSavingsPlanSelection(chatId);
  } else {
    await sendTelegramMessage(chatId, `${type} functionality coming soon! 🚧`);
  }
}

async function handleFixedExpenseAction(chatId, userId, params) {
  const [subAction, ...rest] = params;
  
  switch (subAction) {
    case 'item':
      await handleFixedExpenseItemSelection(chatId, userId, rest[0]);
      break;
    case 'month':
      await handleFixedExpenseMonthSelection(chatId, userId, rest);
      break;
    case 'account':
      await handleFixedExpenseAccountSelection(chatId, userId, rest);
      break;
    default:
      await showFixedExpenseItemSelection(chatId);
  }
}

async function handleFixedExpenseItemSelection(chatId, userId, item) {
  SessionManager.updateSessionData(userId, { item });
  await showFixedExpenseMonthSelection(chatId, item);
}

async function handleFixedExpenseMonthSelection(chatId, userId, params) {
  const [item, month] = params;
  SessionManager.updateSessionData(userId, { month });
  await showFixedExpenseAccountSelection(chatId, item, month);
}

async function handleFixedExpenseAccountSelection(chatId, userId, params) {
  const [item, month, account] = params;
  SessionManager.updateSessionData(userId, { account });
  
  // Now ask for amount
  SessionManager.updateSession(userId, { 
    step: 'amount', 
    awaitingInput: true 
  });
  
  await sendTelegramMessage(chatId, CONFIG.MESSAGES.AMOUNT_INPUT);
}

async function handleIncomeAction(chatId, userId, params) {
  const [subAction, ...rest] = params;
  
  switch (subAction) {
    case 'group':
      await handleIncomeGroupSelection(chatId, userId, rest[0]);
      break;
    case 'month':
      await handleIncomeMonthSelection(chatId, userId, rest);
      break;
    case 'account':
      await handleIncomeAccountSelection(chatId, userId, rest);
      break;
    default:
      await showIncomeGroupSelection(chatId);
  }
}

async function handleIncomeGroupSelection(chatId, userId, incomeGroup) {
  SessionManager.updateSessionData(userId, { incomeGroup });
  await showIncomeMonthSelection(chatId, incomeGroup);
}

async function handleIncomeMonthSelection(chatId, userId, params) {
  const [incomeGroup, month] = params;
  SessionManager.updateSessionData(userId, { month });
  await showIncomeAccountSelection(chatId, incomeGroup, month);
}

async function handleIncomeAccountSelection(chatId, userId, params) {
  const [incomeGroup, month, account] = params;
  SessionManager.updateSessionData(userId, { account });
  
  // Now ask for amount
  SessionManager.updateSession(userId, { 
    step: 'amount', 
    awaitingInput: true 
  });
  
  await sendTelegramMessage(chatId, CONFIG.MESSAGES.AMOUNT_INPUT);
}

async function handleTransferAction(chatId, userId, params) {
  const [subAction, ...rest] = params;
  
  switch (subAction) {
    case 'from':
      await handleTransferFromSelection(chatId, userId, rest[0]);
      break;
    case 'to':
      await handleTransferToSelection(chatId, userId, rest);
      break;
    case 'type':
      await handleTransferTypeSelection(chatId, userId, rest);
      break;
    default:
      await showTransferFromAccountSelection(chatId);
  }
}

async function handleTransferFromSelection(chatId, userId, fromAccount) {
  SessionManager.updateSessionData(userId, { fromAccount });
  await showTransferToAccountSelection(chatId, fromAccount);
}

async function handleTransferToSelection(chatId, userId, params) {
  const [fromAccount, toAccount] = params;
  SessionManager.updateSessionData(userId, { toAccount });
  await showTransferTypeSelection(chatId, fromAccount, toAccount);
}

async function handleTransferTypeSelection(chatId, userId, params) {
  const [fromAccount, toAccount, transferType] = params;
  SessionManager.updateSessionData(userId, { transferType });
  
  // Now ask for amount out (always ask for both amounts)
  SessionManager.updateSession(userId, { 
    step: 'amountOut', 
    awaitingInput: true 
  });
  
  await sendTelegramMessage(chatId, "💵 Please enter the amount out (transfer amount):");
}

async function handleSavingsAction(chatId, userId, params) {
  const [subAction, ...rest] = params;
  
  switch (subAction) {
    case 'plan':
      await handleSavingsPlanSelection(chatId, userId, rest[0]);
      break;
    case 'month':
      await handleSavingsMonthSelection(chatId, userId, rest);
      break;
    case 'from':
      await handleSavingsFromSelection(chatId, userId, rest);
      break;
    case 'to':
      await handleSavingsToSelection(chatId, userId, rest);
      break;
    default:
      await showSavingsPlanSelection(chatId);
  }
}

async function handleSavingsPlanSelection(chatId, userId, savingsPlan) {
  SessionManager.updateSessionData(userId, { savingsPlan });
  await showSavingsMonthSelection(chatId, savingsPlan);
}

async function handleSavingsMonthSelection(chatId, userId, params) {
  const [savingsPlan, month] = params;
  SessionManager.updateSessionData(userId, { month });
  await showSavingsFromAccountSelection(chatId, savingsPlan, month);
}

async function handleSavingsFromSelection(chatId, userId, params) {
  const [savingsPlan, month, fromAccount] = params;
  SessionManager.updateSessionData(userId, { fromAccount });
  await showSavingsToAccountSelection(chatId, savingsPlan, month, fromAccount);
}

async function handleSavingsToSelection(chatId, userId, params) {
  const [savingsPlan, month, fromAccount, toAccount] = params;
  SessionManager.updateSessionData(userId, { toAccount });
  
  // Now ask for amount out (always ask for both amounts)
  SessionManager.updateSession(userId, { 
    step: 'amountOut', 
    awaitingInput: true 
  });
  
  await sendTelegramMessage(chatId, "💵 Please enter the amount out (savings amount):");
}

async function handleRecentAction(chatId, userId, params) {
  const [subAction, ...rest] = params;
  
  switch (subAction) {
    case 'menu':
      const { showRecentTransactionsMenu } = await import('./menuHandlers.js');
      await showRecentTransactionsMenu(chatId);
      break;
    case 'variable':
      await showRecentTransactions(chatId, 'variable');
      break;
    case 'transfer':
      await showRecentTransactions(chatId, 'transfer');
      break;
    case 'income':
      await showRecentTransactions(chatId, 'income');
      break;
    case 'fixed':
      await showRecentTransactions(chatId, 'fixed');
      break;
    case 'savings':
      await showRecentTransactions(chatId, 'savings');
      break;
    default:
      const { showRecentTransactionsMenu: showMenu } = await import('./menuHandlers.js');
      await showMenu(chatId);
  }
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
  } else if (session.type === CONFIG.TRANSACTION_TYPES.INCOME) {
    await handleIncomeUserInput(chatId, userId, text, session);
  } else if (session.type === CONFIG.TRANSACTION_TYPES.TRANSFER) {
    await handleTransferUserInput(chatId, userId, text, session);
  } else if (session.type === CONFIG.TRANSACTION_TYPES.SAVINGS) {
    await handleSavingsUserInput(chatId, userId, text, session);
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
      if (rest[0] === 'item') {
        await showFixedExpenseItemSelection(chatId);
      } else {
        await showMainMenu(chatId);
      }
      break;
    // Add more back navigation cases as needed
    default:
      await showMainMenu(chatId);
  }
}
