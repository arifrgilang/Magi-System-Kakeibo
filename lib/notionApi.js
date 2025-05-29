// lib/notionApi.js - Updated Notion API with Fixed Expenses Support
const NOTION_TOKEN = process.env.NOTION_TOKEN;

// Master lookup databases for Variable Expenses (shared across all months)
const Variable_Expenses_OkaneH_Shopping_Group = process.env.Variable_Expenses_OkaneH_Shopping_Group;
const Variable_Expenses_OkaneH_Month = process.env.Variable_Expenses_OkaneH_Month;

// Fixed Expenses databases
const Fixed_Expenses_OkaneH_Type = process.env.Fixed_Expenses_OkaneH_Type;
const Fixed_Expenses_OkaneH_Month = process.env.Fixed_Expenses_OkaneH_Month;
const Basic_Fixed_Expenses_OkaneH_Transactions = process.env.Basic_Fixed_Expenses_OkaneH_Transactions;
const Basic_Fixed_Expenses_OkaneH_Items = process.env.Basic_Fixed_Expenses_OkaneH_Items;

// Income databases
const Income_OkaneH_Transactions = process.env.Income_OkaneH_Transactions;
const Income_OkaneH_Group = process.env.Income_OkaneH_Group;
const Income_OkaneH_Month = process.env.Income_OkaneH_Month;

// Transfer database
const Accounts_OkaneH_Transfer = process.env.Accounts_OkaneH_Transfer;

// Global databases (shared across all transaction types)
const Accounts_OkaneH_Account = process.env.Accounts_OkaneH_Account;

// Monthly transaction databases for Variable Expenses
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

// Monthly categories databases for Variable Expenses
const monthlyCategoriesDatabases = {
  'January': process.env.Variable_Expenses_OkaneH_Categories_January,
  'February': process.env.Variable_Expenses_OkaneH_Categories_February,
  'March': process.env.Variable_Expenses_OkaneH_Categories_March,
  'April': process.env.Variable_Expenses_OkaneH_Categories_April,
  'May': process.env.Variable_Expenses_OkaneH_Categories_May,
  'June': process.env.Variable_Expenses_OkaneH_Categories_June,
  'July': process.env.Variable_Expenses_OkaneH_Categories_July,
  'August': process.env.Variable_Expenses_OkaneH_Categories_August,
  'September': process.env.Variable_Expenses_OkaneH_Categories_September,
  'October': process.env.Variable_Expenses_OkaneH_Categories_October,
  'November': process.env.Variable_Expenses_OkaneH_Categories_November,
  'December': process.env.Variable_Expenses_OkaneH_Categories_December,
};

