//networking
const http = require("http");
const ip = require("ip");

//transfer
const mime = require('mime-types');
const ImageDataURI = require('image-data-uri');

//filesystem
const fs = require("fs");
const { data } = require("jquery");
const { dirname } = require("path");

//encryption
const bcrypt = require('bcryptjs');
const EncryptRsa = require('encrypt-rsa').default;
const JSEncrypt = require('node-jsencrypt');
const Aesjs = require('aes-js');

//scheduling
const Schedule = require('node-schedule');
const { hasUncaughtExceptionCaptureCallback } = require("process");

const host = ip.address();
const port = 8000;
const port2 = 8080;

const encryptRsa = new EncryptRsa();
var publicKey, privateKey;

var dataDirectories = [
    "displayables",
    "profiles",
    "schedule"
]

//-----------------Upload Server

//-----------Images
function alterImages(request_data, req){//
    var newFiles = request_data.data.newFiles,
        dataUris = request_data.data.dataUris,
        path = __dirname + req.url + request_data.directory;
        
    //save new files
    for(var i = 0; i < newFiles.length; i++){
        if(!dataUris[i].includes(newFiles[i])){
            console.log(path + newFiles[i]);

            try{
                decodedImage = ImageDataURI.decode(dataUris[i]);
                
                fs.writeFile(path + newFiles[i], decodedImage.dataBuffer, function(err){if (err) throw err;});
            }
            catch(err){
                //remove from newFiles on error
                console.log(err);
                newFiles.splice(i, 1);
                dataUris.splice(i, 1);
                i--;
            }
            
        }
    }

    //delete files
    fs.readFile(path + "info.json", function(err, data){
        if(err){
            throw err;
        };

        currentFiles = JSON.parse(data);

        for(var i = 0; i < currentFiles.length; i++){
            if(!newFiles.includes(currentFiles[i])){
                fs.unlink(path + currentFiles[i], function(err){if (err) throw err;});
            }
        };

        //save new info file
        fs.writeFile(path + "info.json", JSON.stringify(newFiles), function(err){if (err) throw err;});
    })
}

function ImageUpload(request_data, req){
    if(request_data.action == "alter"){
        alterImages(request_data, req);
    }
}

//----------Profiles
function alterProfiles(request_data, req){//
    var newFiles = request_data.data.newFiles,
        data = request_data.data.data,
        path = __dirname + req.url + request_data.directory;
        
    //save new files
    for(var i = 0; i < newFiles.length; i++){  
        console.log(path + newFiles[i]);

        try{
            fs.writeFileSync(path + newFiles[i] + ".txt", JSON.stringify(data[i]), function(err){if (err) throw err;});
        }
        catch(err){
            newFiles.splice(i, 1);
            i--;
        }
    }

    //delete files
    fs.readFile(path + "info.json", function(err, data){
        if(err){
            throw err;
        };

        currentFiles = JSON.parse(data);

        for(var i = 0; i < currentFiles.length; i++){
            if(!newFiles.includes(currentFiles[i])){
                fs.unlinkSync(path + currentFiles[i] + ".txt", function(err){if (err) throw err;});
            }
        };

        //save new info file
        fs.writeFileSync(path + "info.json", JSON.stringify(newFiles), function(err){if (err) throw err;});
    })
}


async function ProfileUpload(request_data, req){
    if(request_data.action == "alter"){
        alterProfiles(request_data, req);
    }
}

//----------Schedule

async function alterSchedule(request_data, req){//
    var path = __dirname + req.url + request_data.directory;
        
    fs.writeFile(path + "info.json", JSON.stringify(request_data.data), function(err){if (err) throw err;});
}

async function ScheduleUpload(request_data, req){
    if(request_data.action == "alter"){
        alterSchedule(request_data, req);
    }
}

//----------General

