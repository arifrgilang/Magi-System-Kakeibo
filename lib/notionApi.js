// lib/notionApi.js - Notion API Functions with Better Error Logging
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

export async function addVariableExpenseToNotion(expenseData) {
  console.log('Adding to Notion:', expenseData);
  console.log('Database ID:', DATABASE_ID);
  
  try {
    const payload = {
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
    };

    console.log('Notion payload:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify(payload),
    });

    console.log('Notion response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('Successfully added to Notion:', result.id);
      return { success: true, id: result.id };
    } else {
      const errorText = await response.text();
      console.error('Notion API error response:', errorText);
      
      // Try to parse error details
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Notion API error details:', errorJson);
        return { success: false, error: errorJson.message || errorText };
      } catch {
        return { success: false, error: errorText };
      }
    }
  } catch (error) {
    console.error('Notion API fetch error:', error);
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
