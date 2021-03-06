var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Post = require('../models/post');
var Blog = require('../models/blog');
var Book = require('../models/book');
const moment = require("moment")
var Steps = require('../models/steps');
let Favourites = require('../models/favourites')
const axios = require('axios');
const {google} = require('googleapis')
const request = require('request')
const urlParse = require('url-parse')
const queryParse = require('query-string')
const bodyParser = require("body-parser")

function makeid(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

router.get('/',isValidUser, async(req,res,next) => {
  let user = await User.findOne({_id:req.user._id})
  let post = await Post.find().sort({_id:-1}).limit(50)
  res.render('landing',{user, post})
})

router.get('/bot',isValidUser, async function(req,res,next){
  let user = await User.findOne({_id:req.user._id})
  res.render('botto',{user})
})

router.get('/profile/:id',isValidUser, async function(req,res,next){
  let id = req.params.id
  let user = await User.findOne({_id:id})
  let post= await Post.find({userid:id}).sort({_id:-1})
  return res.render('profile',{user, post})
})

router.get('/doctors',isValidUser, async function(req,res,next){
  let user = await User.findOne({_id:req.user._id})
  let doctors = await User.find({type:"doctor"})
  res.render('doctors',{user,doctors})
}) 

router.get('/post',isValidUser, async function(req,res,next){
  let user = await User.findOne({_id:req.user._id})
  res.render('post',{user})
})

router.post('/post', async function(req,res,next){
  var post= new Post({
    username:req.body.username,
    title:req.body.title,
    userid:req.body.userid,
    type: req.body.type,
    date: Date.now()
  });
  try{
    doc=await post.save()
    return res.redirect(`/users`)
    //return res.status(201).json(doc);
  }
  catch(err){
    console.log(err)
    return res.redirect('/users/post')
    //return res.status(501).json(err);
  }
})

router.get('/book',isValidUser, async function(req,res,next){
  let user = await User.findOne({_id:req.user._id})
  let doctors = await User.find({type:"doctor"})
  console.log(doctors[0].iframe)
  res.render('book',{user,doctors, iframe: doctors[0].iframe, doctor: doctors[0]})
})

router.post('/book1',isValidUser, async function(req,res,next){
  let user = await User.findOne({_id:req.user._id})
  let doctors = await User.find({type:"doctor"})
  let doctor = await User.findOne({_id:req.body.doctor})
  console.log(doctor)
  res.render('book',{user,doctors, iframe: doctor.iframe, doctor})
})

router.post('/book', async function(req,res,next){
  let user = await User.findOne({_id:req.user._id})
  let doctor = await User.findOne({_id:req.body.doctor})
  var book= new Book({
    username:req.body.username,
    doctorname:doctor.name,
    userid:req.body.userid,
    doctorid:req.body.doctor,
    time: req.body.time,
    date: req.body.date,
    status:'Pending',
    code:makeid(6)
  });
  try{
    doc=await book.save()
    return res.redirect(`/users/view`)
    //return res.status(201).json(doc);
  }
  catch(err){
    console.log(err)
    return res.redirect('/users/book')
    //return res.status(501).json(err);
  }
})

router.get('/view',isValidUser, async function(req,res,next){
  let user = await User.findOne({_id:req.user._id})
  let appointments=[]
  if (user.type==="doctor"){
     appointments = await Book.find({doctorid:req.user._id}).sort({_id:-1})
  }
  else{
    appointments = await Book.find({userid:req.user._id}).sort({_id:-1})
  }
  
  res.render('view',{user,appointments})
})

router.post('/view',isValidUser, async function(req,res,next){
  await Book.findOneAndUpdate({_id:req.body.id},{status: req.body.status})
  return res.redirect('/users/view')
})

router.get('/join',isValidUser, async function(req,res,next){
  let user = await User.findOne({_id:req.user._id})
  res.render('join',{user})
})

router.get('/recipes',isValidUser, async function(req,res,next){
  let user = await User.findOne({_id:req.user._id})
  return res.render('search',{user})
})

router.post('/recipes',isValidUser, async function(req,res,next){
  let user = await User.findOne({_id:req.user._id})
  var params = { 
    'ingredients': req.body.query,
    'number': 5, 
    'ranking': 1, 
    'ignorePantry': false 
  };
console.log(params)
axios.get(`https://api.spoonacular.com/recipes/findByIngredients?apiKey=${process.env.SPOONACULAR_API_KEY}`,{
  params: params
})
  .then(response => {
    console.log(response)
    let recipes = (response.data);
    res.render("recipe-list",{user,recipes})
  })
  .catch(error => {
    console.log(error);
    res.render("search",{user})
  });

})

router.get('/single/:id',isValidUser, async function(req,res,next){
  let id = req.params.id
  let user = await User.findOne({_id:req.user._id})
axios.get(`https://api.spoonacular.com/recipes/${id}/information?apiKey=${process.env.SPOONACULAR_API_KEY}`)
  .then(response => {
    // let recipes = (response.data.results);
    // res.render("recipe-list",{user,recipes})
    console.log(response)
     let recipe = (response.data);
    res.render("single",{user,recipe})
  })
  .catch(error => {
    console.log(error);
    res.render("search",{user})
  });
})

router.get('/favourite',isValidUser, async function(req,res,next){
  let user = await User.findOne({_id:req.user._id})
  let recipes = await Favourites.find({userid:req.user._id}).sort({_id:-1})
  return res.render('favourites',{user, recipes})
})

router.post('/list', async function(req,res,next){
  let favourited = await Favourites.findOne({id:req.body.id})
  if (favourited)
  res.redirect('/users/favourite')

  var favourites= new Favourites({
    id:req.body.id,
    title:req.body.title,
    userid:req.user._id,
    image: req.body.image,
  });
  try{
    doc=await favourites.save()
    res.redirect('/users/favourite')
  }
  catch(err){
    console.log(err)
    res.redirect('/users/favourite')
  }
})

router.get("/getURLTing", async(req,res)=>{
  let user = await User.findOne({_id:req.user._id})
  let steps = await Steps.findOne({userid:req.user._id})
  if(!steps){
    var steps1= new Steps({
      username:user.name,
      steps:0,
      userid:req.user._id,
      date: moment()
    });
    try{
      doc=await steps1.save()
      //return res.status(201).json(doc);
    }
    catch(err){
      console.log(err)
      return res.redirect('/users/tracker')
      //return res.status(501).json(err);
    }
  }
  else{
    if(moment()<moment(moment(steps.date)).add(1, 'd')){

      return res.render("tracker",{info:"You already claimed points. Please wait 24 hours", user})
    }
  }
  const oauth2Client = new google.auth.OAuth2(
    process.env.FITNESS_CLIENT_ID,
    process.env.FITNESS_CLIENT_SECRET,
    process.env.FITNESS_REDIRECT
  )
  const scopes=["https://www.googleapis.com/auth/fitness.activity.read profile email openid"]
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    state: JSON.stringify({
    callbackUrl: req.body.callbackUrl,
    userID: req.body.userid
    })
  })
  request(url,(err,response,body)=>{
    console.log("Error:",err)
    res.redirect(url)
  })
})

