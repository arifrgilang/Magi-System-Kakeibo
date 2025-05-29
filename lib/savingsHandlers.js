// lib/savingsHandlers.js - Savings Specific Handlers
import { CONFIG } from './config.js';
import { SessionManager } from './sessionManager.js';
import { sendTelegramMessage } from './telegramApi.js';
import { addSavingsToNotion } from './notionApi.js';

export async function showSavingsPlanSelection(chatId) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "🏠 KPR Bom 3 tahun", callback_data: "savings_plan_KPR Bom 3 tahun" }],
      [{ text: "🚨 KPR 3 month Urgent Savings", callback_data: "savings_plan_KPR 3 month Urgent Savings" }],
      [{ text: "💰 Emergency Fund", callback_data: "savings_plan_Emergency Fund" }],
      [{ text: "🎯 Custom Plan", callback_data: "savings_plan_Custom Plan" }],
      [{ text: "⬅️ Back", callback_data: "back_main" }]
    ]
  };

  const savingsMessage = 
    "🏦 Select Savings Plan:\n\n" +
    "🏠 <b>KPR Bom 3 tahun:</b> Long-term house savings\n" +
    "🚨 <b>KPR 3 month Urgent:</b> Short-term urgent house fund\n" +
    "💰 <b>Emergency Fund:</b> Emergency money reserve\n" +
    "🎯 <b>Custom Plan:</b> Other savings goal";

  await sendTelegramMessage(chatId, savingsMessage, keyboard);
}

export async function showSavingsMonthSelection(chatId, savingsPlan) {
  const keyboard = {
    inline_keyboard: []
  };

  // Create rows of 3 months each
  for (let i = 0; i < CONFIG.MONTHS.length; i += 3) {
    const row = [];
    for (let j = i; j < Math.min(i + 3, CONFIG.MONTHS.length); j++) {
      row.push({
        text: CONFIG.MONTHS[j],
        callback_data: `savings_month_${savingsPlan}_${CONFIG.MONTHS[j]}`
      });
    }
    keyboard.inline_keyboard.push(row);
  }

  // Add back button
  keyboard.inline_keyboard.push([
    { text: "⬅️ Back", callback_data: "back_savings_plan" }
  ]);

  await sendTelegramMessage(chatId, `🏦 Plan: <b>${savingsPlan}</b>\n\n📅 Select Month:`, keyboard);
}

export async function showSavingsFromAccountSelection(chatId, savingsPlan, month) {
  const keyboard = {
    inline_keyboard: []
  };

  // Create rows of 2 accounts each for "From" account
  for (let i = 0; i < CONFIG.ACCOUNTS.length; i += 2) {
    const row = [];
    for (let j = i; j < Math.min(i + 2, CONFIG.ACCOUNTS.length); j++) {
      row.push({
        text: CONFIG.ACCOUNTS[j],
        callback_data: `savings_from_${savingsPlan}_${month}_${CONFIG.ACCOUNTS[j]}`
      });
    }
    keyboard.inline_keyboard.push(row);
  }

  // Add back button
  keyboard.inline_keyboard.push([
    { text: "⬅️ Back", callback_data: `back_savings_month_${savingsPlan}` }
  ]);

  await sendTelegramMessage(chatId, `🏦 Plan: <b>${savingsPlan}</b>\n📅 Month: <b>${month}</b>\n\n💰 Select Account to Transfer FROM:`, keyboard);
}

export async function showSavingsToAccountSelection(chatId, savingsPlan, month, fromAccount) {
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
        callback_data: `savings_to_${savingsPlan}_${month}_${fromAccount}_${availableAccounts[j]}`
      });
    }
    keyboard.inline_keyboard.push(row);
  }

  // Add back button
  keyboard.inline_keyboard.push([
    { text: "⬅️ Back", callback_data: `back_savings_from_${savingsPlan}_${month}` }
  ]);

  await sendTelegramMessage(chatId, 
    `🏦 Plan: <b>${savingsPlan}</b>\n` +
    `📅 Month: <b>${month}</b>\n` +
    `💸 FROM: <b>${fromAccount}</b>\n\n` +
    `💰 Select Account to Save TO:`, keyboard);
}

export async function handleSavingsUserInput(chatId, userId, text, session) {
  console.log('handleSavingsUserInput called with step:', session.step, 'text:', text);
  
  if (session.step === 'amount' || session.step === 'amountOut') {
    await handleSavingsAmountOutInput(chatId, userId, text, session);
  } else if (session.step === 'adminTax') {
    await handleSavingsAdminTaxInput(chatId, userId, text, session);
  } else if (session.step === 'description') {
    await handleSavingsDescriptionInput(chatId, userId, text, session);
  } else {
    console.log('Unknown savings step:', session.step);
  }
}

async function handleSavingsAmountOutInput(chatId, userId, text, session) {
  const amountOut = parseInt(text.replace(/[^\d]/g, ''));
  
  console.log('Savings Amount Out Input:', { amountOut, session });
  
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

async function handleSavingsAdminTaxInput(chatId, userId, text, session) {
  console.log('handleSavingsAdminTaxInput called with text:', text);
  
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

async function handleSavingsDescriptionInput(chatId, userId, text, session) {
  const description = text.trim();
  
  if (!description) {
    await sendTelegramMessage(chatId, "❌ Please enter a description:");
    return;
  }
  
  SessionManager.updateSessionData(userId, { description });
  
  // Process the savings transaction
  await processSavingsTransaction(chatId, userId, session);
}

async function processSavingsTransaction(chatId, userId, session) {
  const { data } = session;
  
  console.log('Processing savings transaction with data:', data);
  
  // Add current date
  const currentDate = new Date().toISOString().split('T')[0];
  data.date = currentDate;
  
  // Ensure adminTax has a default value
  if (!data.adminTax) {
    data.adminTax = 0;
  }
  
  const result = await addSavingsToNotion(data);
  
  if (result.success) {
    let successMessage = 
      `✅ Savings Added Successfully!\n\n` +
      `🏦 Plan: ${data.savingsPlan}\n` +
      `📅 Month: ${data.month}\n` +
      `💸 FROM: ${data.fromAccount}\n` +
      `💰 TO: ${data.toAccount}\n` +
      `💵 Amount Out: IDR ${data.amountOut.toLocaleString()}\n` +
      `💳 Admin or Tax: IDR ${data.adminTax.toLocaleString()}\n` +
      `💰 Total Out: IDR ${(data.amountOut + data.adminTax).toLocaleString()}\n` +
      `📝 Description: ${data.description}`;
    
    await sendTelegramMessage(chatId, successMessage);
  } else {
    await sendTelegramMessage(chatId, CONFIG.MESSAGES.ERROR);
    console.error('Failed to add savings to Notion:', result.error);
  }
  
  // Clear session and show main menu
  SessionManager.clearSession(userId);
  const { showMainMenu } = await import('./menuHandlers.js');
  await showMainMenu(chatId);
}
