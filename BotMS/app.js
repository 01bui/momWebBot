/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var builder_cognitiveservices = require("botbuilder-cognitiveservices");

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector);
bot.set('storage', tableStorage);

var recognizer = new builder_cognitiveservices.QnAMakerRecognizer({
                knowledgeBaseId: process.env.QnAKnowledgebaseId, 
    subscriptionKey: process.env.QnASubscriptionKey});

var basicQnAMakerDialog = new builder_cognitiveservices.QnAMakerDialog({
    recognizers: [recognizer],
                defaultMessage: 'No match! Try changing the query terms!',
                qnaThreshold: 0.3}
);


// Twilio:
var twilio = require('twilio');
var sms_client = new twilio('ACaf51e5cf6eb7cbe792ae1d86f30dbedd', '5842512a127539c71aa57d49b68d8141');

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

var luisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;

var Intent_recognizer = new builder.LuisRecognizer(luisModelUrl);
bot.recognizer(Intent_recognizer);

// Greeting
bot.dialog('GreetingDialog',
    (session) => {
        const getGreetings = require('./getGreeting.js');
        session.send(getGreetings());
        session.endDialog();
    }
).triggerAction({
    matches: 'Greetings'
})

// Sleep Intent
bot.dialog('Non sleep', [
    function (session, args, next){
        var Rintent = args.intent;
        var timeSleep = builder.EntityRecognizer.findEntity(Rintent.entities, 'builtin.datetimeV2.date') || builder.EntityRecognizer.findEntity(Rintent.entities, 'builtin.datetimeV2.datetimerange');
        
        var note = session.dialogData.note = {
            timeSleep: timeSleep? timeSleep.entity : null,
        };

        if (!note.timeSleep){
            builder.Prompts.number(session, 'How many times did you lose your sleep this week? Please enter number ');
        }
        else{
            next();
        }
    },
    function (session, results){
        var note = session.dialogData.note;

        if (results.response){
            note.timeSleep = results.response;
        }

        if (note.timeSleep >= 4){
            session.send("I'm so sorry to hear that. You know that sleeping is really important to you as well as to your baby.");
            sms_client.messages.create({
            to: "+14438086169",
            from: '+14102042169',
            body: "I think your wife hasn't have enough sleep. You should talk or support her." 
            });
        }
        else{
            session.send("Don’t worry! 66 to 94% of women report sleep disturbances during pregnancy. Sleeping disturbance may affect your health and also your baby, yet it’s totally can be fixed.");
            
        }
        builder.Prompts.choice(session, "Do you want to try some exercises", "VR Meditation|Reading some methods to have a good sleep", { listStyle: builder.ListStyle.button });
    }, 
    function (session, results){
        if (results.response.entity == "VR Meditation"){
            session.send("Taking you to VR experience.");
            session.beginDialog('Select');
        }else{
            session.send("Going to bed only when sleepy and getting out of bed during prolonged awakenings.Drink less fluid prior to bed to decrease nocturia. Use pillow support. Take cognitive behavioral therapy");
            builder.Prompts.text(session, 'Everything is good. Do you feel relaxed right now?');
        }
    },
    function (session) {
        session.beginDialog('End');
    }
]).triggerAction({
    matches: 'Not Sleep'
})

