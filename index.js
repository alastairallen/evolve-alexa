/**
* This is not an official Evolve product.
* This is a sample to demonstrate a simple skill built with the Amazon Alexa Skills Kit.
*/ 
var http = require('http');
var evolve = require('./evolve.js');
var request = require('request');
var AWS = require('aws-sdk');

var baseUrl = process.env.HOST;
var username = process.env.USERNAME;
var password = process.env.PASSWORD;
var clientId = process.env.CLIENT_ID;

var logonPath = '/uaa/login';
var appointmentPath = '/fhir/Encounter/';
var practicioner = 'participant=Practitioner/' + process.env.PRACTICIONER;
var accessToken;

// Route the incoming request based on event type (LaunchRequest, IntentRequest, etc.)
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        if (event.session.application.applicationId !== "amzn1.ask.skill.e133cb32-ae0a-4c83-bede-804924972c71") {
            context.fail("Invalid Application ID");
        }

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }
        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
}; 

function onSessionStarted(sessionStartedRequest, session) {
   console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId + 
       ", sessionId=" + session.sessionId);
} 

function onLaunch(launchRequest, session, callback) { 
   console.log("onLaunch requestId=" + launchRequest.requestId + 
       ", sessionId=" + session.sessionId);
   getWelcomeResponse(callback); 
} 

function onIntent(intentRequest, session, callback) { 
   console.log("onIntent requestId=" + intentRequest.requestId + 
       ", sessionId=" + session.sessionId); 
   var intent = intentRequest.intent, 
       intentName = intentRequest.intent.name; 
   // Dispatch to intent handlers
   if("WelcomeIntent" === intentName) { 
        getWelcomeResponse(callback);
   }
   if ("AMAZON.HelpIntent" === intentName) {
       getHelpResponse(callback); 
   } else if ("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName) { 
       handleSessionEndRequest(callback);
   } else if ("GetTomorrowsScheduleIntent" == intentName) {
       GetTomorrowsSchedule(intent, session, callback);
   } else if ("GetScheduleByDateIntent" == intentName) {
       GetTomorrowsSchedule(intent, session, callback);
   } else {
       throw "Invalid intent"; 
   } 
} 

function onSessionEnded(sessionEndedRequest, session) { 
   console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId + 
       ", sessionId=" + session.sessionId);
} 

function getWelcomeResponse(callback) {
   var sessionAttributes = {}; 
   var cardTitle = 'Evolve Schedule Reader';
   var speechOutput = 'Welcome to the Evolve. ' + 'You can ask me what your scheudle is by saying, What is my schedule for tomorrow or what is my schedule for Friday 13th March';
   var repromptText = 'Please ask me to tell you what your scheudle is by saying, What is my schedule for tomorrow';
   var shouldEndSession = false; 
   callback(sessionAttributes, 
       buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession)); 
} 
function handleSessionEndRequest(callback) {
   var cardTitle = 'Session Ended';
   var speechOutput = 'Thank you for using the Evolve Schedule Reader.';
   var shouldEndSession = true; 
   callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession)); 
}

function GetTomorrowsSchedule(intent, session, callback) {
    console.log('GetTomorrowsSchedule requestId=' + intent.requestId + ', sessionId=' + session.sessionId);
    var sessionAttributes = {};
    var cardTitle = 'Get Tomorrows Schedule';
    var repromptText = 'Please ask me to tell you your schedule saying, what is my schedule for tomorrow';
    var shouldEndSession = false;

    evolve.login(baseUrl, logonPath, username, password, clientId).then(
        (loginResponse) => {
            accessToken = JSON.parse(loginResponse).access_token;
            var searchTerm = '?date=' + getTomorrowsDate() + '&' + practicioner;
            evolve.getAppointments(baseUrl, appointmentPath, searchTerm, accessToken).then(
                (response) => {
                    var totalAppointments = JSON.parse(response).total;
                    if (totalAppointments > 0){
                        var speechOutput = getSpeechOutput(response);
                        callback(sessionAttributes,
                            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
                    }
                    else {
                        var speechOutput = 'You have no appointments scheduled for tomorrow';
                        callback(sessionAttributes,
                            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
                    }
                },
                    (error) => {
                        console.log('GetTomorrowsSchedule.  An error has occured: '+error);
                    }
            );
        }
    )
}

function GetScheduleByDate(intent, session, callback) {
    console.log('GetScheduleByDate requestId=' + intent.requestId + ', sessionId=' + session.sessionId);
    var sessionAttributes = {};
    var cardTitle = 'Get Schedule By Date';
    var schedule;
    var speechOutput = 'This intent is still under development';
    var repromptText = 'This intent is still under development';
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}


function getHelpResponse(callback) {
   var sessionAttributes = {}; 
   var cardTitle = "Evolve Help";
   var speechOutput = "You can ask to hear your schedule by saying, what's my schedule for tomorrow, or what's my schedule for Friday 13th March ";
   var repromptText = "Please ask me to tell you your schedule by saying, what's my schedule for tomorrow";
   var shouldEndSession = false; 
   callback(sessionAttributes, 
       buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession)); 
} 


// --------------- Helpers that build all of the responses ----------------------- 
function buildSpeechletResponse(title, output, repromptText, shouldEndSession) { 
   return { 
       outputSpeech: { 
           type: "PlainText", 
           text: output 
       }, 
       card: { 
           type: "Simple", 
           title: "Evolve - " + title,
           content: "" + output 
       }, 
       reprompt: { 
           outputSpeech: { 
               type: "PlainText", 
               text: repromptText 
           } 
       }, 
       shouldEndSession: shouldEndSession 
   }; 
} 
function buildResponse(sessionAttributes, speechletResponse) { 
   return { 
       version: "1.0", 
       sessionAttributes: sessionAttributes, 
       response: speechletResponse 
   }; 
}

function getTomorrowsDate(){
    if (process.env.USE_EXPLICIT_DATE == ''){
        var today = new Date();
        var dd = today.getDate()+1;
        var mm = today.getMonth()+1; //January is 0

        var yyyy = today.getFullYear();
        if(dd<10){
            dd='0'+dd;
        }
        if(mm<10){
            mm='0'+mm;
        }
        return today = dd+'-'+mm+'-'+yyyy;
    }
    else {
        return process.env.USE_EXPLICIT_DATE;
    }

}

function getSpeechOutput(response){
    var speechOutput;
    var totalAppointments = JSON.parse(response).total;
    var location = JSON.parse(response).entry[0].resource.location[0].location.display;
    var time = JSON.parse(response).entry[0].resource.period.start;
    var timeString = new Date(time).getTime().valueOf();
    var hours = new Date(timeString).getHours();
    var mins = new Date(timeString).getMinutes();
    if (mins == '0') {
        mins = 'hundred hours'
    }
    if (totalAppointments == 1) {
        speechOutput = 'You have only one appointment scheduled for tomorrow, at the ' + location + ' clinic, starting at ' + hours + ', ' + mins ;
    } else {
        speechOutput = 'You have '+ totalAppointments + ' appointments scheduled for tomorrow.';
    }
    return speechOutput;
}
