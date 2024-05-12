import {uploadChanges} from './modules/upload.js';
import {Image} from './modules/displayables.js';
import {Profile} from './modules/profiles.js';
import {Timeslot, Week, Day} from './modules/schedule.js';
import {removeElementFromArray} from './modules/misc.js';

//preload
Image.preloadImages();

Profile.preloadProfiles();

Timeslot.preloadTimeslots();

//default values
document.getElementById('weekday').valueAsDate = new Date();

//eventListener for normal import
var target = document.getElementById("yourFiles");

target.addEventListener("change", function(event){
    Image.createImagesFromFileReader(target);
}, false);


//eventlisteners for drag and drop

//insertion
var dropArea = document.getElementById("canvasdiv");

dropArea.addEventListener("dragover", function(event) {
    event.preventDefault();
}, false);

dropArea.addEventListener("drop", function(event) {
    event.preventDefault();

    let dt = event.dataTransfer

    Image.createImagesFromFileReader(dt);
}, false);

//profile creation

var profileCreator = document.getElementById("createProfile");

profileCreator.addEventListener("dragover", function(event) {
    event.preventDefault();
}, false);

profileCreator.addEventListener("drop", function(event) {
    event.preventDefault();

    var imageName = event.dataTransfer.getData("image");
    var profileName = event.dataTransfer.getData("profile");

    if(!(imageName.length === 0)){
        //create new profile from image
        
        //set color to average of image
        const fac = new FastAverageColor()

        for(var image of Image.getImages()){
            if(imageName == image.getName()){
                fac.getColorAsync(image.getMainDisplay()).then(color => {
                    new Profile({name: imageName, color: color.rgba, files: [imageName]});
                })
                .catch(e => {
                    console.log(e);
                });
            }
        }
    }else if(!(profileName.length === 0)){
        //copy old profile
        for(var profile of Profile.getProfiles()){
            if(profile.getName() == profileName){
                var profileFiles = [];
                
                for(var image of profile.getImages()){
                    profileFiles.push(image.image.getName());
                }

                new Profile({name: profile.getName(), color: profile.getColor(), files: profileFiles});
            }
        }
    }
}, false);

//deletion

var deletionZone = document.getElementById("delete");

deletionZone.addEventListener("dragover", function(event) {
    event.preventDefault();
}, false);

deletionZone.addEventListener("drop", function(event) {
    event.preventDefault();
    
    var imageName = event.dataTransfer.getData("image");
    var profileName = event.dataTransfer.getData("profile");

    if(!(imageName.length === 0)){
        //check images
        for(var image of Image.getImages()){
            if(image.getName() == imageName){
                image.delete();
                return true;
            }
        }
    }else if(!(profileName.length === 0)){
        //check profiles
        for(var profile of Profile.getProfiles()){
            if(profile.getName() == profileName){
                profile.delete();
            }
        }
    }
}, false);

//send data to Server

var sendButton = document.getElementById("sendFiles");

sendButton.onclick = sendChanges;

async function sendChanges(){
    if(localStorage.getItem("account") == null){
        //login overlay
        document.getElementById("login").style.display = "block";

        document.getElementById("creationOverlay").style.display = "block";

        document.getElementById("create").style.display = "none";

        var form = document.getElementById("loginForm");

        form.login.onclick = async function() {
            localStorage.setItem("account", JSON.stringify({username: form.username.value, password: form.password.value}));

           uploadChanges(Image, Profile, Timeslot);
        }
    }else{
        uploadChanges(Image, Profile, Timeslot);
    }
}

function sendChangesProcessResult(succesfulLogin){
    if(!succesfulLogin){
        localStorage.removeItem("account")
        sendChanges();
    }else{
        document.getElementById("login").style.display = "none";

        document.getElementById("creationOverlay").style.display = "none";

        document.getElementById("create").style.display = "block";
    }
}

//---------Profile Creation via menu

//profile creation

document.getElementById("createProfiles").onclick = function() {
    document.getElementById("create").onclick = Profile.createProfileFromForm;

    document.getElementById("profileCreation").style.display = "block";

    document.getElementById("creationOverlay").style.display= "block";
};

//----------------timeslots

//timeslot creation
function createTimeslot(){
    var form = document.getElementById("timeslotCreation");

    Timeslot.createTimeslotfromForm(form);
}

//open timeslot menu
document.getElementById("createTimeslot").onclick = function() {

    var form = document.getElementById("timeslotCreation");

    //remove prior options
    form.profiles.innerHTML = "";

    //add options
    for(var profile of Profile.getProfiles()){
        var option = document.createElement("option");
        option.text = profile.getName();
        form.profiles.add(option);
    }
    
    document.getElementById("create").onclick = createTimeslot;

    document.getElementById("timeslotCreation").style.display = "block";

    document.getElementById("creationOverlay").style.display= "block";
}

//--------week changes

document.getElementById('weekday').onchange = function() {
    var newday = new Date(document.getElementById('weekday').value)
    Week.updateWeekbyDay(newday);
}


//---------misc

//key presses
document.addEventListener('keydown', function(event) {
    const key = event.key; // "a", "1", "Shift", etc.
    //console.log(key);

    if(key == "Escape" && document.getElementById("creationOverlay").style.display == "block"){//exit creation overlay
        document.getElementById("creationOverlay").style.display= "none";
        document.getElementById("timeslotCreation").style.display = "none";
        document.getElementById("profileCreation").style.display = "none";
        document.getElementById("login").style.display = "none";

        document.getElementById("create").style.display = "block";

        document.getElementById("error").innerText = "";
    }
    else if(key == "ArrowRight"){//jump to next week
        Week.updateWeeknykw(1);
    }
    else if(key == "ArrowLeft"){//jump to prev week
        Week.updateWeeknykw(-1);
    }
});

export{sendChangesProcessResult};