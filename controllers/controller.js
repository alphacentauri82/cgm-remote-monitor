//The purpose of this class is define reusable global methods for others controllers
"use strict";
class controller{
 constructor(options){
     this.name = 'controller';
     this.model = null;
     this.paginator = {};
     this.paginator.itemsxpage = 20;
     //Options
     if(options!==undefined && options!==null){
        // Name of the controller just for debug
        if(options.name!==undefined && options.name!==null)
            this.name = options.name;
        // define model to make access the data
        if(options.model!==undefined && options.model!==null)
            this.model = options.model;
        //Has pagination? how many items per block
        if(options.itemsxpage!==undefined && options.itemsxpage!==null)
            this.paginator.itemsxpage = options.itemsxpage;
     }
 }
 //get all items paginated - Just an example
 itemsPaged(req, res, filter = {}){
    this.model.find(filter,(err,docs)=>{
        if(err){
            console.log('Error: '+err);
            res.json({error:'Error: '+err});
        }else{
            var total_items = docs.length;
            //order desc
            var order="-";
            this.paginator.page = 1;
            //route/items/1/ASC
            if(req.params[1]!=undefined)
                order=((req.params[1]=='ASC')?'':'-'); //Empty means ASC
            if(req.params[0]!==undefined)
                this.paginator.page = req.params[0];
            var q = this.model.find(filter);
            //order by id
            q.sort(order+"_id")
            .skip(this.paginator.itemsxpage*(this.paginator.page-1))
            .limit(this.paginator.itemsxpage)
            .exec((err,items)=>{
                if(err){
                    console.log('Error: ' + err);
                }else{
                    console.log('GET ALL PAGED /'+this.name);
                    var modulus = 0;
                    if((total_docs % this.paginator.itemsxpage) > 0)
                        modulus = 1;
                    this.paginator.pages = Math.floor(total_docs/this.paginator.itemsxpage) + modulus;
                    res.json({context:'all', items: items, paginator: this.paginator});
                }
            });
        }
    });
 }
}

module.exports = controller;