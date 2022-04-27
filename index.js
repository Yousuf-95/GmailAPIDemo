require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');
const multer = require('multer');
const MailComposer = require('nodemailer/lib/mail-composer');

const app = express();
app.use(express.json());


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
  
        // Uploads is the Upload_folder_name
        cb(null, "uploads")
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  });

  const upload = multer({
      storage: storage
  });

const SCOPES = [
        'https://mail.google.com/',
        'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',];
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
// fs.readFile('credentials.json', (err, content) => {
//     if (err) return console.log('Error loading client secret file:', err);
//     // Authorize a client with credentials, then call the Gmail API.
//     authorize(JSON.parse(content), listLabels);
// });

async function authorize(credentials, callback,res) {
    const { client_secret, client_id, redirect_uris } = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback,res);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client,res);
    });
}


function getNewToken(oAuth2Client, callback,res) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client,res);
        });
    });
}


//Lists the labels in the user's account.
async function listLabels(auth,res) {
    const gmail = google.gmail({ version: 'v1', auth });
    const response = await gmail.users.labels.list({
        userId: 'me',
    });
    
    const myLabels = {};
    response.data.labels.forEach((label, index) => {
        myLabels[index] = label.name;
    });
    console.log(myLabels);
    res.send(myLabels);
    
};

//Get Profile details
async function getProfileDetails(auth,res) {
    const gmail = google.gmail({ version: 'v1', auth });
    const result = await gmail.users.getProfile({
        userId: 'me',
    });
    res.send(result.data);
}

//List last 5 emails (response is just message/email ids)
async function listEmail(auth,res) {
    const gmail = google.gmail({ version: 'v1', auth });
    const result = await gmail.users.messages.list({
         includeSpamTrash: false,
         maxResults: 5,
         userId: 'me',
    });
    
    res.send(result.data);
}


//Make a body
function makeBody(to, from, subject, message) {
    var str = ["Content-Type: text/plain; charset=\"UTF-8\"\n",
    "MIME-Version: 1.0\n",
    "Content-Transfer-Encoding: 7bit\n",
    "to: ", to, "\n",
    "from: ", from, "\n",
    "subject: ", subject, "\n\n",
    message
].join('');

var encodedMail = new Buffer(str).toString("base64").replace(/\+/g, '-').replace(/\//g, '_');
return encodedMail;
}

//Send Email
// async function sendEmail(auth,res) {
//     var raw = makeBody('praveen.dung@qualyval.com', 'yf.yousuf95@gmail.com', 'Email from NodeJS', 'This Email was sent using NodeJS GoogleAPI');
//     const gmail = google.gmail({version: 'v1', auth});
//     const result = await gmail.users.messages.send({
//         auth,
//         userId: 'me',
//         resource: {
//             raw
//         }
//     });

//     console.log(result.data);

//     res.send(result.data);
// }
async function sendEmail(auth,res) {
    console.log(auth);

    const content = fs.readFileSync('uploads\\text1.txt');

    //can be converted to 'base64' but '7bit' encoding works fine
    // const contentInBase64 = content.toString('base64');

    let mail = new MailComposer(
        {
          to: "yf.yousuf95@gmail.com",
          text: "Testing using nodemailer",
          html: " <strong> Email with Attachment </strong>",
          subject: "Testing email with attachment",
          textEncoding: "base64",
          attachments: [
            {   // encoded string as an attachment
              filename: 'text1.txt',
              content,
              encoding: '7bit'
            }
          ]
        });

        mail.compile().build( (error, msg) => {
            if (error) return console.log('Error compiling email ' + error);
        
            const encodedMessage = Buffer.from(msg)
              .toString('base64')
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '');
        
            const gmail = google.gmail({version: 'v1', auth});
            gmail.users.messages.send({
              userId: 'me',
              resource: {
                raw: encodedMessage,
              }
            }, (err, result) => {
              if (err) return console.log('NODEMAILER - The API returned an error: ' + err);
        
              console.log("NODEMAILER - Sending email reply from server:", result.data);
            });
        
          });
}

//Routes

//Get all labels
app.get('/getLabels', async (req, res) => {

    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Gmail API.
        authorize(JSON.parse(content), listLabels, res);
    });
});

//Get current profile info
app.get('/getProfileInfo', async (req,res) => {
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Gmail API.
        authorize(JSON.parse(content), getProfileDetails,res);
    });
});

//List last 5 emails
app.get('/listEmail', async (req,res) => {
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Gmail API.
        authorize(JSON.parse(content), listEmail,res);
    });
});


//Send an Email
app.post('/sendEmail', async (req,res) => {
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Gmail API.
        authorize(JSON.parse(content), sendEmail,res);
    });
});

app.listen(3001, () => console.log('Server listening on port 3001'));