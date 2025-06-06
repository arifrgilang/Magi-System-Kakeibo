// lib/weeklySummaryHandlers.js - Weekly Summary Handlers
import { sendTelegramMessage } from './telegramApi.js';
import { getWeeklyTransactionsSummary } from './notionApi.js';
import { getWeekBoundaries, formatWeekRange, getWeekLabel } from './weeklyUtils.js';

export async function showWeeklySummaryMenu(chatId) {
  try {
    await sendTelegramMessage(chatId, "📊 Loading weekly overview...");
    
    // Fetch data for all 3 weeks
    const week0Data = await getWeeklyTotalsOnly(0); // This week
    const week1Data = await getWeeklyTotalsOnly(1); // Previous week  
    const week2Data = await getWeeklyTotalsOnly(2); // Previous 2 weeks
    
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
      
      `📅 <b>This Week:</b> ${formatWeekRange(0)}\n` +
      `💰 Total Expenses: IDR ${week0Data.toLocaleString()}\n\n` +
      
      `📅 <b>Previous Week:</b> ${formatWeekRange(1)}\n` +
      `💰 Total Expenses: IDR ${week1Data.toLocaleString()}\n\n` +
      
      `📅 <b>Previous 2 Weeks:</b> ${formatWeekRange(2)}\n` +
      `💰 Total Expenses: IDR ${week2Data.toLocaleString()}\n\n` +
      
      `📊 <b>Combined 3-Week Total: IDR ${(week0Data + week1Data + week2Data).toLocaleString()}</b>\n` +
      `📈 <b>Weekly Average: IDR ${Math.round((week0Data + week1Data + week2Data) / 3).toLocaleString()}</b>`;

    await sendTelegramMessage(chatId, weeklyMessage, keyboard);
    
  } catch (error) {
    console.error('Error in showWeeklySummaryMenu:', error);
    
    // Fallback to simple menu if data fetching fails
    const keyboard = {
      inline_keyboard: [
        [{ text: "📅 This Week", callback_data: "weekly_select_0" }],
        [{ text: "📅 Previous Week", callback_data: "weekly_select_1" }],
        [{ text: "📅 Previous 2 Weeks", callback_data: "weekly_select_2" }],
        [{ text: "⬅️ Back to Main Menu", callback_data: "back_main" }]
      ]
    };

    const fallbackMessage = 
      "📊 <b>Weekly Summary</b>\n\n" +
      "Select which week you want to analyze:\n\n" +
      "📅 <b>This Week:</b> " + formatWeekRange(0) + "\n" +
      "📅 <b>Previous Week:</b> " + formatWeekRange(1) + "\n" +
      "📅 <b>Previous 2 Weeks:</b> " + formatWeekRange(2);

    await sendTelegramMessage(chatId, fallbackMessage, keyboard);
  }
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
      message += `📦 <b>${fixedExpenses.length} transaction${fixedExpenses.length > 1 ? 's' : ''} found</b>\n\n`;
      
      // Group expenses by day
      const expensesByDay = groupTransactionsByDay(fixedExpenses);
      
      // Sort days chronologically
      const sortedDays = Object.keys(expensesByDay).sort((a, b) => new Date(a) - new Date(b));
      
      let totalAmount = 0;
      
      sortedDays.forEach((dateStr, dayIndex) => {
        const dayExpenses = expensesByDay[dateStr];
        const dayTotal = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        totalAmount += dayTotal;
        
        const dayName = new Date(dateStr).toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        });
        
        message += `📅 <b>${dayName}</b> (${dayExpenses.length} transaction${dayExpenses.length > 1 ? 's' : ''})\n`;
        
        dayExpenses.forEach(expense => {
          message += `• ${expense.description} - IDR ${expense.amount.toLocaleString()}\n`;
        });
        
        // Show compact total (no category breakdown for fixed expenses)
        message += `💰 ${formatCompactAmount(dayTotal)}\n`;
        
        // Add separator line between days (except for the last day)
        if (dayIndex < sortedDays.length - 1) {
          message += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        } else {
          message += '\n';
        }
      });
      
      message += `💰 <b>Total Fixed: IDR ${totalAmount.toLocaleString()}</b>`;
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
      message += `📦 <b>${variableExpenses.length} transaction${variableExpenses.length > 1 ? 's' : ''} found</b>\n\n`;
      
      // Category emoji mapping
      const categoryEmojis = {
        'Survival': '🟢',
        'Optional': '🟡', 
        'Culture': '🔵',
        'Extra': '🔴'
      };
      
      // Group expenses by day
      const expensesByDay = groupTransactionsByDay(variableExpenses);
      
      // Sort days chronologically
      const sortedDays = Object.keys(expensesByDay).sort((a, b) => new Date(a) - new Date(b));
      
      let totalAmount = 0;
      
      sortedDays.forEach((dateStr, dayIndex) => {
        const dayExpenses = expensesByDay[dateStr];
        const dayTotal = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        totalAmount += dayTotal;
        
        const dayName = new Date(dateStr).toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        });
        
        message += `📅 <b>${dayName}</b> (${dayExpenses.length} transaction${dayExpenses.length > 1 ? 's' : ''})\n`;
        
        // Group expenses by category for this day
        const categoriesByDay = {};
        
        dayExpenses.forEach(expense => {
          const categoryEmoji = categoryEmojis[expense.category] || '⚪';
          const category = expense.category || 'Other';
          
          if (!categoriesByDay[category]) {
            categoriesByDay[category] = { total: 0, emoji: categoryEmoji };
          }
          categoriesByDay[category].total += expense.amount;
          
          message += `• ${categoryEmoji} ${expense.description} - IDR ${expense.amount.toLocaleString()}\n`;
        });
        
        // Show category breakdown in compact format (no empty line)
        const categoryEntries = Object.entries(categoriesByDay);
        if (categoryEntries.length > 0) {
          const categoryLine = categoryEntries
            .map(([category, data]) => `${data.emoji} ${formatCompactAmount(data.total)}`)
            .join('  ');
          message += `${categoryLine}  →  💰 ${formatCompactAmount(dayTotal)}\n`;
        }
        
        // Add separator line between days (except for the last day)
        if (dayIndex < sortedDays.length - 1) {
          message += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        } else {
          message += '\n';
        }
      });
      
      message += `💰 <b>Total Variable: IDR ${totalAmount.toLocaleString()}</b>`;
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

