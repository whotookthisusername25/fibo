const express = require('express');
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid'); // For unique file names

// Load environment variables
dotenv.config();

// Initialize Express app and server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Replace escaped newlines
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});
const bucket = admin.storage().bucket();

// Middleware for JSON parsing
app.use(express.json());

// Configure multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route to send emergency alerts
app.post('/api/send-alert', (req, res) => {
  const { latitude, longitude } = req.body;

  // Emit alert data to all clients
  io.emit('new-alert', { latitude, longitude, timestamp: new Date().toISOString() });

  res.json({ success: true, message: 'Alert sent successfully' });
});

// Route to upload audio recordings to Firebase Storage
app.post('/api/upload-recording', upload.single('file'), async (req, res) => {
  const file = req.file;

  // Check if file was uploaded
  if (!file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  // Generate unique filename
  const fileName = `${uuidv4()}.webm`;
  const fileUpload = bucket.file(fileName);

  // Stream the file buffer to Firebase Storage
  const blobStream = fileUpload.createWriteStream({
    metadata: {
      contentType: file.mimetype,
    },
  });

  blobStream.on('error', (err) => {
    console.error('Error uploading to Firebase:', err);
    res.status(500).json({ success: false, message: 'Failed to upload recording' });
  });

  blobStream.on('finish', async () => {
    // Get the URL of the uploaded audio file
    const audioUrl = await fileUpload.getSignedUrl({
      action: 'read',
      expires: '03-01-2030', // Set an expiration date for the URL
    });

    // Emit the audio URL to clients
    io.emit('new-recording', audioUrl[0]);

    res.json({ success: true, message: 'Recording uploaded successfully', audioUrl: audioUrl[0] });
  });

  blobStream.end(file.buffer);
});

// Serve static files from 'public' directory
app.use(express.static('public'));

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log('A client connected to the dashboard');

  socket.on('disconnect', () => {
    console.log('A client disconnected from the dashboard');
  });
});

// Start the server on specified port
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
