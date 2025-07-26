const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8000;

// ✅ Route: Root → Login Page
app.get('/', (req, res) => {
  const loginPath = path.join(__dirname, 'Common', 'login.html');
  fs.existsSync(loginPath) ? res.sendFile(loginPath) : res.status(404).send('Login page not found');
});

// ✅ Route: /index → index.html
app.get('/index', (req, res) => {
  const indexPath = path.join(__dirname,  'index.html');
  fs.existsSync(indexPath) ? res.sendFile(indexPath) : res.status(404).send('Index page not found');
});

// ✅ Route: /dashboard → Dashboard.html
app.get('/dashboard', (req, res) => {
  const dashboardPath = path.join(__dirname, 'Common', 'Dashboard.html');
  fs.existsSync(dashboardPath) ? res.sendFile(dashboardPath) : res.status(404).send('Dashboard not found');
});

// ✅ Route: /signup → Signup.html
app.get('/signup', (req, res) => {
  const signupPath = path.join(__dirname, 'Common', 'signup.html');
  fs.existsSync(signupPath) ? res.sendFile(signupPath) : res.status(404).send('Signup page not found');
});

// ✅ Serve all static files (CSS, JS, Images)
app.use(express.static(__dirname));

// ❗Fallback: Redirect all unknown routes to `/`
app.get('*', (req, res) => {
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`✅ Frontend running at http://localhost:${PORT}`);
});


