// lib/incomeHandlers.js - Income Specific Handlers
import { CONFIG } from './config.js';
import { SessionManager } from './sessionManager.js';
import { sendTelegramMessage } from './telegramApi.js';
import { addIncomeToNotion } from './notionApi.js';

export async function showIncomeGroupSelection(chatId) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "💰 Salary", callback_data: "income_group_Salary" }],
      [{ text: "🔄 Normalize", callback_data: "income_group_Normalize" }],
      [{ text: "👥 Hutang Teman", callback_data: "income_group_Hutang Teman" }],
      [{ text: "⬅️ Back", callback_data: "back_main" }]
    ]
  };

  const incomeMessage = 
    "💵 Select Income Group:\n\n" +
    "💰 <b>Salary:</b> Regular salary payments\n" +
    "🔄 <b>Normalize:</b> Balance transfers and normalizations\n" +
    "👥 <b>Hutang Teman:</b> Money from friends/debt collection";

  await sendTelegramMessage(chatId, incomeMessage, keyboard);
}

export async function showIncomeMonthSelection(chatId, incomeGroup) {
  const keyboard = {
    inline_keyboard: []
  };

  // Create rows of 3 months each
  for (let i = 0; i < CONFIG.MONTHS.length; i += 3) {
    const row = [];
    for (let j = i; j < Math.min(i + 3, CONFIG.MONTHS.length); j++) {
      row.push({
        text: CONFIG.MONTHS[j],
        callback_data: `income_month_${incomeGroup}_${CONFIG.MONTHS[j]}`
      });
    }
    keyboard.inline_keyboard.push(row);
  }

  // Add back button
  keyboard.inline_keyboard.push([
    { text: "⬅️ Back", callback_data: "back_income_group" }
  ]);

  await sendTelegramMessage(chatId, "📅 Select Month:", keyboard);
}

export async function showIncomeAccountSelection(chatId, incomeGroup, month) {
  const keyboard = {
    inline_keyboard: []
  };

  // Create rows of 2 accounts each
  for (let i = 0; i < CONFIG.ACCOUNTS.length; i += 2) {
    const row = [];
    for (let j = i; j < Math.min(i + 2, CONFIG.ACCOUNTS.length); j++) {
      row.push({
        text: CONFIG.ACCOUNTS[j],
        callback_data: `income_account_${incomeGroup}_${month}_${CONFIG.ACCOUNTS[j]}`
      });
    }
    keyboard.inline_keyboard.push(row);
  }

  // Add back button
  keyboard.inline_keyboard.push([
    { text: "⬅️ Back", callback_data: `back_income_month_${incomeGroup}` }
  ]);

  await sendTelegramMessage(chatId, "🏦 Select Account:", keyboard);
}

export async function handleIncomeUserInput(chatId, userId, text, session) {
  if (session.step === 'amount') {
    await handleIncomeAmountInput(chatId, userId, text, session);
  } else if (session.step === 'description') {
    await handleIncomeDescriptionInput(chatId, userId, text, session);
  }
}

async function handleIncomeAmountInput(chatId, userId, text, session) {
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

async function handleIncomeDescriptionInput(chatId, userId, text, session) {
  const description = text.trim();
  
  if (!description) {
    await sendTelegramMessage(chatId, "❌ Please enter a description:");
    return;
  }
  
  SessionManager.updateSessionData(userId, { description });
  
  // Process the income transaction
  await processIncomeTransaction(chatId, userId, session);
}

async function processIncomeTransaction(chatId, userId, session) {
  const { data } = session;
  
  // Add current date
  const currentDate = new Date().toISOString().split('T')[0];
  data.date = currentDate;
  
  const result = await addIncomeToNotion(data);
  
  if (result.success) {
    await sendTelegramMessage(chatId, 
      `✅ Income Added Successfully!\n\n` +
      `💰 Amount: IDR ${data.amount.toLocaleString()}\n` +
      `📝 Description: ${data.description}\n` +
      `💵 Income Group: ${data.incomeGroup}\n` +
      `🏦 Account: ${data.account}\n` +
      `📅 Month: ${data.month}`
    );
  } else {
    await sendTelegramMessage(chatId, CONFIG.MESSAGES.ERROR);
    console.error('Failed to add income to Notion:', result.error);
  }
  
  // Clear session and show main menu
  SessionManager.clearSession(userId);
  const { showMainMenu } = await import('./menuHandlers.js');
  await showMainMenu(chatId);
}
