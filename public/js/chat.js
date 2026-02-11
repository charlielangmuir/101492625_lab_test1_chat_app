const user = JSON.parse(localStorage.getItem('user'));
if (!user) {
  window.location.href = 'login.html';
}

document.getElementById('username').textContent = `Logged in as: ${user.username}`;

const socket = io();

let currentRoom = '';
let typingTimeout = null;

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
    alert('Please select a room first');
    return;
  }
  
  if (currentRoom) {
    socket.emit('leaveRoom', { 
      username: user.username, 
      room: currentRoom 
    });
  }
  
  currentRoom = room;
  socket.emit('joinRoom', { 
    username: user.username, 
    room: room 
  });
  
  roomName.textContent = formatRoomName(room);
  messageInput.disabled = false;
  sendBtn.disabled = false;
  joinRoomBtn.style.display = 'none';
  leaveRoomBtn.style.display = 'inline-block';
  roomSelect.disabled = true;
  
  chatMessages.innerHTML = '';
  loadRoomMessages(room);
});

leaveRoomBtn.addEventListener('click', () => {
  if (currentRoom) {
    socket.emit('leaveRoom', { 
      username: user.username, 
      room: currentRoom 
    });
    
    currentRoom = '';
    roomName.textContent = 'Select a Room';
    messageInput.disabled = true;
    sendBtn.disabled = true;
    messageInput.value = '';
    joinRoomBtn.style.display = 'inline-block';
    leaveRoomBtn.style.display = 'none';
    roomSelect.disabled = false;
    chatMessages.innerHTML = '';
    userList.innerHTML = '';
    typingIndicator.style.display = 'none';
  }
});

function sendMessage() {
  const message = messageInput.value.trim();
  
  if (message && currentRoom) {
    socket.emit('groupMessage', {
      from_user: user.username,
      room: currentRoom,
      message: message
    });
    
    messageInput.value = '';
    
    socket.emit('typing', { 
      username: user.username, 
      room: currentRoom, 
      isTyping: false 
    });
  }
}

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

messageInput.addEventListener('input', () => {
  if (currentRoom && messageInput.value.trim()) {
    socket.emit('typing', { 
      username: user.username, 
      room: currentRoom, 
      isTyping: true 
    });
    
    clearTimeout(typingTimeout);
    
    typingTimeout = setTimeout(() => {
      socket.emit('typing', { 
        username: user.username, 
        room: currentRoom, 
        isTyping: false 
      });
    }, 1000);
  } else {
    socket.emit('typing', { 
      username: user.username, 
      room: currentRoom, 
      isTyping: false 
    });
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
    
    if (username === user.username) {
      li.style.fontWeight = 'bold';
      li.style.color = '#667eea';
      li.title = 'You';
    } else {
      li.style.cursor = 'pointer';
      li.title = 'Click for options';
      
      li.addEventListener('click', () => {
        showPrivateMessageOptions(username);
      });
      
      li.addEventListener('mouseenter', () => {
        li.style.backgroundColor = '#d0d0d0';
      });
      li.addEventListener('mouseleave', () => {
        li.style.backgroundColor = 'white';
      });
    }
    
    userList.appendChild(li);
  });
});

socket.on('groupMessage', (data) => {
  addMessage(data);
  scrollToBottom();
});

socket.on('privateMessage', (data) => {
  addPrivateMessage(data);
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

socket.on('error', (data) => {
  console.error('Socket error:', data);
  addSystemMessage(`Error: ${data.message}`);
});

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  addSystemMessage('Connection lost. Trying to reconnect...');
});

socket.on('reconnect', () => {
  console.log('Reconnected to server');
  addSystemMessage('Reconnected!');
  
  if (currentRoom) {
    socket.emit('joinRoom', { 
      username: user.username, 
      room: currentRoom 
    });
  }
});

logoutBtn.addEventListener('click', () => {
  if (currentRoom) {
    socket.emit('leaveRoom', { 
      username: user.username, 
      room: currentRoom 
    });
  }
  
  localStorage.removeItem('user');
  
  window.location.href = 'login.html';
});

function addMessage(data) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';
  
  const time = new Date(data.date_sent).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  });
  
  const isOwnMessage = data.from_user === user.username;
  
  messageDiv.innerHTML = `
    <div class="message-header">
      <span class="message-user" style="${isOwnMessage ? 'color: #764ba2;' : ''}">${data.from_user}${isOwnMessage ? ' (You)' : ''}</span>
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

function addPrivateMessage(data) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';
  messageDiv.style.border = '2px solid #764ba2';
  messageDiv.style.backgroundColor = '#f8f4ff';
  
  const time = new Date(data.date_sent).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  });
  
  const isFromMe = data.from_user === user.username;
  const otherUser = isFromMe ? data.to_user : data.from_user;
  
  messageDiv.innerHTML = `
    <div class="message-header">
      <span class="message-user" style="color: #764ba2;">
        🔒 Private: ${isFromMe ? 'You → ' + otherUser : otherUser + ' → You'}
      </span>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-body">${escapeHtml(data.message)}</div>
  `;
  
  chatMessages.appendChild(messageDiv);
}

function sendPrivateMessage(toUsername) {
  const message = prompt(`Send private message to ${toUsername}:`);
  
  if (message && message.trim()) {
    socket.emit('privateMessage', {
      from_user: user.username,
      to_user: toUsername,
      message: message.trim()
    });
  }
}

function showPrivateMessageOptions(username) {
  const choice = confirm(`Choose an option for ${username}:\n\nOK = Send new private message\nCancel = View message history`);
  
  if (choice) {
    sendPrivateMessage(username);
  } else {
    viewPrivateMessageHistory(username);
  }
}

async function viewPrivateMessageHistory(otherUsername) {
  try {
    const response = await fetch(`/api/messages/private/${user.username}/${otherUsername}`);
    
    if (response.ok) {
      const messages = await response.json();
      
      chatMessages.innerHTML = '';
      
      addSystemMessage(`Private conversation with ${otherUsername} (${messages.length} messages)`);
      
      if (messages.length === 0) {
        addSystemMessage('No previous private messages with this user');
      } else {
        messages.forEach(msg => {
          addPrivateMessage(msg);
        });
      }
      
      scrollToBottom();
      
      setTimeout(() => {
        const returnToRoom = confirm('View private messages complete.\n\nClick OK to return to room chat.');
        if (returnToRoom) {
          loadRoomMessages(currentRoom);
        }
      }, 500);
      
    } else {
      addSystemMessage('Error loading private messages');
    }
  } catch (error) {
    console.error('Error loading private messages:', error);
    addSystemMessage('Could not load private message history');
  }
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatRoomName(room) {
  return room
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function loadRoomMessages(room) {
  try {
    const response = await fetch(`/api/messages/room/${room}`);
    
    if (response.ok) {
      const messages = await response.json();
      
      chatMessages.innerHTML = '';
      
      messages.forEach(msg => {
        addMessage(msg);
      });
      
      scrollToBottom();
      
      if (messages.length === 0) {
        addSystemMessage('No previous messages in this room. Start the conversation!');
      }
    }
  } catch (error) {
    console.error('Error loading room messages:', error);
    addSystemMessage('Could not load previous messages');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  roomSelect.focus();
});