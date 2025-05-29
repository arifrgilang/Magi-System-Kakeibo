// lib/transferHandlers.js - Transfer Specific Handlers
import { CONFIG } from './config.js';
import { SessionManager } from './sessionManager.js';
import { sendTelegramMessage } from './telegramApi.js';
import { addTransferToNotion } from './notionApi.js';

export async function showTransferFromAccountSelection(chatId) {
  const keyboard = {
    inline_keyboard: []
  };

  // Create rows of 2 accounts each for "From" account
  for (let i = 0; i < CONFIG.ACCOUNTS.length; i += 2) {
    const row = [];
    for (let j = i; j < Math.min(i + 2, CONFIG.ACCOUNTS.length); j++) {
      row.push({
        text: CONFIG.ACCOUNTS[j],
        callback_data: `transfer_from_${CONFIG.ACCOUNTS[j]}`
      });
    }
    keyboard.inline_keyboard.push(row);
  }

  // Add back button
  keyboard.inline_keyboard.push([
    { text: "⬅️ Back", callback_data: "back_main" }
  ]);

  await sendTelegramMessage(chatId, "💰 Select Account to Transfer FROM:", keyboard);
}

export async function showTransferToAccountSelection(chatId, fromAccount) {
  const keyboard = {
    inline_keyboard: []
  };

  // Create rows of 2 accounts each for "To" account (exclude the from account)
  const availableAccounts = CONFIG.ACCOUNTS.filter(account => account !== fromAccount);
  for (let i = 0; i < availableAccounts.length; i += 2) {
    const row = [];
    for (let j = i; j < Math.min(i + 2, availableAccounts.length); j++) {
      row.push({
        text: availableAccounts[j],
        callback_data: `transfer_to_${fromAccount}_${availableAccounts[j]}`
      });
    }
    keyboard.inline_keyboard.push(row);
  }

  // Add back button
  keyboard.inline_keyboard.push([
    { text: "⬅️ Back", callback_data: "back_transfer_from" }
  ]);

  await sendTelegramMessage(chatId, `💸 Transfer FROM: <b>${fromAccount}</b>\n\nSelect Account to Transfer TO:`, keyboard);
}

export async function showTransferTypeSelection(chatId, fromAccount, toAccount) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "🔄 Transfer", callback_data: `transfer_type_${fromAccount}_${toAccount}_Transfer` }],
      [{ text: "💳 Admin Fee", callback_data: `transfer_type_${fromAccount}_${toAccount}_Admin` }],
      [{ text: "⬅️ Back", callback_data: `back_transfer_to_${fromAccount}` }]
    ]
  };

  const transferMessage = 
    `💸 FROM: <b>${fromAccount}</b>\n` +
    `💰 TO: <b>${toAccount}</b>\n\n` +
    "Select Transfer Type:\n\n" +
    "🔄 <b>Transfer:</b> Regular money transfer\n" +
    "💳 <b>Admin Fee:</b> Transfer with admin/transaction fee";

  await sendTelegramMessage(chatId, transferMessage, keyboard);
}

export async function handleTransferUserInput(chatId, userId, text, session) {
  if (session.step === 'amount') {
    await handleTransferAmountInput(chatId, userId, text, session);
  } else if (session.step === 'adminFee') {
    await handleTransferAdminFeeInput(chatId, userId, text, session);
  } else if (session.step === 'description') {
    await handleTransferDescriptionInput(chatId, userId, text, session);
  }
}

async function handleTransferAmountInput(chatId, userId, text, session) {
  const amount = parseInt(text.replace(/[^\d]/g, ''));
  
  if (!amount || amount <= 0) {
    await sendTelegramMessage(chatId, "❌ Please enter a valid amount (numbers only):");
    return;
  }
  
  SessionManager.updateSessionData(userId, { amount });
  
  // If transfer type is Admin, ask for admin fee
  if (session.data.transferType === 'Admin') {
    SessionManager.updateSession(userId, { 
      step: 'adminFee', 
      awaitingInput: true 
    });
    await sendTelegramMessage(chatId, "💳 Please enter the admin/transaction fee amount:");
  } else {
    // If regular transfer, go directly to description
    SessionManager.updateSession(userId, { 
      step: 'description', 
      awaitingInput: true 
    });
    await sendTelegramMessage(chatId, CONFIG.MESSAGES.DESCRIPTION_INPUT);
  }
}

async function handleTransferAdminFeeInput(chatId, userId, text, session) {
  const adminFee = parseInt(text.replace(/[^\d]/g, ''));
  
  if (adminFee < 0 || isNaN(adminFee)) {
    await sendTelegramMessage(chatId, "❌ Please enter a valid admin fee amount (0 or more):");
    return;
  }
  
  SessionManager.updateSessionData(userId, { adminFee });
  SessionManager.updateSession(userId, { 
    step: 'description', 
    awaitingInput: true 
  });
  
  await sendTelegramMessage(chatId, CONFIG.MESSAGES.DESCRIPTION_INPUT);
}

async function handleTransferDescriptionInput(chatId, userId, text, session) {
  const description = text.trim();
  
  if (!description) {
    await sendTelegramMessage(chatId, "❌ Please enter a description:");
    return;
  }
  
  SessionManager.updateSessionData(userId, { description });
  
  // Process the transfer transaction
  await processTransferTransaction(chatId, userId, session);
}

async function processTransferTransaction(chatId, userId, session) {
  const { data } = session;
  
  // Add current date
  const currentDate = new Date().toISOString().split('T')[0];
  data.date = currentDate;
  
  const result = await addTransferToNotion(data);
  
  if (result.success) {
    let successMessage = 
      `✅ Transfer Added Successfully!\n\n` +
      `💸 FROM: ${data.fromAccount}\n` +
      `💰 TO: ${data.toAccount}\n` +
      `💵 Amount: IDR ${data.amount.toLocaleString()}\n` +
      `📝 Description: ${data.description}\n` +
      `🔄 Type: ${data.transferType}`;
    
    if (data.adminFee && data.adminFee > 0) {
      successMessage += `\n💳 Admin Fee: IDR ${data.adminFee.toLocaleString()}`;
    }
    
    await sendTelegramMessage(chatId, successMessage);
  } else {
    await sendTelegramMessage(chatId, CONFIG.MESSAGES.ERROR);
    console.error('Failed to add transfer to Notion:', result.error);
  }
  
  // Clear session and show main menu
  SessionManager.clearSession(userId);
  const { showMainMenu } = await import('./menuHandlers.js');
  await showMainMenu(chatId);
}