function checkAndFixActionDependencies(actions){
    //Checks if all actions fit with oneanother

    //leave only one action per directory
    var directories = [];
    var adjustedActions = [];

    for(var action of actions){
        if(!directories.includes(action.directory)){
            directories.push(action.directory);
            adjustedActions.push(action)
        }
    }

    //check dependencies
    var images;
    var profiles;
    
    for(var i = 0; i < adjustedActions.length; i++){
        if(adjustedActions[i].directory == "displayables/"){
            if(adjustedActions[i].action == "alter"){
                images = adjustedActions[i].data.newFiles;
            }
        }else if(adjustedActions[i].directory == "profiles/"){
            if(adjustedActions[i].action == "alter"){
                profiles = adjustedActions[i].data.newFiles;

                //check profiles
                for(var j = 0; j < adjustedActions[i].data.data.length; j++){
                    var existingImages = [];
                    for(var k = 0; k < adjustedActions[i].data.data[j].files.length; k++){
                        if(images.includes(adjustedActions[i].data.data[j].files[k])){
                            existingImages.push(adjustedActions[i].data.data[j].files[k])
                        }
                    }
                    adjustedActions[i].data.data[j].files = existingImages;
                }
            }
        }else if(adjustedActions[i].directory == "schedule/"){
            if(adjustedActions[i].action == "alter"){
                var workingTimeslots = [];
                for(var j = 0; j < adjustedActions[i].data.length; j++){
                    if(profiles.includes(adjustedActions[i].data[j].profiles)){
                        workingTimeslots.push(adjustedActions[i].data[j])
                    }
                }
                adjustedActions[i].data = workingTimeslots;
            }
        }
    }

    return adjustedActions;
}

function uploadListener(req, res){// saves the file it received
    let body = '';//dataUri of Image
    req.on('data', chunk => {
        body += chunk.toString(); // convert Buffer to string
    });
    req.on('end', () => { 
        try{
            var request_data = JSON.parse(body);
            
            fs.readFile(__dirname + "/data/accounts/accountsHashed.json", function(err, data){
                if(err){
                    throw err;
                };

                //allow cross origin
                res.setHeader("Access-Control-Allow-Origin", "*");

                try{
                    var accounts = JSON.parse(data);

                    //decrypt AES Key
                    var decrypt = new JSEncrypt()

                    decrypt.setPrivateKey(privateKey);

                    var decryptedKey = new Uint8Array(JSON.parse(decrypt.decrypt(request_data.key)));

                    //decrypt message
                    var encryptedBytes = Aesjs.utils.hex.toBytes(request_data.data);

                    var aesCtr = new Aesjs.ModeOfOperation.ctr(decryptedKey, new Aesjs.Counter(5));
                    var decryptedBytes = aesCtr.decrypt(encryptedBytes);

                    var decryptedText = Aesjs.utils.utf8.fromBytes(decryptedBytes);

                    var data = JSON.parse(decryptedText);

                    //verify user
                    var correctLogin = false;
                    for(var account of accounts){
                        if(account.username == data.account.username && bcrypt.compareSync(data.account.password, account.password)){
                            correctLogin = true;
                        }
                    }

                    //Regenerate RSA keys
                    RSAKeyGen();

                    //Continue normal procedure
                    if(correctLogin){

                        data.actions = checkAndFixActionDependencies(data.actions);
                        
                        //loop through all actions provided by the request and process them
                        for(var action of data.actions){
                            if(action.directory == "displayables/"){//images
                                ImageUpload(action, req);
                            }else if(action.directory == "profiles/"){//profiles
                                ProfileUpload(action, req);
                            }else if(action.directory == "schedule/"){//timeslots
                                ScheduleUpload(action, req);
                            }
                        }

                        res.writeHead(200);
                        res.end('ok');
                    }else{
                        res.writeHead(403);
                        res.end('Wrong Username or password');
                    }
                }catch(err){
                    console.log(err)
                    res.writeHead(500);
                    res.end('Request Data Wrong');
                }
            });
        }catch(err){
            console.log(err)
            res.writeHead(500);
            res.end('Request Data Wrong');
        }
    });
}

const uploadserver = http.createServer(uploadListener);
uploadserver.listen(port2, host, () => {
    console.log(`Upload Server is running on http://${host}:${port2}`);
});

