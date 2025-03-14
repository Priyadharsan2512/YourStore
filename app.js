const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const path = require('path');
const session = require('express-session');  // Add session management

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

// Session management setup
app.use(session({
  secret: 'your-secret-key',  // Secret key for encryption
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }  // Set to true if using HTTPS
}));

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
app.get('/home', (_, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'YourStorehome.html'));
});

app.get('/login', (_, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'YourStorelogin.html'));
});

app.get('/register', (_, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'register.html'));
});

app.get('/reset', (_, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'forgetpassword.html'));
});

app.get('/help', (_, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'help.html'));
});

app.get('/chatbot', (_, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'chatbot.html'));
});
// Handle user login
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Check if both username and password are provided
  if (!username || !password) {
    return res.status(400).json({ error: 'Please fill in both fields.' });
  }

  // Query to check if user exists
  const query = 'SELECT * FROM users WHERE username = ?';
  connection.query(query, [username], (err, results) => {
    if (err) {
      console.error('Error checking user:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    // Check if the username exists
    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Check if the password matches
    bcrypt.compare(password, results[0].password, (err, isMatch) => {
      if (err) {
        console.error('Error comparing passwords:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      // If username and password match, create session
      req.session.user = results[0];
      res.status(200).json({ success: 'Login successful' });
      res.redirect('/home');
    });
  });
});

// Handle user registration
app.post('/register', (req, res) => {
  const { first_name, middle_name, last_name, username, email, phone, password } = req.body;

  if (!first_name || !last_name || !username || !email || !password) {
    return res.redirect('/register?error=Please fill all required fields.');
  }

  // Check if username exists
  const checkUsernameQuery = 'SELECT * FROM users WHERE username = ?';
  connection.query(checkUsernameQuery, [username], (err, results) => {
    if (err) {
      console.error('Error checking username:', err);
      return res.redirect('/register?error=Internal Server Error');
    }
    if (results.length > 0) {
      return res.redirect('/register?error=Username already exist');
    }
    // Hash password and insert user
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing password:', err);
        return res.redirect('/register?error=Internal Server Error');
      }

      const query = `INSERT INTO users (first_name, middle_name, last_name, username, email, phone, password)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
      connection.query(query, [first_name, middle_name, last_name, username, email, phone, hashedPassword], (err, result) => {
        if (err) {
          console.error('Error registering user:', err);
          return res.redirect('/register?error=Error registering user');
        }

        return res.redirect('/login?success=Registration successful! You can now log in.');
        // Redirect to login page after successful registration
        res.redirect('/login');
      });
    });
  });
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Failed to log out');
    }
    // Redirect to login page after logout
    res.redirect('/login');
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