// DEBUG FUNCTION - Add back for Transfer debugging
export async function debugDatabaseProperties(databaseId) {
  try {
    console.log(`Debugging database: ${databaseId}`);
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log('=== DATABASE PROPERTIES ===');
      console.log('Available properties:', Object.keys(result.properties));
      
      // Show property details
      for (const [propName, propDetails] of Object.entries(result.properties)) {
        console.log(`"${propName}": ${propDetails.type}`);
      }
      console.log('=== END DEBUG ===');
      
      return result.properties;
    } else {
      const error = await response.text();
      console.error('Error fetching database:', error);
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

export async function addVariableExpenseToNotion(expenseData) {
  console.log('Adding to Notion:', expenseData);
  
  // Get the correct monthly database IDs
  const monthlyDatabaseId = monthlyDatabases[expenseData.month];
  const monthlyCategoriesId = monthlyCategoriesDatabases[expenseData.month];
  
  if (!monthlyDatabaseId) {
    console.error(`No transactions database found for month: ${expenseData.month}`);
    return { success: false, error: `No transactions database configured for ${expenseData.month}` };
  }
  
  if (!monthlyCategoriesId) {
    console.error(`No categories database found for month: ${expenseData.month}`);
    return { success: false, error: `No categories database configured for ${expenseData.month}` };
  }
  
  console.log(`Writing to ${expenseData.month} transactions database: ${monthlyDatabaseId}`);
  console.log(`Using ${expenseData.month} categories database: ${monthlyCategoriesId}`);
  
  try {
    // Find relation IDs for each field - using monthly categories database
    const categoryId = await findRelationId(monthlyCategoriesId, expenseData.category, 'Category');
    const shoppingGroupId = await findRelationId(Variable_Expenses_OkaneH_Shopping_Group, expenseData.shoppingGroup, 'Shopping Group');
    const monthId = await findRelationId(Variable_Expenses_OkaneH_Month, expenseData.month, 'Month');
    const accountId = Accounts_OkaneH_Account ? await findRelationId(Accounts_OkaneH_Account, expenseData.account, 'Account') : null;

    const payload = {
      parent: {
        database_id: monthlyDatabaseId, // Write to the specific monthly database
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
        'Date': {
          date: {
            start: expenseData.date,
          },
        },
        'Category': {
          relation: categoryId ? [{ id: categoryId }] : []
        },
        'Shopping Group': {
          relation: shoppingGroupId ? [{ id: shoppingGroupId }] : []
        },
        'Month': {
          relation: monthId ? [{ id: monthId }] : []
        },
      },
    };

    // Add Account relation if database exists
    if (accountId && Accounts_OkaneH_Account) {
      payload.properties['Account'] = {
        relation: [{ id: accountId }]
      };
    }

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
      console.log(`Successfully added to ${expenseData.month} database:`, result.id);
      return { success: true, id: result.id };
    } else {
      const errorText = await response.text();
      console.error('Notion API error response:', errorText);
      
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

export async function addBasicFixedExpenseToNotion(expenseData) {
  console.log('Adding Basic Fixed Expense to Notion:', expenseData);
  
  if (!Basic_Fixed_Expenses_OkaneH_Transactions) {
    console.error('Basic Fixed Expenses Transactions database not configured');
    return { success: false, error: 'Basic Fixed Expenses Transactions database not configured' };
  }
  
  try {
    // Find relation IDs for each field
    const monthId = Fixed_Expenses_OkaneH_Month ? await findRelationId(Fixed_Expenses_OkaneH_Month, expenseData.month, 'Month') : null;
    const itemId = Basic_Fixed_Expenses_OkaneH_Items ? await findRelationId(Basic_Fixed_Expenses_OkaneH_Items, expenseData.item, 'Basic Fixed Expenses Items') : null;
    const accountId = Accounts_OkaneH_Account ? await findRelationId(Accounts_OkaneH_Account, expenseData.account, 'Account') : null;

    const payload = {
      parent: {
        database_id: Basic_Fixed_Expenses_OkaneH_Transactions,
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
        'Date': {
          date: {
            start: expenseData.date,
          },
        },
      },
    };

    // Add relations if databases exist - using EXACT column names from debug output
    if (monthId && Fixed_Expenses_OkaneH_Month) {
      payload.properties['Month'] = {
        relation: [{ id: monthId }]
      };
    }

    if (itemId && Basic_Fixed_Expenses_OkaneH_Items) {
      payload.properties['Basic Fixed Expenses Item'] = {  // FIXED: singular "Item" not "Items"
        relation: [{ id: itemId }]
      };
    }

    if (accountId && Accounts_OkaneH_Account) {
      payload.properties['Account'] = {
        relation: [{ id: accountId }]
      };
    }

    console.log('Basic Fixed Expense Notion payload:', JSON.stringify(payload, null, 2));

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
      console.log('Successfully added Basic Fixed Expense:', result.id);
      return { success: true, id: result.id };
    } else {
      const errorText = await response.text();
      console.error('Notion API error response:', errorText);
      
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

// Function to find relation ID by searching the related database
async function findRelationId(databaseId, searchValue, propertyName = 'title') {
  if (!databaseId || !searchValue) {
    console.log(`Missing database ID or search value: ${databaseId}, ${searchValue}`);
    return null;
  }

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
          property: propertyName,
          [propertyName === 'title' ? 'title' : 'rich_text']: {
            equals: searchValue
          }
        }
      })
    });

    if (response.ok) {
      const result = await response.json();
      if (result.results && result.results.length > 0) {
        console.log(`Found relation ID for "${searchValue}": ${result.results[0].id}`);
        return result.results[0].id;
      } else {
        console.log(`No relation found for "${searchValue}" in database ${databaseId}`);
        return null;
      }
    } else {
      const error = await response.text();
      console.error(`Error searching relation database ${databaseId}:`, error);
      return null;
    }
  } catch (error) {
    console.error(`Error finding relation ID:`, error);
    return null;
  }
}

