// test-openai.js
const axios = require('axios');
require('dotenv').config();

axios.post(
  'https://api.openai.com/v1/chat/completions',
  {
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Hello!' }]
  },
  {
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  }
).then(res => {
  console.log(res.data);
}).catch(err => {
  console.error(err.response ? err.response.data : err);
});