//VR Selection:
bot.dialog('Select', [
    function (session) {
        builder.Prompts.choice(session, 'Which model do you want to try?', "Sky Model|Mushroom Model", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        if (results.response.entity === "Sky Model"){
            session.send("[Ready to bring you up to sky.](http://skyvr.azurewebsites.net/)");
        }
        else{
            session.send("[Enjoy our mushroom garden.](http://mushroomfieldvr.azurewebsites.net/)");
        }
        builder.Prompts.text(session, 'Everything is good. Do you feel relaxed right now?');
    },
    function (session, results){
        session.beginDialog('End');
    }
]).triggerAction({
    matches: 'VR'
})


// VR State:
bot.dialog('VRUsing', [
    function (session, args, next){
        if (args.intent != null){
            var VRintent = args.intent;
            var model = builder.EntityRecognizer.findEntity(VRintent.entities, 'VRmodel');
        }

        var noteVR = session.dialogData.noteVR = {
            model: model? model.entity: null,
        };


        if (!noteVR.model){
            builder.Prompts.choice(session, 'Which model do you want to try?', "[Sky Model](http://skyvr.azurewebsites.net/)|[Mushroom Model](http://mushroomfieldvr.azurewebsites.net/)", { listStyle: builder.ListStyle.button });
        }
        else {
            next();
        }
    },
    function (session, results){
        var noteVR = session.dialogData.noteVR;
        if (results.response){
            noteVR.model = results.response.entity;
        }
        if (noteVR.model === "sky"||"sky model"||"Sky Model"){
            session.send("[Ready to bring you to sky](http://skyvr.azurewebsites.net/)");
        }
        if (noteVR.model === "Mushroom Model"||"mushroom"||"mushroom model"){
            session.send("[Let's visit our mushroom](http://mushroomfieldvr.azurewebsites.net/)");
        }
    }
]).triggerAction({
    matches: 'VR'
})

// Die State:
bot.dialog('Die', 
    (session) => {
        // Sending message to husband:
        sms_client.messages.create({
            to: "+14438086169",
            from: '+14102042169',
            body: "Your wife is really depressed now. She just talked with me that she want to commit sucide. You should talk with her." 
            });
        
        session.send("Calm down. Your life is the most important right now");
        session.endDialog();
    }
).triggerAction({
    matches: 'Die'
})


// End Conversation:
bot.dialog('End',
    (session) => {
        const ends = require('./end.js');
        session.send(ends());
        session.endDialog();
    }
).triggerAction({
    matches: 'End'
})

var DepressAns = {
    "Not at all":{
        score: 1
    },
    "Several days":{
        score: 2
    },
    "More than half of the days":{
        score: 3
    },
    "Nearly every day":{
        score: 4
    }
};

// Depress:
bot.dialog('Depression', [
    function (session, args, next){
        var Dintent = args.intent;
        var source = builder.EntityRecognizer.findEntity(Dintent.entities, 'DepressSource');

        var note = session.dialogData.note = {
            source: source? source.entity : null,
        };

        if (!note.source){
            builder.Prompts.choice(session, "Please tell me which source makes you feel depressed", "baby|family|husband|work", { listStyle: builder.ListStyle.button });
        }
        else{
            next();
        }
    },
    function (session, results){
        var note = session.dialogData.note;
        if (results.response.entity){
            note.source = results.response.entity;
        }
        if (note.source === 'baby'){
            session.send("More than 4 million babies are born in this country each year, and the vast majority arrive healthy and full-term. But that doesn't stop moms-to-be from worrying about, well, about almost everything when it comes to their developing baby.");
            session.send("I think it is normal if you feel a little bit of stress.");
        }
        if (note.source === 'husband'){
            session.send("It will be a good way if you discuss your stress with your husband. He will be back soon! He is preparing to welcome a new member with you.");
        }
        if (note.source === 'family'){
            session.send("Family will always be there for you. They will always a strong foundation for you. Don't feel hesitate to discuss with them");
        }
        if (note.source === 'work'){
            session.send("Working is hard and it seems to be way harder in your case now. Remember your first priority is your baby still. Taking enough rest, food and fluid will give you energy to accomplish your work. More than that, enjoying your work station by hanging some cute baby things. Think about your baby will boost you up even in extreme cases.");
            session.send("However, do not strain yourself too much! A couple days off are totally acceptable.");
        }
        
        builder.Prompts.choice(session, "Do you want to try some exercises", "VR Meditation|Do 3 minute test", { listStyle: builder.ListStyle.button });            
    },
    function (session, results){
        if (results.response.entity == "VR Meditation"){
            session.send("Taking you to VR experience.");
            session.beginDialog('Select');
        }else{
            session.beginDialog('test');
        }
    }
]).triggerAction({
    matches: 'Depress'
})

bot.dialog('test', [
    function(session){
        session.conversationData.answer = new Array();
        session.conversationData.answer.push({
            score: 0
        })
        builder.Prompts.choice(session, "Little interest or pleasure in doing things", DepressAns,{ listStyle: builder.ListStyle.button });
    },
    function(session, results){
        var ans = DepressAns[results.response.entity];
        session.conversationData.answer[0].score += ans.score;
        session.conversationData.answer.push(ans);
        builder.Prompts.choice(session, "Feeling down, depressed, or hopeless", DepressAns,{ listStyle: builder.ListStyle.button });
    },
    function(session, results){
        var ans = DepressAns[results.response.entity];
        session.conversationData.answer[0].score += ans.score;
        session.conversationData.answer.push(ans);
        builder.Prompts.choice(session, "Trouble falling or staying asleep, or sleeping too much", DepressAns,{ listStyle: builder.ListStyle.button });
    }, 
    function(session, results){
        var ans = DepressAns[results.response.entity];
        session.conversationData.answer[0].score += ans.score;
        session.conversationData.answer.push(ans);
        builder.Prompts.choice(session, "Poor appetite or overeating", DepressAns,{ listStyle: builder.ListStyle.button });
    },
    function(session, results){
        var ans = DepressAns[results.response.entity];
        session.conversationData.answer[0].score += ans.score;
        session.conversationData.answer.push(ans);
        builder.Prompts.choice(session, "Feeling bad about yourself - or that you are a failure or have let yourself or your family down", DepressAns,{ listStyle: builder.ListStyle.button });
    },
    function(session, results){
        var ans = DepressAns[results.response.entity];
        session.conversationData.answer[0].score += ans.score;
        session.conversationData.answer.push(ans);
        builder.Prompts.choice(session, "Trouble concentrating on things, such as reading the newspaper or watching television", DepressAns,{ listStyle: builder.ListStyle.button });
    },
    function(session, results){
        var ans = DepressAns[results.response.entity];
        session.conversationData.answer[0].score += ans.score;
        session.conversationData.answer.push(ans);
        builder.Prompts.choice(session, "Moving or speaking so slowly that other people could have noticed", DepressAns,{ listStyle: builder.ListStyle.button });
    },
    function(session, results){
        var ans = DepressAns[results.response.entity];
        session.conversationData.answer[0].score += ans.score;
        session.conversationData.answer.push(ans);
        builder.Prompts.choice(session, "Thoughts that you would be better off dead, or of hurting yourself", DepressAns,{ listStyle: builder.ListStyle.button });
    },
    function(session, results){
        var ans = DepressAns[results.response.entity];
        session.conversationData.answer[0].score += ans.score;
        session.conversationData.answer.push(ans);   
        session.send(session.conversationData.answer[0].score);
    },
    function(session){
        if (session.conversationData.answer[0].score <= 8){
            session.send("You should not worried. Everything is OK");
        }
        if (session.conversationData.answer[0].score > 8 && session.conversationData.answer[0].score <= 16){
            session.send("You should take care for your self. It will be good for you and your baby.");
        } 
        if (session.conversationData.answer[0].score > 16 && session.conversationData.answer[0].score <= 24){
            session.send("You should take care for your self. It will be good for you and your baby.");
        } 
        if (session.conversationData.answer[0].score > 24 && session.conversationData.answer[0].score <= 32){
            session.send("You should take care for your self. It will be good for you and your baby.");
        }   
    }
    ]);