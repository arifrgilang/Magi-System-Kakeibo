// lib/balanceHandlers.js - Balance Display Handlers
import { sendTelegramMessage } from './telegramApi.js';
import { getAccountBalances } from './notionApi.js';

export async function showAccountBalances(chatId) {
  try {
    console.log('Fetching account balances...');
    
    const balances = await getAccountBalances();
    
    if (!balances.success) {
      await sendTelegramMessage(chatId, "❌ Failed to fetch account balances. Please try again.");
      console.error('Failed to fetch balances:', balances.error);
      return;
    }
    
    if (!balances.data || balances.data.length === 0) {
      await sendTelegramMessage(chatId, "📊 No account data found.");
      return;
    }
    
    // Format the balance message
    let balanceMessage = "💰 <b>Account Balances</b>\n\n";balance
    
    balances.data.forEach((account, index) => {
      const accountName = account.name || 'Unknown Account';
      const balance = account.balance || 0;
      const formattedBalance = balance.toLocaleString('id-ID');
      
      balanceMessage += `${index + 1}. ${accountName} | ${formattedBalance}\n`;
    });
    
    // Add back button
    const keyboard = {
      inline_keyboard: [
        [{ text: "⬅️ Back to Main Menu", callback_data: "back_main" }]
      ]
    };
    
    await sendTelegramMessage(chatId, balanceMessage, keyboard);
    
  } catch (error) {
    console.error('Error in showAccountBalances:', error);
    await sendTelegramMessage(chatId, "❌ An error occurred while fetching balances. Please try again.");
  }
}
