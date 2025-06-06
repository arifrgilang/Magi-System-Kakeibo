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
    
    const { variableExpenses, fixedExpenses, totalExpenses, categories, topVariableItems, topFixedItems } = summaryData.data;
    
    // Format the summary message
    let message = `📊 <b>Weekly Summary: ${weekRange}</b>\n\n`;
    
    // Expense breakdown
    message += `💸 <b>Variable Expenses:</b> IDR ${variableExpenses.toLocaleString()}\n`;
    message += `🏠 <b>Fixed Expenses:</b> IDR ${fixedExpenses.toLocaleString()}\n`;
    message += `📈 <b>Total Expenses:</b> IDR ${totalExpenses.toLocaleString()}\n\n`;
    
    // Top categories (if any variable expenses exist)
    if (variableExpenses > 0 && categories && Object.keys(categories).length > 0) {
      message += `🔝 <b>Top Categories:</b>\n`;
      
      // Sort categories by amount and show with percentages (based on variable expenses only)
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
        const percentage = Math.round((amount / variableExpenses) * 100);
        const emoji = categoryEmojis[category] || '⚪';
        message += `${emoji} ${category}: IDR ${amount.toLocaleString()} (${percentage}%)\n`;
      });
      
      message += '\n';
    }
    
    // Top 3 Variable Expenses
    if (topVariableItems && topVariableItems.length > 0) {
      message += `💸 <b>Top 3 Variable Expenses:</b>\n`;
      
      topVariableItems.slice(0, 3).forEach((item, index) => {
        message += `${index + 1}. ${item.description} - IDR ${item.amount.toLocaleString()}\n`;
      });
      
      message += '\n';
    }
    
    // Top 3 Fixed Expenses
    if (topFixedItems && topFixedItems.length > 0) {
      message += `🏠 <b>Top 3 Fixed Expenses:</b>\n`;
      
      topFixedItems.slice(0, 3).forEach((item, index) => {
        message += `${index + 1}. ${item.description} - IDR ${item.amount.toLocaleString()}\n`;
      });
    } else if (topVariableItems && topVariableItems.length === 0 && topFixedItems && topFixedItems.length === 0) {
      message += `💸 <b>No transactions found for this week</b>`;
    }
    
    // Add navigation buttons
    const keyboard = {
      inline_keyboard: [
        [
          { text: "🏠 Show Fixed Expenses", callback_data: `weekly_fixed_${weekOffset}` },
          { text: "💸 Show Variable Expenses", callback_data: `weekly_variable_${weekOffset}` }
        ],
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

export async function showWeeklyFixedExpenses(chatId, weekOffset) {
  try {
    await sendTelegramMessage(chatId, "🏠 Loading fixed expenses...");
    
    const { start, end } = getWeekBoundaries(weekOffset);
    const weekRange = formatWeekRange(weekOffset);
    
    console.log(`Fetching fixed expenses for ${weekRange} (${start} to ${end})`);
    
    const fixedExpenses = await getFixedExpensesForWeek(start, end);
    
    // Format the fixed expenses message
    let message = `🏠 <b>Fixed Expenses: ${weekRange}</b>\n\n`;
    
    if (!fixedExpenses || fixedExpenses.length === 0) {
      message += `📭 <b>No fixed expenses found for this week</b>`;
    } else {
      // Sort by date (oldest first)
      const sortedExpenses = fixedExpenses.sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
      });
      
      message += `📦 <b>${sortedExpenses.length} transaction${sortedExpenses.length > 1 ? 's' : ''} found</b>\n\n`;
      
      // Show each transaction
      sortedExpenses.forEach((expense, index) => {
        const date = new Date(expense.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        message += `${index + 1}. ${date} | ${expense.description} - IDR ${expense.amount.toLocaleString()}\n`;
      });
      
      // Calculate total
      const total = sortedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      message += `\n💰 <b>Total Fixed: IDR ${total.toLocaleString()}</b>`;
    }
    
    // Add navigation buttons
    const keyboard = {
      inline_keyboard: [
        [{ text: "⬅️ Back to Summary", callback_data: `weekly_select_${weekOffset}` }],
        [{ text: "🏠 Main Menu", callback_data: "back_main" }]
      ]
    };
    
    await sendTelegramMessage(chatId, message, keyboard);
    
  } catch (error) {
    console.error('Error in showWeeklyFixedExpenses:', error);
    await sendTelegramMessage(chatId, "❌ An error occurred while fetching fixed expenses. Please try again.");
  }
}

export async function showWeeklyVariableExpenses(chatId, weekOffset) {
  try {
    await sendTelegramMessage(chatId, "💸 Loading variable expenses...");
    
    const { start, end } = getWeekBoundaries(weekOffset);
    const weekRange = formatWeekRange(weekOffset);
    
    console.log(`Fetching variable expenses for ${weekRange} (${start} to ${end})`);
    
    // Get the variable expenses for the week
    const variableExpenses = await getVariableExpensesForWeek(start, end);
    
    // Format the variable expenses message
    let message = `💸 <b>Variable Expenses: ${weekRange}</b>\n\n`;
    
    if (!variableExpenses || variableExpenses.length === 0) {
      message += `📭 <b>No variable expenses found for this week</b>`;
    } else {
      // Sort by date (oldest first)
      const sortedExpenses = variableExpenses.sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
      });
      
      message += `📦 <b>${sortedExpenses.length} transaction${sortedExpenses.length > 1 ? 's' : ''} found</b>\n\n`;
      
      // Category emoji mapping
      const categoryEmojis = {
        'Survival': '🟢',
        'Optional': '🟡', 
        'Culture': '🔵',
        'Extra': '🔴'
      };
      
      // Show each transaction with category emoji
      sortedExpenses.forEach((expense, index) => {
        const date = new Date(expense.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        const categoryEmoji = categoryEmojis[expense.category] || '⚪';
        message += `${index + 1}. ${date} | ${categoryEmoji} ${expense.description} - IDR ${expense.amount.toLocaleString()}\n`;
      });
      
      // Calculate total
      const total = sortedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      message += `\n💰 <b>Total Variable: IDR ${total.toLocaleString()}</b>`;
    }
    
    // Add navigation buttons
    const keyboard = {
      inline_keyboard: [
        [{ text: "⬅️ Back to Summary", callback_data: `weekly_select_${weekOffset}` }],
        [{ text: "🏠 Main Menu", callback_data: "back_main" }]
      ]
    };
    
    await sendTelegramMessage(chatId, message, keyboard);
    
  } catch (error) {
    console.error('Error in showWeeklyVariableExpenses:', error);
    await sendTelegramMessage(chatId, "❌ An error occurred while fetching variable expenses. Please try again.");
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
    case 'fixed':
      const fixedWeekOffset = parseInt(rest[0]);
      if (!isNaN(fixedWeekOffset) && fixedWeekOffset >= 0 && fixedWeekOffset <= 2) {
        await showWeeklyFixedExpenses(chatId, fixedWeekOffset);
      } else {
        await showWeeklySummaryMenu(chatId);
      }
      break;
    case 'variable':
      const variableWeekOffset = parseInt(rest[0]);
      if (!isNaN(variableWeekOffset) && variableWeekOffset >= 0 && variableWeekOffset <= 2) {
        await showWeeklyVariableExpenses(chatId, variableWeekOffset);
      } else {
        await showWeeklySummaryMenu(chatId);
      }
      break;
    default:
      await showWeeklySummaryMenu(chatId);
  }
}

