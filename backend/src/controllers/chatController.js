const pool = require('../db');
const axios = require('axios');

const chatController = {
    handleChat: async (req, res) => {
        console.log('🔍 handleChat endpoint hit');
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        try {
            // 1. Fetch all tasks from the database
            console.log('📊 Fetching all tasks for LLM context...');
            const tasksResult = await pool.query('SELECT * FROM tasks ORDER BY status, position ASC');
            const tasks = tasksResult.rows;
            console.log(`✅ Found ${tasks.length} tasks for LLM context.`);

            // 2. Format tasks into a readable string for the LLM
            const tasksContext = tasks.map(task => 
                `ID: ${task.id}, Title: ${task.title}, Description: ${task.description}, Status: ${task.status}, Priority: ${task.priority}`
            ).join('\n');

            // 3. Construct the full prompt for the LLM
            const fullPrompt = `You are a helpful Kanban board assistant. Here is the current state of the Kanban board tasks:\n\n${tasksContext}\n\nUser query: ${prompt}\n\nBased on the tasks provided, please answer the user's question concisely and helpfully.`;

            console.log('Sending prompt to Ollama...');
            // 4. Send the combined prompt to Ollama LLM
            const ollamaResponse = await axios.post('http://127.0.0.1:11434/api/generate', {
                model: 'llama3',
                prompt: fullPrompt,
                stream: false,
            });

            const llmResponse = ollamaResponse.data.response;
            console.log('✅ Ollama response received.');
            res.json({ response: llmResponse });

        } catch (error) {
            console.error('❌ Error in handleChat:', error.message);
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('Ollama Error Response Data:', error.response.data);
                console.error('Ollama Error Response Status:', error.response.status);
                console.error('Ollama Error Response Headers:', error.response.headers);
                res.status(500).json({ error: 'Failed to get response from LLM', details: error.response.data });
            } else if (error.request) {
                // The request was made but no response was received
                console.error('No response received from Ollama. Request:', error.request);
                res.status(500).json({ error: 'No response from LLM (Ollama server might be down)', details: error.message });
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Error setting up Ollama request:', error.message);
                res.status(500).json({ error: 'Internal server error', details: error.message });
            }
        }
    }
};

module.exports = chatController; 