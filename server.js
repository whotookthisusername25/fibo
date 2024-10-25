const express = require('express');
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Parse JSON requests
app.use(express.json());

// Multer setup for file uploads (handling audio files)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Save files in the 'uploads' directory
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename with timestamp
    }
});
const upload = multer({ storage: storage });

// Route to handle sending emergency alerts
app.post('/api/send-alert', (req, res) => {
    const { latitude, longitude } = req.body;

    // Emit a new alert event to all connected clients (i.e., the dashboard)
    io.emit('new-alert', { latitude, longitude, timestamp: new Date().toISOString() });

    res.json({ success: true, message: 'Alert sent successfully' });
});

// Route to upload audio recordings
app.post('/api/upload-recording', upload.single('file'), (req, res) => {
    const audioUrl = `/${req.file.path}`; // Create URL for the uploaded audio file
    
    // Emit the audio URL to all connected clients
    io.emit('new-recording', audioUrl);

    res.json({ success: true, message: 'Recording uploaded successfully', audioUrl });
});

// Serve static files (HTML, JS, CSS)
app.use(express.static('public'));
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Handle Socket.IO connections
io.on('connection', (socket) => {
    console.log('A client connected to the dashboard');

    socket.on('disconnect', () => {
        console.log('A client disconnected from the dashboard');
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
