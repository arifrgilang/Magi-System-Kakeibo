// lib/notionApi.js - Notion API Functions
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

export async function addVariableExpenseToNotion(expenseData) {
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
          'Transaction': {
            title: [
              {
                text: {
                  content: expenseData.description,
                },
              },
            ],
          },
          'Amount': {
            number: expenseData.amount,
          },
          'Category': {
            select: {
              name: expenseData.category,
            },
          },
          'Shopping Group': {
            select: {
              name: expenseData.shoppingGroup,
            },
          },
          'Date': {
            date: {
              start: expenseData.date,
            },
          },
          'Month': {
            select: {
              name: expenseData.month,
            },
          },
          'Account': {
            select: {
              name: expenseData.account,
            },
          },
        },
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Successfully added to Notion:', result.id);
      return { success: true, id: result.id };
    } else {
      const error = await response.text();
      console.error('Notion API error:', error);
      return { success: false, error };
    }
  } catch (error) {
    console.error('Notion API error:', error);
    return { success: false, error: error.message };
  }
}

// Placeholder functions for other transaction types
export async function addMoneyTransferToNotion(transferData) {
  // TODO: Implement money transfer logic
  console.log('Money transfer not implemented yet:', transferData);
  return { success: false, error: 'Not implemented yet' };
}

export async function addIncomeToNotion(incomeData) {
  // TODO: Implement income logic
  console.log('Income not implemented yet:', incomeData);
  return { success: false, error: 'Not implemented yet' };
}

export async function addFixedExpenseToNotion(expenseData) {
  // TODO: Implement fixed expense logic
  console.log('Fixed expense not implemented yet:', expenseData);
  return { success: false, error: 'Not implemented yet' };
}

export async function addSavingsToNotion(savingsData) {
  // TODO: Implement savings logic
  console.log('Savings not implemented yet:', savingsData);
  return { success: false, error: 'Not implemented yet' };
}
