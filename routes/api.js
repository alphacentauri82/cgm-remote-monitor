//Enabling cors just for this router
var cors = require('cors');
var settings = require("../controllers/settings");
var Settings = new settings();
module.exports = function(router){
 router.all('*', cors());
 router.route('/settings')
 .get((req, res)=>{
    //res.json({"message":'this are the settings'});
    Settings.getByProfile(req,res);
 })
 .post((req, res)=>{
    //res.json(req.body);
    Settings.update(req,res);
 });
};