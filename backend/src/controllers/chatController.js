const pool = require('../db');
const axios = require('axios');

const chatController = {
    checkStatus: async (req, res) => {
        try {
            // Try to connect to Ollama using the generate endpoint with a simple test
            await axios.post('http://127.0.0.1:11434/api/generate', {
                model: 'llama3.1:8b',
                prompt: 'test',
                stream: false
            });
            console.log('✅ Ollama connection successful');
            res.json({ status: 'online' });
        } catch (error) {
            console.error('❌ Error checking Ollama status:', error.message);
            if (error.response) {
                // If we get a response from Ollama, it means the service is running
                console.log('✅ Ollama service is running');
                res.json({ status: 'online' });
            } else {
                console.log('❌ Ollama service is not responding');
                res.status(503).json({ status: 'offline' });
            }
        }
    },

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

            // 3. Construct the full prompt for the LLM with formatting guidelines
            const fullPrompt = `You are a helpful Kanban board assistant. Your responses should be:
1. Concise and direct
2. Focused on the specific question
3. Include relevant numbers and statistics when applicable
4. Use bullet points for multiple items with line breaks between each point
5. Format numbers and percentages clearly

Here is the current state of the Kanban board tasks:
${tasksContext}

User query: ${prompt}

Based on the tasks provided, please answer the user's question following the response structure guidelines.`;

            console.log('Sending prompt to Ollama...');
            // 4. Send the combined prompt to Ollama LLM
            const ollamaResponse = await axios.post('http://127.0.0.1:11434/api/generate', {
                model: 'llama3.1:8b',
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