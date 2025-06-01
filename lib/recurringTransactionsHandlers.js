// lib/recurringTransactionsHandlers.js - Recurring Transactions Handlers
import { CONFIG } from './config.js';
import { SessionManager } from './sessionManager.js';
import { sendTelegramMessage } from './telegramApi.js';
import { addVariableExpenseToNotion } from './notionApi.js';

// Predefined recurring transactions
const RECURRING_TRANSACTIONS = {
  'mandatory_gohan': {
    name: 'Mandatory Gohan',
    type: 'variable',
    category: 'Survival',
    shoppingGroup: 'Food',
    emoji: '🍱'
  },
  'jajan': {
    name: 'Jajan',
    type: 'variable',
    category: 'Optional',
    shoppingGroup: 'Food',
    emoji: '🍿'
  },
  'pasar_groceries': {
    name: 'Pasar Groceries',
    type: 'fixed',
    item: 'Groceries',
    description: 'Pasar Groceries',
    emoji: '🛒'
  },
  'supa_groceries': {
    name: 'Supa Groceries',
    type: 'fixed',
    item: 'Groceries',
    description: 'Supa Groceries',
    emoji: '🏪'
  },
  'supa_amenities': {
    name: 'Supa Amenities',
    type: 'fixed',
    item: 'Groceries',
    description: 'Supa Amenities',
    emoji: '🧴'
  },
  'motor_gas': {
    name: 'Motor Gas',
    type: 'fixed',
    item: 'Motor Gas',
    description: 'Motor Gas',
    preselectedAccount: 'CC BCA',
    emoji: '⛽'
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
  console.log('handleRecurringTransactionSelection called with:', transactionKey);
  console.log('Available transactions:', Object.keys(RECURRING_TRANSACTIONS));
  
  const transaction = RECURRING_TRANSACTIONS[transactionKey];
  
  if (!transaction) {
    console.error(`Transaction not found for key: ${transactionKey}`);
    await sendTelegramMessage(chatId, `❌ Invalid recurring transaction selected. Key: ${transactionKey}`);
    return;
  }

  console.log('Found transaction:', transaction);

  // Create session with predefined data
  SessionManager.createSession(userId, transaction.type);
  
  if (transaction.type === 'variable') {
    SessionManager.updateSessionData(userId, {
      category: transaction.category,
      shoppingGroup: transaction.shoppingGroup,
      isRecurring: true,
      recurringType: transactionKey
    });
    console.log('Set up variable expense session');
  } else if (transaction.type === 'fixed') {
    const sessionData = {
      item: transaction.item,
      description: transaction.description,
      isRecurring: true,
      recurringType: transactionKey
    };
    
    // If transaction has preselected account, add it to session data
    if (transaction.preselectedAccount) {
      sessionData.account = transaction.preselectedAccount;
      sessionData.accountPreselected = true;
    }
    
    SessionManager.updateSessionData(userId, sessionData);
    console.log('Set up fixed expense session with description:', transaction.description);
    if (transaction.preselectedAccount) {
      console.log('Preselected account:', transaction.preselectedAccount);
    }
  }

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

  let message = `${transaction.emoji} <b>${transaction.name}</b>\n`;
  
  if (transaction.type === 'variable') {
    message += `📂 Category: ${transaction.category}\n` +
               `🛍️ Shopping Group: ${transaction.shoppingGroup}\n\n`;
  } else if (transaction.type === 'fixed') {
    message += `🏠 Type: Basic Fixed Expense\n` +
               `📦 Item: ${transaction.item}\n\n`;
  }
  
  message += `📅 Select Month:`;

  await sendTelegramMessage(chatId, message, keyboard);
}

export async function handleRecurringMonthSelection(chatId, userId, transactionName, month) {
  // Update session data with selected month
  SessionManager.updateSessionData(userId, { month });

  // Check if account is preselected (e.g., for Motor Gas)
  const session = SessionManager.getSession(userId);
  if (session.data && session.data.accountPreselected) {
    console.log('Account preselected, skipping account selection');
    // Skip account selection and go directly to amount input
    SessionManager.updateSession(userId, { 
      step: 'amount', 
      awaitingInput: true 
    });

    const displayName = transactionName.replace(/_/g, ' ');
    let emoji = '🛒'; // default
    if (transactionName.includes('Mandatory') || transactionName.includes('mandatory')) emoji = '🍱';
    if (transactionName.includes('Jajan') || transactionName.includes('jajan')) emoji = '🍿';
    if (transactionName.includes('Supa_Groceries') || transactionName.includes('supa_groceries')) emoji = '🏪';
    if (transactionName.includes('Supa_Amenities') || transactionName.includes('supa_amenities')) emoji = '🧴';
    if (transactionName.includes('Motor_Gas') || transactionName.includes('motor_gas')) emoji = '⛽';

    await sendTelegramMessage(chatId, 
      `${emoji} <b>${displayName}</b>\n` +
      `📅 Month: <b>${month}</b>\n` +
      `🏦 Account: <b>${session.data.account}</b> (preselected)\n\n` +
      CONFIG.MESSAGES.AMOUNT_INPUT);
  } else {
    // Show account selection
    await showRecurringAccountSelection(chatId, transactionName, month);
  }
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

  const displayName = transactionName.replace(/_/g, ' ');
  let emoji = '🛒'; // default
  if (transactionName.includes('Mandatory') || transactionName.includes('mandatory')) emoji = '🍱';
  if (transactionName.includes('Jajan') || transactionName.includes('jajan')) emoji = '🍿';
  if (transactionName.includes('Supa_Groceries') || transactionName.includes('supa_groceries')) emoji = '🏪';
  if (transactionName.includes('Supa_Amenities') || transactionName.includes('supa_amenities')) emoji = '🧴';
  if (transactionName.includes('Motor_Gas') || transactionName.includes('motor_gas')) emoji = '⛽';

  await sendTelegramMessage(chatId, 
    `${emoji} <b>${displayName}</b>\n` +
    `📅 Month: <b>${month}</b>\n\n` +
    `🏦 Select Account:`, keyboard);
}

export async function handleRecurringAccountSelection(chatId, userId, transactionName, month, account) {
  // Update session data with selected account
  SessionManager.updateSessionData(userId, { account });

  // Check if this is a fixed expense with predefined description
  const session = SessionManager.getSession(userId);
  if (session.data && session.data.description) {
    // For fixed expenses with predefined description, skip description input and ask only for amount
    SessionManager.updateSession(userId, { 
      step: 'amount', 
      awaitingInput: true 
    });

    const displayName = transactionName.replace(/_/g, ' ');
    let emoji = '🛒'; // default
    if (transactionName.includes('Mandatory') || transactionName.includes('mandatory')) emoji = '🍱';
    if (transactionName.includes('Jajan') || transactionName.includes('jajan')) emoji = '🍿';
    if (transactionName.includes('Supa_Groceries') || transactionName.includes('supa_groceries')) emoji = '🏪';
    if (transactionName.includes('Supa_Amenities') || transactionName.includes('supa_amenities')) emoji = '🧴';
    if (transactionName.includes('Motor_Gas') || transactionName.includes('motor_gas')) emoji = '⛽';

    await sendTelegramMessage(chatId, 
      `${emoji} <b>${displayName}</b>\n` +
      `📅 Month: <b>${month}</b>\n` +
      `🏦 Account: <b>${account}</b>\n\n` +
      CONFIG.MESSAGES.AMOUNT_INPUT);
  } else {
    // For variable expenses, ask for amount first, then description
    SessionManager.updateSession(userId, { 
      step: 'amount', 
      awaitingInput: true 
    });

    const displayName = transactionName.replace(/_/g, ' ');
    let emoji = '🛒'; // default
    if (transactionName.includes('Mandatory') || transactionName.includes('mandatory')) emoji = '🍱';
    if (transactionName.includes('Jajan') || transactionName.includes('jajan')) emoji = '🍿';
    if (transactionName.includes('Supa_Groceries') || transactionName.includes('supa_groceries')) emoji = '🏪';
    if (transactionName.includes('Supa_Amenities') || transactionName.includes('supa_amenities')) emoji = '🧴';
    if (transactionName.includes('Motor_Gas') || transactionName.includes('motor_gas')) emoji = '⛽';

    await sendTelegramMessage(chatId, 
      `${emoji} <b>${displayName}</b>\n` +
      `📅 Month: <b>${month}</b>\n` +
      `🏦 Account: <b>${account}</b>\n\n` +
      CONFIG.MESSAGES.AMOUNT_INPUT);
  }
}

export async function handleRecurringUserInput(chatId, userId, text, session) {
  // Always get fresh session data
  const currentSession = SessionManager.getSession(userId);
  
  if (currentSession.step === 'amount') {
    await handleRecurringAmountInput(chatId, userId, text, currentSession);
  } else if (currentSession.step === 'description') {
    await handleRecurringDescriptionInput(chatId, userId, text, currentSession);
  }
}

async function handleRecurringAmountInput(chatId, userId, text, session) {
  const amount = parseInt(text.replace(/[^\d]/g, ''));
  
  if (!amount || amount <= 0) {
    await sendTelegramMessage(chatId, "❌ Please enter a valid amount (numbers only):");
    return;
  }
  
  // Update amount in session
  SessionManager.updateSessionData(userId, { amount });
  
  // Get the updated session to ensure we have all current data
  const updatedSession = SessionManager.getSession(userId);
  
  console.log('=== DEBUG MOTOR GAS ===');
  console.log('Updated session data:', updatedSession.data);
  console.log('Session type:', updatedSession.type);
  console.log('Recurring type:', updatedSession.data?.recurringType);
  console.log('Has description:', !!updatedSession.data?.description);
  console.log('Description value:', updatedSession.data?.description);
  console.log('=== END DEBUG ===');
  
  // Check if this is a fixed expense with predefined description
  if (updatedSession.type === 'fixed' && updatedSession.data && updatedSession.data.description) {
    console.log('✅ Processing fixed expense immediately - no description needed');
    // Process immediately for fixed expenses with predefined description
    await processRecurringTransaction(chatId, userId, updatedSession);
  } else {
    console.log('❌ Asking for description (variable expense or missing description)');
    // Ask for description for variable expenses
    SessionManager.updateSession(userId, { 
      step: 'description', 
      awaitingInput: true 
    });
    
    await sendTelegramMessage(chatId, CONFIG.MESSAGES.DESCRIPTION_INPUT);
  }
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
  
  let result;
  
  if (session.type === 'variable') {
    result = await addVariableExpenseToNotion(data);
    
    if (result.success) {
      const transactionType = data.recurringType === 'mandatory_gohan' ? 'Mandatory Gohan' : 
                             data.recurringType === 'jajan' ? 'Jajan' : 'Variable Expense';
      
      await sendTelegramMessage(chatId, 
        `✅ Recurring Transaction Added Successfully!\n\n` +
        `${data.recurringType === 'mandatory_gohan' ? '🍱' : '🍿'} Type: ${transactionType}\n` +
        `💰 Amount: IDR ${data.amount.toLocaleString()}\n` +
        `📝 Description: ${data.description}\n` +
        `📂 Category: ${data.category}\n` +
        `🛍️ Shopping Group: ${data.shoppingGroup}\n` +
        `🏦 Account: ${data.account}\n` +
        `📅 Month: ${data.month}`
      );
    }
  } else if (session.type === 'fixed') {
    const { addBasicFixedExpenseToNotion } = await import('./notionApi.js');
    result = await addBasicFixedExpenseToNotion(data);
    
    if (result.success) {
      let transactionType = 'Fixed Expense';
      let emoji = '🛒';
      
      if (data.recurringType === 'pasar_groceries') {
        transactionType = 'Pasar Groceries';
        emoji = '🛒';
      } else if (data.recurringType === 'supa_groceries') {
        transactionType = 'Supa Groceries';
        emoji = '🏪';
      } else if (data.recurringType === 'supa_amenities') {
        transactionType = 'Supa Amenities';
        emoji = '🧴';
      } else if (data.recurringType === 'motor_gas') {
        transactionType = 'Motor Gas';
        emoji = '⛽';
      }
      
      await sendTelegramMessage(chatId, 
        `✅ Recurring Transaction Added Successfully!\n\n` +
        `${emoji} Type: ${transactionType}\n` +
        `💰 Amount: IDR ${data.amount.toLocaleString()}\n` +
        `📝 Description: ${data.description}\n` +
        `🏠 Item: ${data.item}\n` +
        `🏦 Account: ${data.account}\n` +
        `📅 Month: ${data.month}`
      );
    }
  }
  
  if (!result || !result.success) {
    await sendTelegramMessage(chatId, CONFIG.MESSAGES.ERROR);
    console.error('Failed to add recurring transaction to Notion:', result?.error);
  }
  
  // Clear session and show main menu
  SessionManager.clearSession(userId);
  const { showMainMenu } = await import('./menuHandlers.js');
  await showMainMenu(chatId);
}
