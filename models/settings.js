var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var settingSchema = new Schema({
    profileid: { type: String },
    units: { type: String },
    timeFormat: { type: String },
    language: { type: String },
    scale: { type: String },
    render: { type:String },
    alarms: { type: Schema.Types.Mixed },
    nightMode: { type: Boolean },
    editMode: { type: Boolean },
    showRawbg: { type:String },
    customTitle: { type:String },
    theme: { type:String },
    alarmUrgentHigh: { type: Boolean },
    plugins: { type: Schema.Types.Mixed },
    openaps: { type: Boolean } 
});

module.exports = mongoose.model('settings',settingSchema,'settings');