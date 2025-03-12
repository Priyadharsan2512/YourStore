const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const port = 3000;

// MySQL database connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'yourstore',
  password: 'Team4@project',
  database: 'YourStore'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
    return;
  }
  console.log('Connected to MySQL as id ' + connection.threadId);
});

// Middleware to parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (CSS, JS, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Default route to redirect to /home
app.get('/', (req, res) => {
  res.redirect('/home');
});

// Serve HTML files for different routes
app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'YourStorehome.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'YourStorelogin.html'));
});

app.get('/register', (req, res) => {
  // Check if the 'success' query parameter exists and send it to the frontend
  const successMessage = req.query.success ? 'Registration Successful! You can now log in.' : '';
  res.sendFile(path.join(__dirname, 'templates', 'register.html'), { successMessage });
});

app.get('/forgetpassword', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'forgetpassword.html'));
});

app.get('/help', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'help.html'));
});

// Handle user registration
app.post('/register', (req, res) => {
  const { first_name, middle_name, last_name, username, email, phone, password } = req.body;

  if (!first_name || !last_name || !username || !email || !password) {
    return res.status(400).json({ error: 'Please fill all required fields.' });
  }

  const checkUsernameQuery = 'SELECT * FROM users WHERE username = ?';
  connection.query(checkUsernameQuery, [username], (err, results) => {
    if (err) {
      console.error('Error checking username:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (results.length > 0) {
      return res.status(400).json({ error: '<span style="color: red;">Username already taken</span>' });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing password:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      const query = `
        INSERT INTO users (first_name, middle_name, last_name, username, email, phone, password)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      connection.query(query, [first_name, middle_name, last_name, username, email, phone, hashedPassword], (err, result) => {
        if (err) {
          console.error('Error registering user:', err);
          return res.status(500).json({ error: 'Error registering user' });
        }

        // Redirect to register page with success query parameter
        res.redirect('/login?success=true');
      });
    });
  });
});

// Handle user login
app.post('/login', (req, res) => {
  console.log(req.body);  // Debug the received form data 
  const { username, password } = req.body;

  // Check if username exists in the database
  const checkUserQuery = 'SELECT * FROM users WHERE username = ?';
  connection.query(checkUserQuery, [username], (err, results) => {
    if (err) {
      console.error('Error checking user:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    // If username doesn't exist
    if (results.length === 0) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const user = results[0];

    // Compare the provided password with the hashed password in the database
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error('Error comparing password:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      if (isMatch) {
        // Successful login, redirect to the home page
        res.redirect('/home');
      } else {
        // Invalid password
        res.status(400).json({ error: 'Invalid username or password' });
      }
    });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