//-----------------Download Server

function readFile(path, req, res) { //read a file and respond with it
    fs.promises.readFile(path)
        .then(contents => {
            res.setHeader("Content-Type", mime.lookup(path));
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.writeHead(200);
            res.end(contents);
        })
        .catch(err => {
            console.log(err);
            return false;
        })
};

function reqcicle(req, res) { // the cicle each request goes through
    if(fs.existsSync(__dirname + req.url) && fs.statSync(__dirname + req.url).isFile()){
        path = __dirname + req.url;

        if(String(req.url).startsWith("/data/accounts/")){
            res.writeHead(403);
            res.end("Access forbidden!")
            return false;
        }
    }
    else if(fs.existsSync(__dirname + req.url + "/index.html")){
        path = __dirname + req.url + "/index.html";
    }
    else{
        path = __dirname + "/error404.html";
    };

    return readFile(path, req, res);
}

const requestListener = function (req, res) { // gets called when there is a http request
    console.log("access requested to:" + __dirname + req.url);
    
    contents = reqcicle(req, res)
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
    console.log(`Download Server is running on http://${host}:${port}`);
});

//--------Fix up old or missing directories

//data directory

fs.mkdirSync(__dirname + "/data", { recursive: true });

//displayables, profiles and schedule directory
function resetDirectory(directory){
    //resets directory
    if(fs.existsSync(directory)){
        fs.readdirSync(directory, (err, files) => {
            if (err) throw err;
          
            for (const file of files) {
                fs.unlinkSync(path.join(directory, file), (err) => {
                    if (err) throw err;
                });
            }
        });
    }else{
        fs.mkdirSync(directory);
    }

    fs.writeFile(directory + "/info.json", JSON.stringify([]), function(err){if (err) throw err;});
}

function checkDataDir(directory){
    //checks directory for functionality
    var directoryPath = path = __dirname + "/data/" + directory;

    if(!fs.existsSync(directoryPath + "/info.json")){
        resetDirectory(directoryPath);
    }
}

//check all data directories on start
for(var directory of dataDirectories){
    checkDataDir(directory);
}

//accounts directory

function checkAndResetAccounts(){
    var directoryPath = __dirname + "/data/accounts";

    var salt = bcrypt.genSaltSync(10);

    var defaultAccounts = [{username:"admin",password: bcrypt.hashSync("admin", salt)}];

    fs.mkdirSync(directoryPath, { recursive: true });

    if(!fs.existsSync(directoryPath + "/accountsHashed.json")){
        if(!fs.existsSync(directoryPath + "/accounts.json")){//regenerate Hashed accounts as default
            fs.writeFile(directoryPath + "/accountsHashed.json", JSON.stringify(defaultAccounts), function(err){if (err) throw err;});
        }else{//convert accounts.json to hashed format
            fs.promises.readFile(directoryPath + "/accounts.json").then(contents => {
                var accounts = JSON.parse(contents)

                var accountsHashed = [];

                for(var account of accounts){
                    account.password = bcrypt.hashSync(account.password, salt);

                    accountsHashed.push(account);
                }

                fs.writeFile(directoryPath + "/accountsHashed.json", JSON.stringify(accountsHashed), function(err){if (err) throw err;});

                fs.unlink(directoryPath + "/accounts.json", function(err){if (err) throw err;});
            })
        }
    }
}

checkAndResetAccounts();

//RSA directory

fs.mkdirSync(__dirname + "/data/RSA", { recursive: true });

//--------RSA key setter

function RSAKeyGen(){
    //Generate Public and Private Key

    var keys = encryptRsa.createPrivateAndPublicKeys();

    publicKey = keys.publicKey;
    privateKey = keys.privateKey;

    //Save Public Key

    fs.writeFile(__dirname + "/data/RSA/RSA.json", JSON.stringify({publicKey: publicKey}), function(err){if (err) throw err;});
}

Schedule.scheduleJob('0 0 * * *', RSAKeyGen)

RSAKeyGen();