export async function addIncomeToNotion(incomeData) {
  console.log('Adding Income to Notion:', incomeData);
  
  if (!Income_OkaneH_Transactions) {
    console.error('Income Transactions database not configured');
    return { success: false, error: 'Income Transactions database not configured' };
  }
  
  try {
    // Find relation IDs for each field
    const monthId = Income_OkaneH_Month ? await findRelationId(Income_OkaneH_Month, incomeData.month, 'Month') : null;
    const groupId = Income_OkaneH_Group ? await findRelationId(Income_OkaneH_Group, incomeData.incomeGroup, 'Income Group') : null;
    const accountId = Accounts_OkaneH_Account ? await findRelationId(Accounts_OkaneH_Account, incomeData.account, 'Account') : null;

    const payload = {
      parent: {
        database_id: Income_OkaneH_Transactions,
      },
      properties: {
        'Transaction': {
          title: [
            {
              text: {
                content: incomeData.description,
              },
            },
          ],
        },
        'Amount': {
          number: incomeData.amount,
        },
        'Date': {
          date: {
            start: incomeData.date,
          },
        },
      },
    };

    // Add relations if databases exist
    if (monthId && Income_OkaneH_Month) {
      payload.properties['Month'] = {
        relation: [{ id: monthId }]
      };
    }

    if (groupId && Income_OkaneH_Group) {
      payload.properties['Income Group'] = {
        relation: [{ id: groupId }]
      };
    }

    if (accountId && Accounts_OkaneH_Account) {
      payload.properties['Account'] = {
        relation: [{ id: accountId }]
      };
    }

    console.log('Income Notion payload:', JSON.stringify(payload, null, 2));

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
      console.log('Successfully added Income:', result.id);
      return { success: true, id: result.id };
    } else {
      const errorText = await response.text();
      console.error('Notion API error response:', errorText);
      
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

export async function addTransferToNotion(transferData) {
  console.log('Adding Transfer to Notion:', transferData);
  
  if (!Accounts_OkaneH_Transfer) {
    console.error('Transfer database not configured');
    return { success: false, error: 'Transfer database not configured' };
  }
  
  // DEBUG - Check database properties first
  await debugDatabaseProperties(Accounts_OkaneH_Transfer);
  
  try {
    // Find relation IDs for accounts
    const fromAccountId = Accounts_OkaneH_Account ? await findRelationId(Accounts_OkaneH_Account, transferData.fromAccount, 'Account') : null;
    const toAccountId = Accounts_OkaneH_Account ? await findRelationId(Accounts_OkaneH_Account, transferData.toAccount, 'Account') : null;

    // Calculate total amount (amountOut + admin/tax)
    const totalAmount = transferData.amountOut + (transferData.adminTax || 0);
    // Amount In is the same as Amount Out (the actual transfer amount)
    const amountIn = transferData.amountOut;

    const payload = {
      parent: {
        database_id: Accounts_OkaneH_Transfer,
      },
      properties: {
        'Transactions': {
          title: [
            {
              text: {
                content: transferData.description,
              },
            },
          ],
        },
        'Date': {
          date: {
            start: transferData.date,
          },
        },
        'Type': {
          select: {
            name: transferData.transferType
          }
        },
        'Amount (Out)': {
          number: transferData.amountOut,
        },
        'Amount (In)': {
          number: amountIn,
        },
        'Total Amount (Out)': {
          number: totalAmount,
        },
      },
    };

    // Add admin/tax fee if exists
    if (transferData.adminTax && transferData.adminTax > 0) {
      payload.properties['Admin or Tax'] = {
        number: transferData.adminTax
      };
    }

    // Add account relations if databases exist
    if (fromAccountId && Accounts_OkaneH_Account) {
      payload.properties['Account (Out)'] = {
        relation: [{ id: fromAccountId }]
      };
    }

    if (toAccountId && Accounts_OkaneH_Account) {
      payload.properties['Account (In)'] = {
        relation: [{ id: toAccountId }]
      };
    }

    console.log('Transfer Notion payload:', JSON.stringify(payload, null, 2));

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
      console.log('Successfully added Transfer:', result.id);
      return { success: true, id: result.id };
    } else {
      const errorText = await response.text();
      console.error('Notion API error response:', errorText);
      
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
export async function addFixedExpenseToNotion(expenseData) {
  console.log('Fixed expense not implemented yet:', expenseData);
  return { success: false, error: 'Not implemented yet' };
}

export async function addSavingsToNotion(savingsData) {
  console.log('Savings not implemented yet:', savingsData);
  return { success: false, error: 'Not implemented yet' };
}
