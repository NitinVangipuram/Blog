const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const multer = require("multer");
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const session = require('express-session');
const app = express();
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require("passport");
const findOrCreate = require("mongoose-findorcreate");
const passportLocalMongoose = require("passport-local-mongoose");
mongoose.connect("mongodb+srv://dharhacks:KfYYaWCNDC7ZCqaF@cluster0.kwhiyso.mongodb.net/ultimateDB");
app.use(express.static("uploads"));
app.set('view engine', 'ejs');
app.use(passport.initialize());
app.use(session({
  secret:"our little secret.",
  resave:false,
  saveUninitialized:false,

}));
const postSchema={
  title: String,
  content: String,
  image:{
    data:Buffer,
    contentType:String
  },
  featured:Boolean
};

const Storage = multer.diskStorage({
    destination:'uploads',
    filename:(req,file,cb)=>{
      cb(null, file.fieldname + '-' + Date.now());
    },
});
const upload = multer({
    storage:Storage,
    limits: {
        fieldNameSize: 300,
        fileSize: 1048576, // 10 Mb
      },
    
}).single('testImage')


const Post = mongoose.model("Post", postSchema);
app.use(bodyParser.urlencoded({extended: true}));

const userSchema = new mongoose.Schema ({
  email:String,
  password:String,
  googleId:String,
  secret:String,
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User",userSchema);
passport.use(User.createStrategy()); 
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});
 
passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileUrl: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);

  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));
app.get("/",function(req,res){
  res.render("index");
})
app.get("/auth/google", passport.authenticate('google', {

  scope: ['profile']

}));
app.get("/secrets",function(req,res){
User.find({ secret: { $ne: null } }).then(function (foundUsers) {
    res.redirect("/home");
  });
});

app.get('/auth/google/secrets', 
passport.authenticate('google', { failureRedirect: '/login' }),
function(req, res) {
  // Successful authentication, redirect home.
  res.redirect('/secrets');
});

app.post("/register",function(req,res){
  User.register({username:req.body.username},req.body.password,function(err,user){
      if(err){
          console.log(err);
          res.redirect("/register");

      }else{
          passport.authenticate("local")(req,res,function(){
              res.redirect("/secrets");
          })
      }
  })
});
app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
      res.render("submit");

  }
  else{
      res.redirect("/login");
  }
})
app.post("/submit",function(req,res){
  const submittedSecret = req.body.secret;

  console.log(req.user.id);

  User.findById(req.user.id).then((foundUser) => {
    if (foundUser) {
      foundUser.secret = submittedSecret;
      foundUser.save().then(function () {
        res.redirect("/secrets");
      });
    }
  });
})
app.post("/login",function(req,res){
  const user = new User({
    username:req.body.username,
    password:req.body.password
  })
  req.logIn(user,function(err){
      if(err){
          console.log(err);
      }
      else{
          passport.authenticate("local")(req,res,function(){
              res.redirect("/secrets");
          });
      }
  })
  
  });
 


app.get("/home", async function (req, res) {
  const foundPosts = await Post.find();
  const saves = await Post. find({featured:true});
  const date = new Date();


   const options = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
       };

const td = date.toLocaleString('en-IN', options);

  res.render("home", {  ps: foundPosts , ss:saves, today:td});
   
});
app.get("/compose",function(req,res){
    res.render("post");
})

app.post("/compose",function(req,res){
  upload(req,res,(err)=>{
    if(err){
        console.log(err);
    }
    else{
        const post = new Post({
            title:req.body.n,
            content:req.body.c,
            image:{
                data:fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
                contentType:'image/png',
            },
            featured:false
            
        })
             post.save()
             .then(() => res.redirect("/home"));}

    }
        )
    }
  )
app.get("/seper",function(req,res){
  res.render("seper")
})
  
  app.get("/seper/:postId", async function(req, res) {
   
    const reqPostId = req.params.postId;
   
    const post = await Post.findOne({ _id: reqPostId });
    res.render("seper", { he: post.title, be: post.content , post:post })
  });
  app.get("/home/:postId", async function(req, res) {
   
    const reqPostId = req.params.postId;
   
    const post = await Post.findOne({ _id: reqPostId });
    
    // post.updateOne({  featured: true });
    // await post.save();
    await Post.updateOne({_id: reqPostId} ,{ featured: true });
    res.redirect("/home");
  });
  app.get("/feat/:postId", async function(req, res) {
   
    const reqPostId = req.params.postId;
   
    const post = await Post.findOne({ _id: reqPostId });
    await Post.updateOne({_id: reqPostId} ,{ featured: false });
    res.redirect("/home");
  });
  app.get("/delete/:postId", async function(req, res) {
   
    const reqPostId = req.params.postId;
   
    const post = await Post.findOne({ _id: reqPostId });
  
    await Post.deleteOne({_id: reqPostId});
    res.redirect("/home");
  });
  app.post("/search", async function(req, res) {
   
    const st= req.body.setitle;
   
    const post = await Post.findOne({ title: st });
  
    const n = post._id;
    const ne = await Post.findOne({ _id:n });
    res.render("search", { he: ne.title, be: ne.content , post:ne })
    
  });
  
app.listen(3000, function() {
  console.log("Server started on port 3000");
});