router.get("/tracker", async(req,res)=>{
  let user = await User.findOne({_id:req.user._id})
  res.render("tracker",{info:"", user})
})

router.get("/leaderboard", async(req,res)=>{
  let user = await User.findOne({_id:req.user._id})
  let steps = await Steps.find().sort({steps:-1}).limit(10)
  res.render("leaderboard",{steps, user})
})

router.get("/steps", async (req,res)=>{
  const queryUrl = new urlParse(req.url);
  const code = queryParse.parse(queryUrl.query).code
  console.log(code)
  const oauth2Client = new google.auth.OAuth2(
    process.env.FITNESS_CLIENT_ID,
    process.env.FITNESS_CLIENT_SECRET,
    process.env.FITNESS_REDIRECT
  )
  const tokens = await oauth2Client.getToken(code)
  //res.send("HELLO")
  let stepArray = [];
  let user = await User.findOne({_id:req.user._id})
  try{
    now = moment()
    var startDate = now.startOf('day') -new Date(0)
    var endDate = now.endOf('day')- new Date(0)
    console.log(startDate,endDate)
     axios({
      method:"POST",
      headers:{
        authorization:"Bearer "+tokens.tokens.access_token
      },
      "Content-Type":"application/json",
      url:`https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
      data:{
        "aggregateBy":[
          {
            "dataTypeName":"com.google.step_count.delta",
            "dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"
          }
        ],
        "bucketByTime": { "durationMillis": 86400000 },
        "startTimeMillis": startDate,
        "endTimeMillis": endDate,
        
      }
    }).then(async response => {
      // let recipes = (response.data.results);
      // res.render("recipe-list",{user,recipes})
      console.log(response.data.bucket)
      stepArray = response.data.bucket
    let noOfSteps = 0
    try{
      console.log("Here")
      console.log(stepArray[0].dataset[0].point[0].value[0].intVal)
      noOfSteps = stepArray[0].dataset[0].point[0].value[0].intVal
     await Steps.findOneAndUpdate({userid:req.user._id},{$inc: { steps: noOfSteps },date: moment()})
     
    res.render("tracker",{info:`${noOfSteps} Steps Added!`, user})
    }
    catch(e){
      console.log(e)
      res.render("tracker",{info:e, user})
    }
       
    })
    .catch(error => {
      console.log(error);
     
    });
   
    
  }
  catch(e){
    console.log("HEre")
    console.log(e)
    res.render("tracker",{info:e, user})
  }
})

router.get('/blogpost',isValidUser, async function(req,res,next){
  let user = await User.findOne({_id:req.user._id})
  res.render('blogpost',{user})
})

router.post('/blogpost', async function(req,res,next){
  var blog= new Blog({
    userid:req.body.userid,
    title: req.body.title,
    body: req.body.body,
    date: req.body.date,
    mood: req.body.mood
  });
  try{
    doc=await blog.save()
    return res.redirect(`/users/mood`)
    //return res.status(201).json(doc);
  }
  catch(err){
    console.log(err)
    return res.redirect('/users/blogpost')
    //return res.status(501).json(err);
  }
})

router.get('/mood',isValidUser, async(req,res,next) => {
  let user = await User.findOne({_id:req.user._id})
  let blogs = await Blog.find({userid:req.user._id}).sort({date:-1}).limit(50)
  const today = moment();
  const from_date = today.startOf('week');  
  let emotions = await Blog.find({userid:req.user._id, date: { $gte: from_date }})
  let happy =0, sad=0, fearful =0, disgusted=0, angry=0
  for (let i=0; i<emotions.length; i++){
    if(emotions[i].mood === 'Happy'){
      happy = happy+1
    }
    else if(emotions[i].mood === 'Sad'){
      sad = sad+1
    }
    else if(emotions[i].mood === 'Fearful'){
      fearful = fearful+1
    }
    else if(emotions[i].mood === 'Disgusted'){
      disgusted = disgusted+1
    }
    else if(emotions[i].mood === 'Angry'){
      angry = angry+1
    }

  }
  res.render('mood',{user, blogs, happy, sad, fearful,disgusted, angry})
})

function isValidUser(req,res,next){
  if(req.isAuthenticated()){
    next()
  }
  else{
    console.log('Unauthorized request')
    res.redirect('/login')
  //return res.status(401).json({message:'Unauthorized Request'});
  }
}



module.exports = router;
