// c:\xampp\htdocs\invoice_generator\project\app\api\parse-invoice.js

const express = require('express');
const { Configuration, OpenAIApi } = require('openai');
const router = express.Router();

// POST /api/parse-invoice
router.post('/api/parse-invoice', async (req, res) => {
  const { message } = req.body;
  const prompt = `
Extract the following invoice fields from this message and return as JSON:
client_name, company_name, client_address, client_email, period, project_code, items, payment, additional_charge, terms, bank_details.
The \"items\" field should be an array of objects, each with \"description\", \"quantity\", and \"price\".
Message: ${message}
`;

  try {
    const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    const content = completion.data.choices[0].message.content;
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        res.json(JSON.parse(match[0]));
      } catch (e) {
        res.status(400).json({ error: 'Invalid JSON from AI.' });
      }
    } else {
      res.status(400).json({ error: 'Could not parse invoice data.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'OpenAI API error', details: error.message });
  }
});

module.exports = router;