// Helper function to get just the total expenses for a week (lightweight)
async function getWeeklyTotalsOnly(weekOffset) {
  try {
    const { start, end } = getWeekBoundaries(weekOffset);
    
    // Get variable and fixed expenses totals only (no detailed data needed)
    const [variableTotal, fixedTotal] = await Promise.all([
      getVariableExpensesTotalForWeek(start, end),
      getFixedExpensesTotalForWeek(start, end)
    ]);
    
    return variableTotal + fixedTotal;
    
  } catch (error) {
    console.error(`Error getting totals for week ${weekOffset}:`, error);
    return 0; // Return 0 if error, so the menu still works
  }
}

// Lightweight function to get just variable expenses total
async function getVariableExpensesTotalForWeek(startDate, endDate) {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  
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
  
  let total = 0;
  
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
        
        result.results.forEach(page => {
          const amount = page.properties.Amount?.number || 0;
          if (amount > 0) {
            total += amount;
          }
        });
      }
    } catch (error) {
      console.error(`Error querying ${month} variable totals:`, error);
    }
  }
  
  return total;
}

// Lightweight function to get just fixed expenses total
async function getFixedExpensesTotalForWeek(startDate, endDate) {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const Basic_Fixed_Expenses_OkaneH_Transactions = process.env.Basic_Fixed_Expenses_OkaneH_Transactions;
  
  if (!Basic_Fixed_Expenses_OkaneH_Transactions) return 0;
  
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
      
      let total = 0;
      result.results.forEach(page => {
        const amount = page.properties.Amount?.number || 0;
        if (amount > 0) {
          total += amount;
        }
      });
      
      return total;
    }
  } catch (error) {
    console.error('Error querying fixed expenses totals:', error);
  }
  
  return 0;
}

// Helper function to format amounts in compact K format
function formatCompactAmount(amount) {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`.replace('.0M', 'M');
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`.replace('.0K', 'K');
  } else {
    return amount.toString();
  }
}

// Helper function to group transactions by day
function groupTransactionsByDay(transactions) {
  const groupedByDay = {};
  
  transactions.forEach(transaction => {
    if (!transaction.date) return;
    
    const dateStr = transaction.date; // Already in YYYY-MM-DD format
    
    if (!groupedByDay[dateStr]) {
      groupedByDay[dateStr] = [];
    }
    
    groupedByDay[dateStr].push(transaction);
  });
  
  return groupedByDay;
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
