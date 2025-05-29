// api/telegram.js - Main webhook handler for Vercel
export default async function handler(req, res) {
  // Only allow POST requests from Telegram
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    
    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const userId = message.from.id;

    console.log(`Received message: "${text}" from user ${userId}`);

    // Handle different commands
    if (text.startsWith('/start')) {
      await sendTelegramMessage(chatId, 
        "Welcome to your Expense Tracker! 🤖💰\n\n" +
        "Send me your expenses like:\n" +
        "• 5000 coffee\n" +
        "• lunch 15000\n" +
        "• 50000 groceries\n\n" +
        "I'll help you track them in Notion!"
      );
    } else if (text.startsWith('/help')) {
      await sendTelegramMessage(chatId,
        "How to use:\n\n" +
        "💸 Log expense: '5000 coffee' or 'lunch 15000'\n" +
        "📊 Get summary: /summary\n" +
        "❓ Help: /help\n\n" +
        "Just send amount + description and I'll handle the rest!"
      );
    } else if (text.startsWith('/summary')) {
      await sendTelegramMessage(chatId, "📊 Summary feature coming soon!");
    } else {
      // Try to parse expense
      const expense = parseExpense(text);
      
      if (expense) {
        // Add to Notion
        const success = await addToNotion(expense);
        
        if (success) {
          await sendTelegramMessage(chatId, 
            `✅ Added: ${expense.amount.toLocaleString()} for ${expense.description}\n` +
            `Category: ${expense.category}`
          );
        } else {
          await sendTelegramMessage(chatId, 
            "❌ Sorry, couldn't save to Notion. Please try again."
          );
        }
      } else {
        await sendTelegramMessage(chatId,
          "🤔 I couldn't understand that. Try:\n" +
          "• 5000 coffee\n" +
          "• lunch 15000\n" +
          "• 50000 groceries"
        );
      }
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Parse expense from text
function parseExpense(text) {
  // Try different patterns
  const patterns = [
    /^(\d+)\s+(.+)$/,  // "5000 coffee"
    /^(.+?)\s+(\d+)$/,  // "coffee 5000"
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const [, first, second] = match;
      
      // Check which one is the number
      const amount = parseInt(first) || parseInt(second);
      const description = parseInt(first) ? second : first;
      
      if (amount && description) {
        return {
          amount,
          description: description.trim(),
          category: categorizeExpense(description),
          date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
        };
      }
    }
  }
  
  return null;
}

// Simple categorization
function categorizeExpense(description) {
  const desc = description.toLowerCase();
  
  if (desc.includes('coffee') || desc.includes('lunch') || desc.includes('dinner') || 
      desc.includes('food') || desc.includes('restaurant') || desc.includes('eat')) {
    return 'Food & Drink';
  }
  if (desc.includes('transport') || desc.includes('taxi') || desc.includes('bus') || 
      desc.includes('train') || desc.includes('grab') || desc.includes('gojek')) {
    return 'Transportation';
  }
  if (desc.includes('groceries') || desc.includes('supermarket') || desc.includes('shopping')) {
    return 'Shopping';
  }
  if (desc.includes('movie') || desc.includes('game') || desc.includes('entertainment')) {
    return 'Entertainment';
  }
  
  return 'Other';
}

// Send message to Telegram
async function sendTelegramMessage(chatId, text) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    }),
  });

  return response.ok;
}

// Add expense to Notion
async function addToNotion(expense) {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DATABASE_ID = process.env.NOTION_DATABASE_ID;

  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: {
          database_id: DATABASE_ID,
        },
        properties: {
          // Adjust these property names to match your Notion database
          'Description': {
            title: [
              {
                text: {
                  content: expense.description,
                },
              },
            ],
          },
          'Amount': {
            number: expense.amount,
          },
          'Category': {
            select: {
              name: expense.category,
            },
          },
          'Date': {
            date: {
              start: expense.date,
            },
          },
        },
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Notion API error:', error);
    return false;
  }
}
