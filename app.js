const express = require("express");
const path = require("path");
const app = express();
const mongoose = require('mongoose');
const bodyparser = require('body-parser');
const session = require('express-session'); // Imports the session package

// Connect to MongoDB
mongoose.connect('mongodb://localhost/contactDance', { useNewUrlParser: true, useUnifiedTopology: true });
const port = 8000;

// --- Define mongoose Schemas ---
var contactSchema = new mongoose.Schema({
    name: String, phone: String, email: String, address: String, desc: String
});
var contact = mongoose.model('Contact', contactSchema);

var userSchema = new mongoose.Schema({
    name: String, email: { type: String, required: true, unique: true }, password: { type: String, required: true }
});
var User = mongoose.model('User', userSchema);

// EXPRESS SPECIFIC STUFF
app.use('/static', express.static('static'));
app.use(express.urlencoded({ extended: true }));

// --- CONFIGURE SESSION MEMORY ---
app.use(session({
    secret: 'atharv_dance_academy_secret_key', // This secures the session
    resave: false,
    saveUninitialized: true
}));

// PUG SPECIFIC STUFF 
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// --- CREATE THE SECURITY CHECKPOINT (Middleware) ---
function requireLogin(req, res, next) {
    if (req.session.user) {
        next(); // User is logged in, let them through!
    } else {
        res.status(401).render('login.pug', { error: "You must be logged in to view this page." });
    }
}

// --- PUBLIC ENDPOINTS (Anyone can see these) ---
app.get('/', (req, res) => res.status(200).render('home.pug'));
app.get('/about', (req, res) => res.status(200).render('about.pug'));
app.get('/contact', (req, res) => res.status(200).render('contact.pug'));
app.get('/login', (req, res) => res.status(200).render('login.pug'));
app.get('/register', (req, res) => res.status(200).render('register.pug'));

app.post('/contact', (req, res) => {
    var myData = new contact(req.body);
    myData.save().then(() => res.send("This item has been saved to the database"))
                 .catch(() => res.status(400).send("Item was not saved"));
});

// --- LOCKED ENDPOINTS (Only logged-in users) ---
// Notice how we put 'requireLogin' in the middle of these routes!
app.get('/services', requireLogin, (req, res) => res.status(200).render('services.pug'));
app.get('/classinfo', requireLogin, (req, res) => res.status(200).render('class_info.pug'));

// Secure Dashboard Route
app.get('/dashboard', requireLogin, (req, res) => {
    res.status(200).render('dashboard.pug', { userName: req.session.user.name });
});

// --- AUTHENTICATION LOGIC ---
app.post('/register', (req, res) => {
    if (req.body.password !== req.body.confirm_password) {
        return res.status(400).render('register.pug', { error: "Passwords do not match." });
    }
    var newUser = new User({ name: req.body.name, email: req.body.email, password: req.body.password });
    newUser.save()
        .then(() => res.render('login.pug', { error: "Registration successful! Please log in." }))
        .catch(() => res.status(400).render('register.pug', { error: "This email is already registered." }));
});

app.post('/login', (req, res) => {
    User.findOne({ email: req.body.email, password: req.body.password }).then((user) => {
        if (user) {
            // SAVE USER TO SESSION MEMORY
            req.session.user = user; 
            res.redirect('/dashboard'); 
        } else {
            res.status(400).render('login.pug', { error: "Invalid Email or Password." });
        }
    }).catch(() => res.status(500).render('login.pug', { error: "Server error." }));
});

// --- LOGOUT ROUTE ---
app.get('/logout', (req, res) => {
    req.session.destroy(); // Erase the memory
    res.redirect('/login'); // Send back to login
});

// START THE SERVER 
app.listen(port, () => console.log(`The application started successfully on port ${port}`));