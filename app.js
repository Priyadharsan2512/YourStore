const express = require('express');
const nodemailer = require('nodemailer');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const path = require('path');
const session = require('express-session');  // Add session management
const crypto = require('crypto'); 

require('dotenv').config({ path: './data.env' });

const app = express();
const port = 3000;

// MySQL database connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
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
  secret: process.env.SESSION_SECRET || 'your-secret-key',  // Secret key for encryption
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }  // Set to true if using HTTPS
}));

// Middleware to parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (CSS, JS, images, etc.)
app.use(express.static(path.join(__dirname, 'templates/images')));

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

app.get('/forgetpassword', (_, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'forgetpassword.html'));
});

app.get('/reset/:userId', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'resetpassword.html'));
});


app.get('/cart', (_, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'cart.html'));
});

app.get('/billing', (_, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'bill.html'));
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
    });
  });
});

// Handle user registration
app.post('/register', (req, res) => {
  const { first_name, middle_name, last_name, username,  country_code, email, phone, password } = req.body;

 if (!first_name || !last_name || !username || (!email && !phone) || !password || (phone && !country_code)) {
    return res.status(400).json({ error:'Please fill all required fields.'});
  }
  

  // Check if user exists
  const checkUsernameQuery = 'SELECT * FROM users WHERE username = ? OR email = ? OR phone = ?';
  connection.query(checkUsernameQuery, [username, email, phone], (err, results) => {
    if (err) {
      console.error('Error checking username:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    if (results.length > 0) {
      return res.status(401).json({error:'User already exist'});
    }
    // Hash password and insert user
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing password:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      const query = `INSERT INTO users (first_name, middle_name, last_name, username, email,  country_code, phone, password)
                     VALUES (?, ?, ?, ?, ?, ?,?, ?)`;
      connection.query(query, [first_name, middle_name, last_name, username, email,  country_code, phone, hashedPassword], (err) => {
        if (err) {
          console.error('Error registering user:', err);
            return res.status(500).json({ error: 'Error registering user' });
        }

        res.status(200).json({ success: 'Registration Successful! Please log in.' });
        // Redirect to login page after successful registration  
      });
    });
  });
});

// Handle forget password request
app.post('/forgetpassword', (req, res) => {
  const username = req.body.username;

  // Query to get user's email and phone number from the database
  db.query('SELECT email, phone FROM users WHERE username = ?', [username], (err, result) => {
    if (err) {
      res.status(500).send('Database error');
      return;
    }

    if (result.length === 0) {
      res.status(404).send('User not found');
      return;
    }

    const user = result[0];
    const token = crypto.randomBytes(20).toString('hex'); // Generate a random token

    // Store the token in the database temporarily (in a password_reset table)
    db.query('INSERT INTO password_resets (username, token, expires) VALUES (?, ?, ?)', 
      [username, token, Date.now() + 3600000], // Token expires in 1 hour
      (err) => {
        if (err) {
          res.status(500).send('Error saving token');
          return;
        }

        // Send reset link via email or phone (using Nodemailer for email)
        if (user.email) {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: 'your-email@gmail.com',
              pass: 'your-email-password'
            }
          });

          const resetLink = `http://localhost:3000/reset?token=${token}`;

          const mailOptions = {
            from: 'your-email@gmail.com',
            to: user.email,
            subject: 'Password Reset Link',
            text: `You requested a password reset. Click the link to reset your password: ${resetLink}`
          };

          transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
              res.status(500).send('Failed to send email');
              return;
            }
            res.send('Reset link sent to your email!');
          });
        } else {
          // Here you can handle sending a reset link via SMS using a service like Twilio
          // Send the reset link to the user's phone
          res.send('Reset link sent to your phone (SMS functionality needs implementation)');
        }
      });
  });
});

// Reset Password (Handle password reset request)
app.post('/reset-password', (req, res) => {
  const token = req.body.token;
  const newPassword = req.body['new-password'];

  // Validate the token
  db.query('SELECT * FROM password_resets WHERE token = ? AND expires > ?', [token, Date.now()], (err, result) => {
    if (err) {
      res.status(500).send('Database error');
      return;
    }

    if (result.length === 0) {
      res.status(400).send('Invalid or expired token');
      return;
    }

    const username = result[0].username;

    // Update the password in the database (hashed for security)
    const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');
    db.query('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, username], (err) => {
      if (err) {
        res.status(500).send('Error updating password');
        return;
      }
      res.send('Password has been reset successfully');
    });
  });
});

// Handle payment method selection
app.post('/process-payment', (req, res) => {
  const { paymentMethod } = req.body;

  if (!paymentMethod) {
    return res.status(400).json({ error: "Please select a payment method." });
  }

  // Simulate processing payment (integrate with Stripe, PayPal, etc.)
  console.log(`Processing payment with ${paymentMethod}`);

  // Generate estimated delivery date (3-7 days from today)
  let today = new Date();
  let estimatedDelivery = new Date(today);
  estimatedDelivery.setDate(today.getDate() + Math.floor(Math.random() * 5) + 3);
  let deliveryDate = estimatedDelivery.toDateString();

  res.json({ success: true, deliveryDate });
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
