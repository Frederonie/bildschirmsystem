//import profilesrc from 'http://192.168.178.67:8000/data/profiles/info.json' assert {type: 'json'};
import { Image } from './displayables.js';
import { readTextFile, removeElementFromArray } from './misc.js';
import { Timeslot } from './schedule.js';

var host = window.location.protocol + "//" + window.location.host;
class Profile{
    static #profiles = [];
    static activeProfile = false;
    
    #mainDiv;
    #headlineDiv;
    #nameDiv;
    #colorChanger;
    #imageDiv;
    #images = [];
    #data;

    constructor(data){
        this.#data = data;

        //this.#data.name = this.#data.name.replace(/\s/g , "");//remove spaces

        this.#data.name = this.#data.name.replace(/[^a-zA-Z0-9.()]/g, '');

        this.#resolveConflicts();

        Profile.#profiles.push(this);

        this.#mainDiv = Object.assign(document.createElement("div"), {
            classList: "profile",
            draggable: true,
            onclick: this.setActive.bind(this), //----------------------------------temporary
            profile: this
        });

        //drag and drop events
        this.#mainDiv.addEventListener("dragstart", function(event){
            if(event.dataTransfer.getData("image") === ""){
                event.dataTransfer.setData("profile" , this.getName());
            
                for(var image of this.#images){
                    image.image.highlightDisplays();
                }
            }
        }.bind(this));

        this.#mainDiv.addEventListener("dragend", function(event){
            for(var image of this.#images){
                image.image.lowlightDisplays();
            }
        }.bind(this))

        //create Display
        document.getElementById("profiles").appendChild(this.#mainDiv);

        //headlineDiv
        this.#headlineDiv = Object.assign(document.createElement("div"), {
            
        });
        this.#mainDiv.appendChild(this.#headlineDiv);

        //nameDiv
        this.#nameDiv = Object.assign(document.createElement("div"), {
            textContent: this.#data.name,
            contentEditable: true,
            classList: "profileName",
            onblur: this.#updateName.bind(this)
        });
        Object.assign(this.#nameDiv.style,{
            backgroundColor: this.#data.color,
        });
        this.#headlineDiv.appendChild(this.#nameDiv);

        //colorChanger

        this.#colorChanger = Object.assign(document.createElement("input"), {
            type: "color",
            classList: "colorChanger",
            value: this.#data.color,
            oninput: this.#updateColor.bind(this)
        });
        Object.assign(this.#colorChanger.style,{
            backgroundColor: this.#data.color,
        });
        this.#headlineDiv.appendChild(this.#colorChanger);

        //imageDiv
        this.#imageDiv = document.createElement("div");
        this.#mainDiv.appendChild(this.#imageDiv);

        this.#dragAndDropSetup();

        this.#loadDisplays();

        //set profile active if there are is no active profile
        if(!Profile.activeProfile){
            this.setActive();
        }
    }

    #updateName(){
        var oldName = this.#data.name;
        
        this.#data.name = this.#nameDiv.innerText.replace(/[^a-zA-Z0-9.()]/g, '');

        this.#resolveConflicts();

        this.#nameDiv.innerText = this.#data.name;

        for(var timeslot of Timeslot.getTimeslots()){
            var indexInTimeslotProfiles = timeslot.getDate().profiles.indexOf(oldName);
            if(indexInTimeslotProfiles >= 0){
                timeslot.getData().profiles[indexInTimeslotProfiles] = this.#data.name;
            }
        }

        Timeslot.displayTimeslots();
    }

    #updateColor(){
        this.#data.color = this.#colorChanger.value;

        this.#colorChanger.style.backgroundColor = this.#data.color;

        this.#nameDiv.style.backgroundColor = this.#data.color;
    }

    #loadDisplays(){
        var files = this.#data.files;
        this.#data.files = [];

        //adds displays to Profile
        for(var file of files){ 
            for(var image of Image.getImages()){
                if(file == image.getName()){
                    image.addDisplay(this);
                }
            }
        }   
    }

    #resolveConflicts(iteration = 0, originalName = this.#data.name){
        console.log(originalName);

        //checks for and resolves naming conflicts
        for(var profile of Profile.#profiles){console.log(this.#data.name, String(profile.#data.name), String(this.#data.name) == String(profile.#data.name))
            if(profile.#data.name == this.#data.name && this != profile){
                iteration += 1;
                
                this.#data.name = "(" + iteration + ")" + originalName;

                this.#resolveConflicts(iteration, originalName);

                break;
            }
        }
    }

    #dragAndDropSetup(){
        //drag and drop into the profile
        this.#mainDiv.addEventListener("dragover", function(event) {
            event.preventDefault();
        });
        this.#mainDiv.addEventListener("drop", function(event) {
            event.preventDefault();
            
            var imageName = event.dataTransfer.getData("image");
            var profileName = event.dataTransfer.getData("profile");

            if(!(imageName.length === 0)){
                //add image
                for(var image of Image.getImages()){
                    if(image.getName() == imageName){ 
                        image.addDisplay(this);
                        return true;
                    }
                }
            }else if(!(profileName.length === 0)){
                //add all images of profile
                for(var profile of Profile.getProfiles()){
                    if(profile.getName() == profileName){
                        var images = [...profile.getImages()]
                        for(image of images){
                            image.image.addDisplay(this);
                        }
                    }
                }
            }else{
                //add unknown images to the system
                Image.createImagesFromFileReader(event.dataTransfer, this);
            }
        }.bind(this));
    }

    //-----Instance functions

    addDisplay(display){
        //adds given display object to #imageDiv and #images
        this.#imageDiv.appendChild(display);

        this.#images.push(display);

        this.#data.files.push(display.image.getName());
    }

    moveDisplay(display, position){
        //moves display to given position
        removeElementFromArray(display.profile.#images, display);
        removeElementFromArray(display.profile.#data.files, display.image.getName());
        
        if(this.#images.indexOf(display) < position){
            this.#imageDiv.insertBefore(display, this.#images[position]);
        }else{
            this.#imageDiv.insertBefore(display, this.#images[position].nextSibling);
            position++;
        }

        this.#images.splice(position, 0, display);
        this.#data.files.splice(position, 0, display.image.getName());

        display.profile = this;
    }

    removeDisplay(display){
        this.#images.splice(this.#images.indexOf(display), 1);

        removeElementFromArray(this.#data.files, display.image.getName());
    }

    delete(){
        //deletes the profile and all its displays
        for(var image of this.#images){
            image.image.removeDisplay(image);
        }

        this.#mainDiv.remove();

        Profile.#profiles.splice(Profile.#profiles.indexOf(this), 1);
    }

    setActive(){
        //sets this as active profile
        Profile.activeProfile = this;
        
        document.getElementsByClassName("edit")[0].classList.remove("edit");

        this.#mainDiv.classList.add("edit");
    }

    //-----Class functions

    static createProfileFromForm(form){
        //uses data from form and to create new Profile
        //--------------------------temporary!!!!!!----------------------needs better code
        var form = document.getElementById("profileCreation");

        new Profile({name: form.name.value.replace(/\s/g , "-"), color: form.color.value, files: []});
        
        //reset creation overlay
        document.getElementById("profileCreation").style.display = "none";

        document.getElementById("creationOverlay").style.display= "none";

        document.getElementById("error").innerText = "";
    }

    static preloadProfiles(){
        //preloads profiles from server
        readTextFile(host + "/data/profiles/info.json", function(output){
            for(var profile of JSON.parse(output)){
                var file = host + "/data/profiles/" + profile + ".txt";

                readTextFile(file, function(output){
                    var data = JSON.parse(output);
            
                    new Profile(data);
                })
            }  
        });
    }

    //-----Getters

    getName(){
        return this.#data.name;
    }

    getColor(){
        return this.#data.color;
    }

    getData(){
        return this.#data;
    }

    getImageDiv(){
        return this.#imageDiv;
    }

    getImages(){
        return this.#images;
    }

    static getProfiles(){
        return this.#profiles;
    }
}

export {Profile};