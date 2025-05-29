// api/telegram.js - Main Handler
import { handleTextMessage, handleCallbackQuery } from '../lib/messageHandlers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, callback_query } = req.body;
    
    if (callback_query) {
      await handleCallbackQuery(callback_query);
    } else if (message?.text) {
      await handleTextMessage(message);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
