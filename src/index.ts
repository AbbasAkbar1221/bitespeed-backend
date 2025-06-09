import express from 'express';
import * as dotenv from 'dotenv';
import { ContactService } from './contactService';
import { IdentifyRequest } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const contactService = new ContactService();

app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', message: 'Bitespeed Identity Reconciliation Service' });
});

// Main identify endpoint
app.post('/identify', async (req, res) => {
  try {
    const request: IdentifyRequest = req.body;
    
    // Validate request
    if (!request.email && !request.phoneNumber) {
      return res.status(400).json({ 
        error: 'At least one of email or phoneNumber is required' 
      });
    }

    const result = await contactService.identify(request);
    return res.json(result);
  } catch (err: any) {
    console.error('Error in /identify endpoint:', err.message || err);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
