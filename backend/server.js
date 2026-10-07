const express=require("express");
const cors=require("cors");
const mongoose=require("mongoose");

const app=express();
app.use(cors());
app.use(express.json());

const MONGO_URI=process.env.MONGO_URI||"mongodb://localhost:27017/safe_sakhi";

const contactSchema=new mongoose.Schema({
    id:{type:Number,unique:true},
    name:String,
    phone:String,
    relation:String
},{versionKey:false});

const activitySchema=new mongoose.Schema({
    id:{type:Number,unique:true},
    type:String,
    message:String,
    time:String
},{versionKey:false});

const eventSchema=new mongoose.Schema({
    id:{type:Number,unique:true},
    type:String,
    data:Object,
    time:Date
},{versionKey:false});

const stateSchema=new mongoose.Schema({
    key:{type:String,unique:true},
    journeyActive:Boolean,
    checkIn:{
        active:Boolean,
        duration:Number,
        startedAt:Date
    }
},{versionKey:false});

const Contact=mongoose.model("Contact",contactSchema);
const Activity=mongoose.model("Activity",activitySchema);
const Event=mongoose.model("Event",eventSchema);
const State=mongoose.model("State",stateSchema);

async function addActivity(type,message){
    const activity={
        id:Date.now(),
        type,
        message,
        time:new Date().toLocaleString("en-IN")
    };
    await Activity.create(activity);
    return activity;
}

async function getState(){
    let state=await State.findOne({key:"main"});
    if(!state){
        state=await State.create({
            key:"main",
            journeyActive:false,
            checkIn:{active:false,duration:0,startedAt:null}
        });
    }
    return state;
}

app.get("/",(req,res)=>{
    res.json({success:true,message:"Safe Sakhi Backend Running"});
});

app.get("/api/status",async(req,res)=>{
    try{
        const state=await getState();
        res.json({
            status:"safe",
            message:"Safety system is active",
            journeyActive:state.journeyActive,
            checkInActive:state.checkIn.active
        });
    }catch(error){
        res.status(500).json({success:false,message:"Unable to get status"});
    }
});

app.get("/api/contacts",async(req,res)=>{
    try{
        const contacts=await Contact.find().sort({id:-1}).lean();
        res.json(contacts);
    }catch(error){
        res.status(500).json({success:false,message:"Unable to load contacts"});
    }
});

app.post("/api/contacts",async(req,res)=>{
    try{
        const {name,phone,relation}=req.body;
        if(!name||!phone||!name.trim()||!phone.trim()){
            return res.status(400).json({success:false,message:"Name and phone are required"});
        }
        const contact={
            id:Date.now(),
            name:name.trim(),
            phone:phone.trim(),
            relation:relation||"Other"
        };
        await Contact.create(contact);
        await addActivity("Contact",`${contact.name} added to trusted contacts`);
        res.status(201).json({success:true,message:"Contact added successfully",contact});
    }catch(error){
        res.status(500).json({success:false,message:"Unable to add contact"});
    }
});

app.put("/api/contacts/:id",async(req,res)=>{
    try{
        const id=Number(req.params.id);
        const {name,phone,relation}=req.body;
        const contact=await Contact.findOne({id});
        if(!contact){
            return res.status(404).json({success:false,message:"Contact not found"});
        }
        if(!name||!phone||!name.trim()||!phone.trim()){
            return res.status(400).json({success:false,message:"Name and phone are required"});
        }
        const oldName=contact.name;
        contact.name=name.trim();
        contact.phone=phone.trim();
        contact.relation=relation||"Other";
        await contact.save();
        await addActivity("Contact",`${oldName} contact details updated`);
        res.json({success:true,message:"Contact updated successfully",contact});
    }catch(error){
        res.status(500).json({success:false,message:"Unable to update contact"});
    }
});

app.delete("/api/contacts/:id",async(req,res)=>{
    try{
        const id=Number(req.params.id);
        const contact=await Contact.findOne({id});
        if(!contact){
            return res.status(404).json({success:false,message:"Contact not found"});
        }
        await Contact.deleteOne({id});
        await addActivity("Contact",`${contact.name} removed from trusted contacts`);
        res.json({success:true,message:"Contact deleted successfully"});
    }catch(error){
        res.status(500).json({success:false,message:"Unable to delete contact"});
    }
});

