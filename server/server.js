// Full server implementation for feedback widget with Nillion SecretVault
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { SecretVaultWrapper } from 'secretvaults';
import { createClient } from '@supabase/supabase-js';

// Initialize environment
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Get current directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(
  cors({
    origin: [
      'https://7424ece7.feedback-widget-u8y.pages.dev',
      'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(bodyParser.json({ limit: '10mb' })); // Increased limit for screenshots
app.use(express.static(path.join(__dirname, '../public')));

// Log environment variables (without secrets)
console.log('Environment:');
console.log('- PORT:', process.env.PORT);
console.log('- NILLION_SCHEMA_ID:', process.env.NILLION_SCHEMA_ID);
console.log('- NILLION_ORG_DID exists:', !!process.env.NILLION_ORG_DID);
console.log('- NILLION_SECRET_KEY exists:', !!process.env.NILLION_SECRET_KEY);
console.log('- SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log(
  '- SUPABASE_SERVICE_KEY exists:',
  !!process.env.SUPABASE_SERVICE_KEY
);

// Initialize Supabase client
let supabase;
try {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('Missing Supabase credentials');
  }
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  console.log('Supabase client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Supabase client:', error.message);
  console.error(
    'Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in your .env file'
  );
  process.exit(1);
}

// Nillion SecretVault Configuration
const orgConfig = {
  orgCredentials: {
    secretKey: process.env.NILLION_SECRET_KEY,
    orgDid: process.env.NILLION_ORG_DID,
  },
  nodes: [
    {
      url: 'https://nildb-nx8v.nillion.network',
      did: 'did:nil:testnet:nillion1qfrl8nje3nvwh6cryj63mz2y6gsdptvn07nx8v',
    },
    {
      url: 'https://nildb-p3mx.nillion.network',
      did: 'did:nil:testnet:nillion1uak7fgsp69kzfhdd6lfqv69fnzh3lprg2mp3mx',
    },
    {
      url: 'https://nildb-rugk.nillion.network',
      did: 'did:nil:testnet:nillion1kfremrp2mryxrynx66etjl8s7wazxc3rssrugk',
    },
  ],
};

// Initialize SecretVault collections cache
const secretVaultCollections = {};

// Helper to get or initialize a SecretVault collection
async function getSecretVaultCollection(siteId) {
  // If we've already initialized this collection, return it
  if (secretVaultCollections[siteId]) {
    return secretVaultCollections[siteId];
  }

  // Get site configuration from Supabase
  const { data, error } = await supabase
    .from('app_ids')
    .select('*')
    .eq('app_id', siteId)
    .single();

  if (error || !data) {
    throw new Error('Site not found');
  }

  // Initialize a new collection
  try {
    console.log(
      `Initializing SecretVault collection for site ${siteId} with schema ${data.schema_id}`
    );
    const collection = new SecretVaultWrapper(
      orgConfig.nodes,
      orgConfig.orgCredentials,
      data.schema_id
    );
    await collection.init();

    // Cache the collection for future use
    secretVaultCollections[siteId] = collection;
    console.log(`Successfully initialized collection for ${siteId}`);

    return collection;
  } catch (error) {
    console.error('Failed to initialize SecretVault collection:', error);
    throw error;
  }
}

// API Routes

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Widget configuration endpoint
app.get('/api/widget/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    console.log('Received request for appId:', appId);
    console.log('Request headers:', req.headers);

    // Query the app_ids table for the specific app_id
    const { data, error } = await supabase
      .from('app_ids')
      .select('*')
      .eq('app_id', appId)
      .single();

    if (error) {
      console.error('Error fetching app configuration:', error);
      return res
        .status(500)
        .json({ error: 'Failed to fetch app configuration' });
    }

    if (!data) {
      console.log('No configuration found for appId:', appId);
      return res.status(404).json({ error: 'App configuration not found' });
    }

    console.log('Found configuration:', data);

    // Return the configuration in the expected format
    res.json({
      config: {
        ...data.config,
        siteId: data.app_id,
        schemaId: data.config.schema_id,
      },
    });
  } catch (error) {
    console.error('Error in widget configuration endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Feedback submission endpoint
app.post('/api/feedback', async (req, res) => {
  try {
    const { siteId, rating, message, email, screenshot, metadata } = req.body;
    console.log('Received feedback submission:', req.body);

    console.log(`Received feedback submission for site ${siteId}`);

    if (!siteId) {
      return res.status(400).json({ error: 'Site ID is required' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get collection for this site
    try {
      const collection = await getSecretVaultCollection(siteId);

      // Prepare the feedback data with encrypted fields using %allot
      const feedbackData = [
        {
          // Public fields (plaintext)
          rating: rating || '',
          message: message,
          url: metadata?.url || '',
          timestamp: new Date().toISOString(),
          browser: metadata?.browser || '',
          platform: metadata?.platform || '',
          language: metadata?.language || '',

          // Private fields (marked with %allot for encryption)
          email: { '%allot': email || '' },
          screenshot: { '%allot': screenshot || '' },
          userAgent: { '%allot': metadata.userAgent || '' },
          screenSize: { '%allot': metadata.screenSize || '' },
          referrer: { '%allot': metadata.referrer || '' },
        },
      ];

      console.log('Submitting feedback to Nillion SecretVault...');

      // Write the feedback to SecretVault nodes
      const result = await collection.writeToNodes(feedbackData);

      // Extract the created record IDs
      const recordIds = [
        ...new Set(result.flatMap((item) => item.data.created)),
      ];

      console.log('Feedback submitted successfully. Record IDs:', recordIds);

      res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        recordIds: recordIds,
      });
    } catch (error) {
      console.error('Error with SecretVault:', error);
      return res
        .status(500)
        .json({ error: 'Error processing feedback: ' + error.message });
    }
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint to view all available feedback
app.get('/api/debug/feedback/:siteId', async (req, res) => {
  try {
    const siteId = req.params.siteId;

    // Verify site exists in Supabase
    const { data, error } = await supabase
      .from('app_ids')
      .select('*')
      .eq('app_id', siteId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Site not found' });
    }

    console.log(`Retrieving feedback for site ${siteId}...`);
    const collection = await getSecretVaultCollection(siteId);

    // When reading from SecretVault nodes, it automatically decrypts the %share fields
    const feedbackData = await collection.readFromNodes({});

    console.log(`Retrieved ${feedbackData.length} feedback entries`);

    res.json({ feedback: feedbackData });
  } catch (error) {
    console.error('Error fetching debug feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve the example page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/example.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to view the example page`);
  console.log(`Available endpoints:`);
  console.log(`- GET /health - Basic health check`);
  console.log(`- GET /api/widget/:siteId - Get widget configuration`);
  console.log(`- POST /api/feedback - Submit feedback`);
  console.log(`- GET /api/debug/feedback/:siteId - View feedback for a site`);
});
