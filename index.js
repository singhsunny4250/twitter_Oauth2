require('dotenv').config()
const express = require('express')
const path = require('path');
const router = express.Router();
var cluster = require('cluster')
var bodyParser = require('body-parser');
const { TwitterApi } = require('twitter-api-v2');

// const router = express.Router();

// const { r } = require('tar');
const { pid } = require('process');
// const { default: axios } = require('axios');

var port = process.env.PORT || 4000;
process.env.NODE_NO_WARNINGS = 1;

var cCPUs = 1;
var now = (function(){
    var year = new Date(new Date().getFullYear().toString()).getTime();
    return function(){
        return Date.now()
    }
})();

if(cluster.isMaster){
    for(var i = 0; i < cCPUs; i++){
        cluster.fork();
    }

    cluster.on('online', function(worker){
        console.log('Product Worker ' + worker.process.pid + ' is online');
    });
    cluster.on('exit', function(worker, code, signal){
        console.log('Worker ' + worker.process.pid + ' died');
    });
}else{

// ###################################################################

    var app = express();

    app.use(bodyParser.urlencoded({
        extended:true
    }));

    app.use(bodyParser.json());

    app.listen(port);



    app.get('/auth/twitter', async function(req, res){
        const client = new TwitterApi({ clientId: process.env.TWITTER_CLIENT_ID, clientSecret: process.env.TWITTER_CLIENT_SECRET });
        const { url, codeVerifier, state } = client.generateOAuth2AuthLink(`${process.env.TWITTER_CALLBACK_URL}`, { scope: ['tweet.read', 'users.read'] });

        process.env.state = state;
        process.env.codeVerifier = codeVerifier;

        console.log(url, " = url");
        res.redirect(url);
    });



    app.get('/auth/twitter/callback', (req, res) => {
        console.log("hello !!!!!!!!!!!!!!!!!!!!!!")
        const { state, code } = req.query;
        const { codeVerifier, state: sessionState } = req.session;
        if (!codeVerifier || !state || !sessionState || !code) {
            return res.status(400).send('You denied the app or your session expired!');
        }
        if (process.env.state !== sessionState) {
            return res.status(400).send('Stored tokens didnt match!');
        }
        const client = new TwitterApi({ clientId: process.env.TWITTER_CLIENT_IDCLIENT_ID, clientSecret: process.env.TWITTER_CLIENT_SECRET });

        client.loginWithOAuth2({ code, codeVerifier, redirectUri: 'https://about.cosmofeed.com/' })
            .then(async ({ client: loggedClient, accessToken, refreshToken, expiresIn }) => {
                process.env.TWITTER_ACCESS_TOKEN = accessToken
                process.env.TWITTER_REFRESH_TOKEN = refreshToken
                const { data: userObject } = await loggedClient.v2.me();
            })
            .catch(() => res.status(403).send('Invalid verifier or access tokens!'));

        })
}