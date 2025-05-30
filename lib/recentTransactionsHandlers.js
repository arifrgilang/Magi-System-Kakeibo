// lib/recentTransactionsHandlers.js - Recent Transactions Handlers
import { sendTelegramMessage } from './telegramApi.js';
import { getRecentTransactions } from './notionApi.js';

export async function showRecentTransactions(chatId, transactionType) {
  try {
    await sendTelegramMessage(chatId, "🔍 Fetching recent transactions...");
    
    const transactions = await getRecentTransactions(transactionType, 5);
    
    if (!transactions || transactions.length === 0) {
      await sendTelegramMessage(chatId, `📭 No recent ${transactionType} transactions found.`);
      return;
    }

    const typeEmojis = {
      variable: "💸",
      transfer: "💰", 
      income: "💵",
      fixed: "🏠",
      savings: "🏦"
    };

    const typeNames = {
      variable: "Variable Expenses",
      transfer: "Money Transfers", 
      income: "Income",
      fixed: "Fixed Expenses",
      savings: "Savings"
    };

    let message = `${typeEmojis[transactionType]} <b>Recent ${typeNames[transactionType]}</b>\n\n`;
    
    transactions.forEach((transaction, index) => {
      message += formatTransaction(transaction, transactionType, index + 1);
      message += "\n\n"; // Add double newline between transactions
    });

    message += `📋 Showing latest ${transactions.length} transactions`;

    // Add back button
    const keyboard = {
      inline_keyboard: [
        [{ text: "⬅️ Back to Recent Menu", callback_data: "recent_menu" }],
        [{ text: "🏠 Main Menu", callback_data: "back_main" }]
      ]
    };

    await sendTelegramMessage(chatId, message, keyboard);
    
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    await sendTelegramMessage(chatId, "❌ Error fetching transactions. Please try again.");
  }
}

function formatTransaction(transaction, type, index) {
  const date = transaction.date || 'Unknown Date';
  const amount = transaction.amount || 0;
  const description = transaction.description || 'No description';
  
  let formatted = `<b>${index}.</b> ${description}\n`;
  formatted += `📅 ${date} | 💰 ${amount.toLocaleString()}`;
  
  // Category color mapping
  const categoryColors = {
    'Survival': '🟢',
    'Optional': '🟡', 
    'Culture': '🔵',
    'Extra': '🔴'
  };
  
  // Add type-specific details
  switch (type) {
    case 'variable':
      if (transaction.category) {
        const colorDot = categoryColors[transaction.category] || '⚪';
        formatted += `\n${colorDot} ${transaction.category}`;
      }
      if (transaction.shoppingGroup) formatted += ` | 🛍️ ${transaction.shoppingGroup}`;
      if (transaction.account) formatted += `\n🏦 ${transaction.account}`;
      break;
      
    case 'transfer':
      if (transaction.fromAccount && transaction.toAccount) {
        formatted += `\n💸 ${transaction.fromAccount} → ${transaction.toAccount}`;
      }
      if (transaction.transferType) formatted += ` | 🔄 ${transaction.transferType}`;
      if (transaction.adminTax && transaction.adminTax > 0) {
        formatted += `\n💳 Admin/Tax: ${transaction.adminTax.toLocaleString()}`;
      }
      break;
      
    case 'income':
      if (transaction.incomeGroup) formatted += `\n💵 ${transaction.incomeGroup}`;
      if (transaction.account) formatted += `\n🏦 ${transaction.account}`;
      break;
      
    case 'fixed':
      if (transaction.item) formatted += `\n🏠 ${transaction.item}`;
      if (transaction.account) formatted += `\n🏦 ${transaction.account}`;
      break;
      
    case 'savings':
      if (transaction.savingsPlan) formatted += `\n🏦 ${transaction.savingsPlan}`;
      if (transaction.fromAccount && transaction.toAccount) {
        formatted += `\n💸 ${transaction.fromAccount} → ${transaction.toAccount}`;
      }
      if (transaction.adminTax && transaction.adminTax > 0) {
        formatted += `\n💳 Admin/Tax: ${transaction.adminTax.toLocaleString()}`;
      }
      break;
  }
  
  return formatted;
}
