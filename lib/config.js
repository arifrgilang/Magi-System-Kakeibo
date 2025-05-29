// lib/config.js - Configuration
export const CONFIG = {
  TRANSACTION_TYPES: {
    VARIABLE: 'variable',
    TRANSFER: 'transfer', 
    INCOME: 'income',
    FIXED: 'fixed',
    SAVINGS: 'savings'
  },
  
  MONTHS: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  
  CATEGORIES: ['Survival', 'Optional', 'Extra', 'Culture'],
  
  SHOPPING_GROUPS: [
    'Food', 'Transportation', 'Entertainment', 'Skin Care', 'Other', 
    'Talang', 'Normalize', 'Unexpected', 'Together Expense'
  ],
  
  ACCOUNTS: [
    'Cash', 'CC BNI', 'CC BCA', 'Brizzi', 'GoPay', 'OVO', 
    'ShopeePay', 'SeaBank', 'DANA', 'Jago', 'Krom', 'BCA', 
    'BNI', 'DANA+', 'eMas', 'Emas Fisik'
  ],

  MESSAGES: {
    WELCOME: "🤖 Welcome to your Expense Tracker!\n\nAny transactions?",
    HELP: "🤖 Expense Tracker Commands:\n\n• /start - Show main menu\n• /help - Show this help\n• /cancel - Cancel current operation\n\nUse the menu buttons to add expenses easily!",
    CANCELLED: "❌ Operation cancelled. Use /start to begin again.",
    MONTH_SELECT: "📅 Which month?",
    CATEGORY_SELECT: "📂 Select Category:",
    SHOPPING_GROUP_SELECT: "🛍️ Select Shopping Group:",
    ACCOUNT_SELECT: "🏦 Select Account:",
    AMOUNT_INPUT: "💰 Please type the amount (numbers only):",
    DESCRIPTION_INPUT: "📝 Please describe the transaction:",
    SUCCESS: "✅ Transaction added successfully!",
    ERROR: "❌ Something went wrong. Please try again."
  }
};
