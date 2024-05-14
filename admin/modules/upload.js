import "http://code.jquery.com/jquery-1.8.3.min.js";
import { readTextFile } from "./misc.js";
import { sendChangesProcessResult } from "../controller.js";

var host2 = (window.location.protocol + "//" + window.location.host).replace("8000", "8080");
var host = window.location.protocol + "//" + window.location.host;

function encrypt(text){
  //Generate random 32-Byte EAS Key
  const key = new Uint8Array(16);
  
  window.crypto.getRandomValues(key);

  //Encrypt Text

  var textBytes = aesjs.utils.utf8.toBytes(text);

  var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
  
  var encryptedBytes = aesCtr.encrypt(textBytes);

  //Convert to Hex

  var encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);

  return [encryptedHex, key]
}

function uploadChanges(Image, Profile, Timeslot){
  var actions = [];

  //Images

  var Names = [],
      dataUris = [];

  for(var image of Image.getImages()){
    Names.push(image.getName());
    dataUris.push(image.getSrc());
  }

  var images = {
    data:{
      newFiles: Names, 
      dataUris: dataUris
    },
    action: "alter", 
    directory: "displayables/"
  }

  actions.push(images)

  //Profiles

  var Names = [],
      data = [];

  for(var profile of Profile.getProfiles()){
    Names.push(profile.getData().name);
    data.push(profile.getData());
  }

  var profiles = {
    data:{
      newFiles: Names,
      data: data
    },
    action: "alter", 
    directory: "profiles/"
  }

  actions.push(profiles)

  //Timeslots

  var data = [];
  for(var timeslot of Timeslot.getTimeslots()){
    data.push(timeslot.getData());
  }

  var timeslots = {
    data: data,
    action: "alter", 
    directory: "schedule/"
  }

  actions.push(timeslots)

  //Account

  var requestData = {
    actions: actions,
    account: JSON.parse(localStorage.getItem("account")), 
  }

  //Encrypt with EAS

  var [encryptedData, EASKey] = encrypt(JSON.stringify(requestData));

  //Encrypt EAS key with RSA

  readTextFile(host + "/data/RSA/RSA.json", function(output){
    //prepare RSA
    var RSA = JSON.parse(output);

    var encrypt = new JSEncrypt();

    encrypt.setPublicKey(RSA.publicKey);

    //Encrypt the EAS key
    var encryptedkey = encrypt.encrypt(JSON.stringify(Array.from(EASKey)), true);

    //Compile

    const options = {
      method: 'POST',
      body: JSON.stringify({
        data: encryptedData,
        key: encryptedkey,
      }),
    };

    //send to server

    return fetch(host2 + '/data/', options).then(function(response) {
      if(response.status == 403){
        localStorage.removeItem("account")
        alert("Username or password incorrect")
        
        sendChangesProcessResult(false);
      }else if(response.status == 200){
        sendChangesProcessResult(true);
      }
    });

  });
}

// Call the function with the provided values. The mime type could also be png
// or webp

export {uploadChanges};