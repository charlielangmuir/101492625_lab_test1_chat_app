require('dotenv').config();
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const GroupMessage = require('./models/GroupMessage');
const PrivateMessage = require('./models/PrivateMessage');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

const users = {};
const typingUsers = {};

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinRoom', ({ username, room }) => {
    socket.join(room);
    users[socket.id] = { username, room };
    
    socket.to(room).emit('userJoined', { 
      username, 
      message: `${username} has joined the room` 
    });

    const roomUsers = Object.values(users)
      .filter(u => u.room === room)
      .map(u => u.username);
    io.to(room).emit('roomUsers', roomUsers);
  });

  socket.on('leaveRoom', ({ username, room }) => {
    socket.leave(room);
    socket.to(room).emit('userLeft', { 
      username, 
      message: `${username} has left the room` 
    });
    
    const roomUsers = Object.values(users)
      .filter(u => u.room === room && u.username !== username)
      .map(u => u.username);
    io.to(room).emit('roomUsers', roomUsers);
  });

  socket.on('groupMessage', async (data) => {
    const { from_user, room, message } = data;
    
    try {
      const newMessage = new GroupMessage({
        from_user,
        room,
        message,
        date_sent: new Date()
      });
      await newMessage.save();

      io.to(room).emit('groupMessage', {
        from_user,
        message,
        date_sent: newMessage.date_sent
      });
    } catch (error) {
      console.error('Error saving group message:', error);
    }
  });

  socket.on('privateMessage', async (data) => {
    const { from_user, to_user, message } = data;
    
    try {
      const newMessage = new PrivateMessage({
        from_user,
        to_user,
        message,
        date_sent: new Date()
      });
      await newMessage.save();

      const recipientSocket = Object.keys(users).find(
        id => users[id].username === to_user
      );

      if (recipientSocket) {
        io.to(recipientSocket).emit('privateMessage', {
          from_user,
          to_user,
          message,
          date_sent: newMessage.date_sent
        });
      }
      socket.emit('privateMessage', {
        from_user,
        to_user,
        message,
        date_sent: newMessage.date_sent
      });
    } catch (error) {
      console.error('Error saving private message:', error);
    }
  });

  socket.on('typing', ({ username, room, isTyping }) => {
    socket.to(room).emit('typing', { username, isTyping });
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      const { username, room } = user;
      socket.to(room).emit('userLeft', { 
        username, 
        message: `${username} has disconnected` 
      });
      
      delete users[socket.id];
      
      const roomUsers = Object.values(users)
        .filter(u => u.room === room)
        .map(u => u.username);
      io.to(room).emit('roomUsers', roomUsers);
    }
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});