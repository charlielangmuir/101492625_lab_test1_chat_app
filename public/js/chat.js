// Check if user is logged in
const user = JSON.parse(localStorage.getItem('user'));
if (!user) {
  window.location.href = 'login.html';
}

// Display username
document.getElementById('username').textContent = user.username;

const socket = io();

let currentRoom = '';
let typingTimeout;

const roomSelect = document.getElementById('roomSelect');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const roomName = document.getElementById('roomName');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const userList = document.getElementById('userList');
const typingIndicator = document.getElementById('typingIndicator');
const logoutBtn = document.getElementById('logoutBtn');

joinRoomBtn.addEventListener('click', () => {
  const room = roomSelect.value;
  if (!room) {
    alert('Please select a room');
    return;
  }
  
  if (currentRoom) {
    socket.emit('leaveRoom', { username: user.username, room: currentRoom });
  }
  
  currentRoom = room;
  socket.emit('joinRoom', { username: user.username, room });
  
  roomName.textContent = room.charAt(0).toUpperCase() + room.slice(1);
  messageInput.disabled = false;
  sendBtn.disabled = false;
  joinRoomBtn.style.display = 'none';
  leaveRoomBtn.style.display = 'inline-block';
  roomSelect.disabled = true;
  
  loadRoomMessages(room);
});

leaveRoomBtn.addEventListener('click', () => {
  if (currentRoom) {
    socket.emit('leaveRoom', { username: user.username, room: currentRoom });
    currentRoom = '';
    roomName.textContent = 'Select a Room';
    messageInput.disabled = true;
    sendBtn.disabled = true;
    joinRoomBtn.style.display = 'inline-block';
    leaveRoomBtn.style.display = 'none';
    roomSelect.disabled = false;
    chatMessages.innerHTML = '';
    userList.innerHTML = '';
  }
});

function sendMessage() {
  const message = messageInput.value.trim();
  if (message && currentRoom) {
    socket.emit('groupMessage', {
      from_user: user.username,
      room: currentRoom,
      message
    });
    messageInput.value = '';
    socket.emit('typing', { username: user.username, room: currentRoom, isTyping: false });
  }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

messageInput.addEventListener('input', () => {
  if (currentRoom) {
    socket.emit('typing', { username: user.username, room: currentRoom, isTyping: true });
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit('typing', { username: user.username, room: currentRoom, isTyping: false });
    }, 1000);
  }
});

socket.on('userJoined', (data) => {
  addSystemMessage(data.message);
});

socket.on('userLeft', (data) => {
  addSystemMessage(data.message);
});

socket.on('roomUsers', (users) => {
  userList.innerHTML = '';
  users.forEach(username => {
    const li = document.createElement('li');
    li.textContent = username;
    userList.appendChild(li);
  });
});

socket.on('groupMessage', (data) => {
  addMessage(data);
  scrollToBottom();
});

socket.on('typing', (data) => {
  if (data.username !== user.username) {
    if (data.isTyping) {
      typingIndicator.textContent = `${data.username} is typing...`;
      typingIndicator.style.display = 'block';
    } else {
      typingIndicator.style.display = 'none';
    }
  }
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('user');
  window.location.href = 'login.html';
});

function addMessage(data) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';
  
  const time = new Date(data.date_sent).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  messageDiv.innerHTML = `
    <div class="message-header">
      <span class="message-user">${data.from_user}</span>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-body">${escapeHtml(data.message)}</div>
  `;
  
  chatMessages.appendChild(messageDiv);
}

function addSystemMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'system-message';
  messageDiv.textContent = message;
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function loadRoomMessages(room) {
  try {
    const response = await fetch(`/api/messages/room/${room}`);
    const messages = await response.json();
    
    chatMessages.innerHTML = '';
    messages.forEach(msg => {
      addMessage(msg);
    });
    scrollToBottom();
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}