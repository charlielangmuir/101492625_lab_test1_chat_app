document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const firstname = document.getElementById('firstname').value;
  const lastname = document.getElementById('lastname').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  const alert = document.getElementById('alert');
  
  if (password !== confirmPassword) {
    showAlert('Passwords do not match', 'error');
    return;
  }
  
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, firstname, lastname, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showAlert('Account created successfully! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } else {
      showAlert(data.error || 'Signup failed', 'error');
    }
  } catch (error) {
    showAlert('Network error. Please try again.', 'error');
  }
});

function showAlert(message, type) {
  const alert = document.getElementById('alert');
  alert.textContent = message;
  alert.className = `alert alert-${type}`;
  alert.style.display = 'block';
  
  if (type === 'success') {
    setTimeout(() => {
      alert.style.display = 'none';
    }, 3000);
  }
}