app.post("/api/sos",async(req,res)=>{
    try{
        await Event.create({
            id:Date.now(),
            type:"SOS",
            data:req.body||{},
            time:new Date()
        });
        await addActivity("SOS","Emergency SOS demo activated");
        res.json({success:true,message:"SOS demo activated successfully"});
    }catch(error){
        res.status(500).json({success:false,message:"Unable to activate SOS"});
    }
});

app.post("/api/journey",async(req,res)=>{
    try{
        const state=await getState();
        state.journeyActive=!state.journeyActive;
        await state.save();
        await Event.create({
            id:Date.now(),
            type:"Journey",
            data:{active:state.journeyActive},
            time:new Date()
        });
        await addActivity("Journey",state.journeyActive?"Safe journey started":"Safe journey ended");
        res.json({
            success:true,
            active:state.journeyActive,
            message:state.journeyActive?"Journey started successfully":"Journey ended successfully"
        });
    }catch(error){
        res.status(500).json({success:false,message:"Unable to update journey"});
    }
});

app.post("/api/checkin/start",async(req,res)=>{
    try{
        const duration=Number(req.body.duration);
        if(![1,3,5].includes(duration)){
            return res.status(400).json({success:false,message:"Choose 1, 3 or 5 minutes"});
        }
        const state=await getState();
        state.checkIn={
            active:true,
            duration,
            startedAt:new Date()
        };
        await state.save();
        await Event.create({
            id:Date.now(),
            type:"Check-in",
            data:{action:"started",duration},
            time:new Date()
        });
        await addActivity("Check-in",`Safety check-in started for ${duration} minutes`);
        res.json({success:true,message:"Safety check-in started",checkIn:state.checkIn});
    }catch(error){
        res.status(500).json({success:false,message:"Unable to start check-in"});
    }
});

app.post("/api/checkin/finish",async(req,res)=>{
    try{
        const {result}=req.body;
        if(!["safe","missed"].includes(result)){
            return res.status(400).json({success:false,message:"Invalid check-in result"});
        }
        const state=await getState();
        if(!state.checkIn.active){
            return res.status(400).json({success:false,message:"No active check-in"});
        }
        state.checkIn.active=false;
        await state.save();
        await Event.create({
            id:Date.now(),
            type:"Check-in",
            data:{action:"finished",result},
            time:new Date()
        });
        await addActivity("Check-in",result==="safe"?"User confirmed that she is safe":"Safety check-in was missed");
        res.json({
            success:true,
            message:result==="safe"?"Safety confirmed":"Missed check-in recorded"
        });
    }catch(error){
        res.status(500).json({success:false,message:"Unable to finish check-in"});
    }
});

app.get("/api/checkin",async(req,res)=>{
    try{
        const state=await getState();
        res.json(state.checkIn);
    }catch(error){
        res.status(500).json({success:false,message:"Unable to load check-in"});
    }
});

app.get("/api/activity",async(req,res)=>{
    try{
        const activities=await Activity.find().sort({id:-1}).lean();
        res.json(activities);
    }catch(error){
        res.status(500).json({success:false,message:"Unable to load activity"});
    }
});

app.delete("/api/activity",async(req,res)=>{
    try{
        await Activity.deleteMany({});
        res.json({success:true,message:"Activity history cleared"});
    }catch(error){
        res.status(500).json({success:false,message:"Unable to clear activity history"});
    }
});

const PORT=5000;

async function startServer(){
    try{
        await mongoose.connect(MONGO_URI);
        console.log("MongoDB connected");
        app.listen(PORT,()=>{
            console.log("--------------------------------");
            console.log("       SAFE SAKHI BACKEND       ");
            console.log("--------------------------------");
            console.log(`Server running: http://localhost:${PORT}`);
            console.log(`API status: http://localhost:${PORT}/api/status`);
        });
    }catch(error){
        console.error("MongoDB connection failed:",error.message);
        process.exit(1);
    }
}

startServer();