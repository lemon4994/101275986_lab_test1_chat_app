const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const GroupMessage = require('./models/GroupMessage');
const app = express();
const port = 3000;

const mongoUri = 'mongodb+srv://nicholas:user@free-cluster.okjmx.mongodb.net/chatapp?appName=Free-Cluster';

mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(express.json());
app.use(express.static(`public`));

app.get('/', (req, res) => {
  res.send('Hello to server');
});

app.post('/api/signup', async (req, res) => {
  try {
    const { username, firstname, lastname, password } = req.body;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with Mongoose model
    const newUser = new User({
      username,
      firstname,
      lastname,
      password: hashedPassword
    });

    await newUser.save();
    res.status(201).json({ message: 'User created successfully', userId: newUser._id });
  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle duplicate username error
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ error: 'Server error during signup' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.status(200).json({ 
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.get('/api/messages/:room', async (req, res) => {
  try {
    const { room } = req.params;
    const messages = await GroupMessage.find({ room }).sort({ date_sent: 1 }).limit(50);
    res.status(200).json(messages);
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ error: 'Server error fetching messages' });
  }
});

const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

const serverIO = require('socket.io')(server);

serverIO.on('connection', (socket) => {
  console.log('A user connected');
    socket.on('message', (data) => {
    console.log('Received message:', data);
    socket.emit('message', data);
    });

    socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
    });
    
    socket.on('roomMessage', async ({ room, message, username }) => {
    console.log(`Received message for room ${room} from ${username}: ${message}`);
    
    // Save message to database
    try {
      const newMessage = new GroupMessage({
        from_user: username || socket.id,
        room,
        message
      });
      await newMessage.save();
      console.log('Message saved to database');
    } catch (error) {
      console.error('Error saving message:', error);
    }
    
    socket.broadcast.to(room).emit('roomMessage', { sender: username || socket.id, message });
    });

    socket.on('leaveRoom', (room) => {
    socket.leave(room);
    console.log(`User left room: ${room}`);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});