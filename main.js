const http = require("http");
const fs = require("fs");
const EncryptRsa = require('encrypt-rsa').default;
const JSEncrypt = require('node-jsencrypt');
const Aesjs = require('aes-js');
const Schedule = require('node-schedule');
const mime = require('mime-types');
const ImageDataURI = require('image-data-uri');
const { data } = require("jquery");
const { dirname } = require("path");
const ip = require("ip");

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
    var new_files = request_data.data.new_files,
        dataUris = request_data.data.dataUris,
        path = __dirname + req.url + request_data.directory;
        
    //save new files
    for(var i = 0; i < new_files.length; i++){
        if(!dataUris[i].includes(new_files[i])){
            console.log(path + new_files[i]);

            try{
                decodedImage = ImageDataURI.decode(dataUris[i]);
                
                fs.writeFile(path + new_files[i], decodedImage.dataBuffer, function(err){if (err) throw err;});
            }
            catch(err){
                //remove from new_files on error
                console.log(err);
                new_files.splice(i, 1);
                i--;
            }
            
        }
    }

    //delete files
    fs.readFile(path + "info.json", function(err, data){
        if(err){
            throw err;
        };

        current_files = JSON.parse(data);

        for(var i = 0; i < current_files.length; i++){
            if(!new_files.includes(current_files[i])){
                fs.unlink(path + current_files[i], function(err){if (err) throw err;});
            }
        };

        //save new info file
        fs.writeFile(path + "info.json", JSON.stringify(new_files), function(err){if (err) throw err;});
    })
}

function ImageUpload(request_data, req){
    if(request_data.action == "alter"){
        alterImages(request_data, req);
    }
}

//----------Profiles
function alterProfiles(request_data, req){//
    var new_files = request_data.data.new_files,
        data = request_data.data.data,
        path = __dirname + req.url + request_data.directory;
        
    //save new files
    for(var i = 0; i < new_files.length; i++){  
        console.log(path + new_files[i]);

        try{
            fs.writeFile(path + new_files[i], JSON.stringify(data[i]), function(err){if (err) throw err;});
        }
        catch(err){
            new_files.splice(i, 1);
            i--;
        }
    }

    //delete files
    fs.readFile(path + "info.json", function(err, data){
        if(err){
            throw err;
        };

        current_files = JSON.parse(data);

        for(var i = 0; i < current_files.length; i++){
            if(!new_files.includes(current_files[i])){
                fs.unlink(path + current_files[i], function(err){if (err) throw err;});
            }
        };

        //save new info file
        fs.writeFile(path + "info.json", JSON.stringify(new_files), function(err){if (err) throw err;});
    })
}


function ProfileUpload(request_data, req){
    if(request_data.action == "alter"){
        alterProfiles(request_data, req);
    }
}

//----------Schedule

function alterSchedule(request_data, req){//
    var path = __dirname + req.url + request_data.directory;
        
    fs.writeFile(path + "info.json", JSON.stringify(request_data.data), function(err){if (err) throw err;});
}

function ScheduleUpload(request_data, req){
    if(request_data.action == "alter"){
        alterSchedule(request_data, req);
    }
}

//----------General

function uploadListener(req, res){// saves the file it received
    let body = '';//dataUri of Image
    req.on('data', chunk => {
        body += chunk.toString(); // convert Buffer to string
    });
    req.on('end', () => { 
        try{
            var request_data = JSON.parse(body);
            
            fs.readFile(__dirname + "/data/accounts/accounts.json", function(err, data){
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
                        if(account.username == data.account.username && account.password == data.account.password){
                            correctLogin = true;
                        }
                    }

                    //Regenerate RSA keys
                    RSAKeyGen();

                    //Continue normal procedure
                    if(correctLogin){
                        
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

function readfile(path, req, res) { //read a file and respond with it
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

        if(req.url == "/data/accounts/accounts.json"){
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

    return readfile(path, req, res);
}

const requestListener = function (req, res) { // gets called when there is a http request
    console.log("access requested to:" + __dirname + req.url);
    
    contents = reqcicle(req, res)
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
    console.log(`Download Server is running on http://${host}:${port}`);
});

//--------Create Basic Data Directories

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
    var directoryPath = path = __dirname + "/data/accounts";

    if(!fs.existsSync(directoryPath)){
        fs.mkdirSync(directoryPath);
    
        fs.writeFile(directoryPath + "/accounts.json", JSON.stringify([{username:"admin",password:"admin"}]), function(err){if (err) throw err;});
    }else if(!fs.existsSync(directoryPath + "/accounts.json")){
        fs.writeFile(directoryPath + "/accounts.json", JSON.stringify([{username:"admin",password:"admin"}]), function(err){if (err) throw err;});
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