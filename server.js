const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const app = express();
const port = 3000;

const mongoUri = 'mongodb+srv://nicholas:user@free-cluster.okjmx.mongodb.net/?appName=Free-Cluster';
const client = new MongoClient(mongoUri);

let db;
client.connect().then(() => {
  db = client.db('chatapp');
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

app.use(express.json());
app.use(express.static(`public`));

app.get('/', (req, res) => {
  res.send('Hello to server');
});

app.post('/api/signup', async (req, res) => {
  try {
    const { username, firstname, lastname, password } = req.body;

    // Check if username already exists
    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user document
    const newUser = {
      username,
      firstname,
      lastname,
      password: hashedPassword,
      createdon: new Date()
    };

    // Insert into database
    const result = await db.collection('users').insertOne(newUser);
    res.status(201).json({ message: 'User created successfully', userId: result.insertedId });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await db.collection('users').findOne({ username });
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
    
    socket.on('roomMessage', ({ room, message }) => {
    console.log(`Received message for room ${room}: ${message}`);
    socket.broadcast.to(room).emit('roomMessage', { sender: socket.id, message });
    });

    socket.on('leaveRoom', (room) => {
    socket.leave(room);
    console.log(`User left room: ${room}`);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});