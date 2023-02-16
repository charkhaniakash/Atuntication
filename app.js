//jshint esversion:6

require('dotenv').config(); /// install as dotenv

const express = require("express");
const bodyParser = require("body-Parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
/////This is all about Google signin page/////////////
const GoogleStrategy = require('passport-google-oauth20').Strategy;
/////This is all about Google signin page/////////////
const encrypt = require("mongoose-encryption");


const findOrCreate = require("mongoose-findorcreate")



const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));



app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://0.0.0.0:27017/userDB", {useNewUrlParser: true});
// mongoose.set("useCreateIndex", true);





// const userSchema = {
//   email: String,
//   password: String
// };

/// we changed because of encryption

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

/// this is all about secrete in order to hide te password

// const secret = "There is a most important ";
/////actually what we did you know ?
/// we hided the secret from the veiwers by creating te (.env) file by pasting into that file.
// and we tried to excess in to the (console.log(process.env.API_KEY);)  by providing the API_KEY



// userSchema.plugin(encrypt, {secret: secret ,requireAuthenticationCode: false, encryptedFields: ["password"]});

// Just edited by putting (process.env.SECRET)  ftom    .env   file  which we created the  SECRET
// userSchema.plugin(encrypt, {secret: process.env.SECRET ,requireAuthenticationCode: false, encryptedFields: ["password"]});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
/////This is all about Google signin page/////////////

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

/////This is all about Google signin page/////////////



app.get("/", function(req, res){
  res.render("home");
});

//-------------------------------------------------
/// please refer passportjs documentation

app.get("/auth/google",
  passport.authenticate("google", {scope: ["profile"] }));
    /// we want users profile therefore scope is used includes email


app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: '/login' }),
  function(req, res){
     // successful authentication , redireted to Secretes
    res.redirect("/secrets");
});

/// please refer passportjs documentation
//--------------------------------------------------------



app.get("/login", function(req, res){
  res.render("login");
});


app.get("/register", function(req, res){
  res.render("register");
})


app.get("/secrets", function(req, res){
  User.find({"secret":{$ne: null}}, function(err, foundUsers){
    if(err){
      console.log(err);
    }else{
      if(foundUsers){
        res.render("secrets", {userWithSecrets: foundUsers});
      }
    }
  });
});



app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});


app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;

  User.findById(req.user.id, function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets")
        });
      }
    }
  });
});







app.get("/logout", function(req, res){
  req.logout(function(err){
    if(err){
      res.send(err);
    }else{
      res.redirect("/");
    }
  });
});



app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});



app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

}); 




app.listen(3000, function(){
  console.log("Server started on port 3000.")
});
