//settings controller
"use strict";

var Controller = require("./controller");

class Settings extends Controller{
    constructor(){
        super({name: "Settings"});
        this.model = require("../models/settings");
    }
    //Get settings related to user profile
    getByProfile(req, res){
        this.model.findOne({profileid:'test'},(err,settings)=>{
            if(err){
                console.log("Error: Controller "+this.name+" getProfile, "+err);
                res.json({error:"Error on Controller "+this.name+" method getProfile. Please check logs"});
            }else{
                res.json(settings);
            }
        });
    }
    update(req,res){
        this.model.findOneAndUpdate(
            {profileid:'test'},req.body,{new:true, upsert:true},
            (err,doc)=>{
                if(err){
                    console.log("Error: Controller "+this.name+" update, "+err);
                    res.json({error:"Error on Controller "+this.name+" method update. Please check logs"});
                }else{
                    res.json(doc);
                }
            });
    }
}

module.exports = Settings;