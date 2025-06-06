// lib/weeklySummaryHandlers.js - Weekly Summary Handlers
import { sendTelegramMessage } from './telegramApi.js';
import { getWeeklyTransactionsSummary } from './notionApi.js';
import { getWeekBoundaries, formatWeekRange, getWeekLabel } from './weeklyUtils.js';

export async function showWeeklySummaryMenu(chatId) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "📅 This Week", callback_data: "weekly_select_0" }],
      [{ text: "📅 Previous Week", callback_data: "weekly_select_1" }],
      [{ text: "📅 Previous 2 Weeks", callback_data: "weekly_select_2" }],
      [{ text: "⬅️ Back to Main Menu", callback_data: "back_main" }]
    ]
  };

  const weeklyMessage = 
    "📊 <b>Weekly Summary</b>\n\n" +
    "Select which week you want to analyze:\n\n" +
    "📅 <b>This Week:</b> " + formatWeekRange(0) + "\n" +
    "📅 <b>Previous Week:</b> " + formatWeekRange(1) + "\n" +
    "📅 <b>Previous 2 Weeks:</b> " + formatWeekRange(2);

  await sendTelegramMessage(chatId, weeklyMessage, keyboard);
}

export async function showWeeklySummary(chatId, weekOffset) {
  try {
    await sendTelegramMessage(chatId, "📊 Analyzing weekly data...");
    
    const { start, end } = getWeekBoundaries(weekOffset);
    const weekRange = formatWeekRange(weekOffset);
    
    console.log(`Fetching weekly summary for ${weekRange} (${start} to ${end})`);
    
    const summaryData = await getWeeklyTransactionsSummary(start, end);
    
    if (!summaryData.success) {
      await sendTelegramMessage(chatId, "❌ Failed to fetch weekly summary. Please try again.");
      console.error('Failed to fetch weekly summary:', summaryData.error);
      return;
    }
    
    const { totalExpenses, categories, topItems } = summaryData.data;
    
    // Format the summary message
    let message = `📊 <b>Weekly Summary: ${weekRange}</b>\n\n`;
    
    // Total expenses
    message += `📈 <b>Total Expenses:</b> IDR ${totalExpenses.toLocaleString()}\n\n`;
    
    // Top categories (if any expenses exist)
    if (totalExpenses > 0 && categories && Object.keys(categories).length > 0) {
      message += `🔝 <b>Top Categories:</b>\n`;
      
      // Sort categories by amount and show with percentages
      const sortedCategories = Object.entries(categories)
        .filter(([_, amount]) => amount > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4); // Show top 4 categories max
      
      const categoryEmojis = {
        'Survival': '🟢',
        'Optional': '🟡', 
        'Culture': '🔵',
        'Extra': '🔴'
      };
      
      sortedCategories.forEach(([category, amount]) => {
        const percentage = Math.round((amount / totalExpenses) * 100);
        const emoji = categoryEmojis[category] || '⚪';
        message += `${emoji} ${category}: IDR ${amount.toLocaleString()} (${percentage}%)\n`;
      });
      
      message += '\n';
    }
    
    // Top 5 most costly items
    if (topItems && topItems.length > 0) {
      message += `💸 <b>Top 5 Most Costly Items:</b>\n`;
      
      topItems.slice(0, 5).forEach((item, index) => {
        message += `${index + 1}. ${item.description} - IDR ${item.amount.toLocaleString()}\n`;
      });
    } else {
      message += `💸 <b>No transactions found for this week</b>`;
    }
    
    // Add navigation buttons
    const keyboard = {
      inline_keyboard: [
        [{ text: "⬅️ Back to Week Selection", callback_data: "weekly_menu" }],
        [{ text: "🏠 Main Menu", callback_data: "back_main" }]
      ]
    };
    
    await sendTelegramMessage(chatId, message, keyboard);
    
  } catch (error) {
    console.error('Error in showWeeklySummary:', error);
    await sendTelegramMessage(chatId, "❌ An error occurred while generating the weekly summary. Please try again.");
  }
}

export async function handleWeeklySummaryAction(chatId, params) {
  const [subAction, ...rest] = params;
  
  switch (subAction) {
    case 'menu':
      await showWeeklySummaryMenu(chatId);
      break;
    case 'select':
      const weekOffset = parseInt(rest[0]);
      if (!isNaN(weekOffset) && weekOffset >= 0 && weekOffset <= 2) {
        await showWeeklySummary(chatId, weekOffset);
      } else {
        await showWeeklySummaryMenu(chatId);
      }
      break;
    default:
      await showWeeklySummaryMenu(chatId);
  }
}