// Helper function to get fixed expenses for the week
async function getFixedExpensesForWeek(startDate, endDate) {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const Basic_Fixed_Expenses_OkaneH_Transactions = process.env.Basic_Fixed_Expenses_OkaneH_Transactions;
  
  if (!Basic_Fixed_Expenses_OkaneH_Transactions) return [];
  
  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${Basic_Fixed_Expenses_OkaneH_Transactions}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter: {
          and: [
            {
              property: 'Date',
              date: {
                on_or_after: startDate
              }
            },
            {
              property: 'Date',
              date: {
                on_or_before: endDate
              }
            }
          ]
        }
      })
    });

    if (response.ok) {
      const result = await response.json();
      
      const transactions = [];
      for (const page of result.results) {
        const transaction = {
          type: 'fixed',
          description: page.properties.Transaction?.title?.[0]?.text?.content || 'No description',
          amount: page.properties.Amount?.number || 0,
          date: page.properties.Date?.date?.start || null
        };
        
        if (transaction.amount > 0) {
          transactions.push(transaction);
        }
      }
      
      return transactions;
    }
  } catch (error) {
    console.error('Error querying fixed expenses:', error);
  }
  
  return [];
}

// Helper function to get variable expenses for the week
async function getVariableExpensesForWeek(startDate, endDate) {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  
  // Monthly databases for variable expenses
  const monthlyDatabases = {
    'January': process.env.Variable_Expenses_OkaneH_Transactions_January,
    'February': process.env.Variable_Expenses_OkaneH_Transactions_February,
    'March': process.env.Variable_Expenses_OkaneH_Transactions_March,
    'April': process.env.Variable_Expenses_OkaneH_Transactions_April,
    'May': process.env.Variable_Expenses_OkaneH_Transactions_May,
    'June': process.env.Variable_Expenses_OkaneH_Transactions_June,
    'July': process.env.Variable_Expenses_OkaneH_Transactions_July,
    'August': process.env.Variable_Expenses_OkaneH_Transactions_August,
    'September': process.env.Variable_Expenses_OkaneH_Transactions_September,
    'October': process.env.Variable_Expenses_OkaneH_Transactions_October,
    'November': process.env.Variable_Expenses_OkaneH_Transactions_November,
    'December': process.env.Variable_Expenses_OkaneH_Transactions_December,
  };
  
  const allTransactions = [];
  
  // Query all monthly databases for variable expenses
  for (const [month, databaseId] of Object.entries(monthlyDatabases)) {
    if (!databaseId) continue;
    
    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          filter: {
            and: [
              {
                property: 'Date',
                date: {
                  on_or_after: startDate
                }
              },
              {
                property: 'Date',
                date: {
                  on_or_before: endDate
                }
              }
            ]
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        for (const page of result.results) {
          const transaction = {
            type: 'variable',
            description: page.properties.Transaction?.title?.[0]?.text?.content || 'No description',
            amount: page.properties.Amount?.number || 0,
            date: page.properties.Date?.date?.start || null,
            category: await getRelationNameLocal(page.properties.Category?.relation?.[0]?.id)
          };
          
          if (transaction.amount > 0) {
            allTransactions.push(transaction);
          }
        }
      }
    } catch (error) {
      console.error(`Error querying ${month} variable expenses:`, error);
    }
  }
  
  return allTransactions;
}

// Helper function to get relation name locally
async function getRelationNameLocal(relationId) {
  if (!relationId) return null;
  
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  
  try {
    const response = await fetch(`https://api.notion.com/v1/pages/${relationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    
    // Extract the title from the page properties
    for (const [key, property] of Object.entries(result.properties)) {
      if (property.type === 'title' && property.title?.[0]?.text?.content) {
        return property.title[0].text.content;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching relation name for ID ${relationId}:`, error);
    return null;
  }
}
