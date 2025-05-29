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
      [{ text: "💸 Withdraw", callback_data: `transfer_type_${fromAccount}_${toAccount}_Withdraw` }],
      [{ text: "📈 Top Up", callback_data: `transfer_type_${fromAccount}_${toAccount}_Top Up` }],
      [{ text: "⬅️ Back", callback_data: `back_transfer_to_${fromAccount}` }]
    ]
  };

  const transferMessage = 
    `💸 FROM: <b>${fromAccount}</b>\n` +
    `💰 TO: <b>${toAccount}</b>\n\n` +
    "Select Transfer Type:\n\n" +
    "🔄 <b>Transfer:</b> Regular money transfer between accounts\n" +
    "💸 <b>Withdraw:</b> Cash withdrawal from account\n" +
    "📈 <b>Top Up:</b> Adding money to account/wallet";

  await sendTelegramMessage(chatId, transferMessage, keyboard);
}

export async function handleTransferUserInput(chatId, userId, text, session) {
  console.log('handleTransferUserInput called with step:', session.step, 'text:', text);
  
  if (session.step === 'amountOut') {
    await handleTransferAmountOutInput(chatId, userId, text, session);
  } else if (session.step === 'adminTax') {
    await handleTransferAdminTaxInput(chatId, userId, text, session);
  } else if (session.step === 'description') {
    await handleTransferDescriptionInput(chatId, userId, text, session);
  } else {
    console.log('Unknown transfer step:', session.step);
  }
}

async function handleTransferAmountOutInput(chatId, userId, text, session) {
  const amountOut = parseInt(text.replace(/[^\d]/g, ''));
  
  console.log('Transfer Amount Out Input:', { amountOut, session });
  
  if (!amountOut || amountOut <= 0) {
    await sendTelegramMessage(chatId, "❌ Please enter a valid amount out (numbers only):");
    return;
  }
  
  SessionManager.updateSessionData(userId, { amountOut });
  
  // Always ask for admin/tax fee after amount out
  SessionManager.updateSession(userId, { 
    step: 'adminTax', 
    awaitingInput: true 
  });
  
  console.log('Updated session after amount out:', SessionManager.getSession(userId));
  
  await sendTelegramMessage(chatId, "💳 Please enter the admin or tax fee amount (enter 0 if no fee):");
}

async function handleTransferAdminTaxInput(chatId, userId, text, session) {
  console.log('handleTransferAdminTaxInput called with text:', text);
  
  const adminTax = parseInt(text.replace(/[^\d]/g, ''));
  
  if (adminTax < 0 || isNaN(adminTax)) {
    await sendTelegramMessage(chatId, "❌ Please enter a valid admin or tax fee amount (0 or more):");
    return;
  }
  
  console.log('Setting adminTax to:', adminTax);
  SessionManager.updateSessionData(userId, { adminTax });
  SessionManager.updateSession(userId, { 
    step: 'description', 
    awaitingInput: true 
  });
  
  console.log('Updated session after adminTax:', SessionManager.getSession(userId));
  
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
  
  console.log('Processing transfer transaction with data:', data);
  
  // Add current date
  const currentDate = new Date().toISOString().split('T')[0];
  data.date = currentDate;
  
  // Ensure adminTax has a default value
  if (!data.adminTax) {
    data.adminTax = 0;
  }
  
  const result = await addTransferToNotion(data);
  
  if (result.success) {
    let successMessage = 
      `✅ Transfer Added Successfully!\n\n` +
      `💸 FROM: ${data.fromAccount}\n` +
      `💰 TO: ${data.toAccount}\n` +
      `💵 Amount Out: IDR ${data.amountOut.toLocaleString()}\n` +
      `💳 Admin or Tax: IDR ${data.adminTax.toLocaleString()}\n` +
      `💰 Total Out: IDR ${(data.amountOut + data.adminTax).toLocaleString()}\n` +
      `📝 Description: ${data.description}\n` +
      `🔄 Type: ${data.transferType}`;
    
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
