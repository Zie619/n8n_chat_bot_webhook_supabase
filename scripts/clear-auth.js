// Clear authentication data from localStorage
// Run this in the browser console if needed

localStorage.removeItem('auth_token');
localStorage.removeItem('user_id');
localStorage.removeItem('user_email');
console.log('Auth data cleared');