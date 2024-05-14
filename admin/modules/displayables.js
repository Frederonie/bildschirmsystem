//import displayables from 'http://192.168.178.67:8000/data/displayables/info.json' assert {type: 'json'};
import { readTextFile } from './misc.js';
import { Profile } from './profiles.js';

var host = window.location.protocol + "//" + window.location.host;
class Image{
    static #images = [];
    #src;
    #name;
    #displays = [];

    #mainDisplay;

    constructor(name, src){
        this.#name = name.replace(/[^a-zA-Z0-9.()]/g, '');
        this.#src = src;

        this.#resolveConflicts();

        this.#createMainDisplay();

        Image.#images.push(this);
    }

    #resolveConflicts(iteration = 0, originalName = this.#name){
        //checks for naming conflicts with other Images and resolves them
        for(var image of Image.#images){
            if(image.#name == this.#name){
                iteration += 1;

                this.#name = "(" + iteration + ")" + originalName;

                this.#resolveConflicts(iteration, originalName);

                break;
            }
        }
    }

    #createMainDisplay(){
        //creates the mainDsiplay for this Image
        this.#mainDisplay = Object.assign(document.createElement("img"), {
            src: this.#src,
            classList: "image",
            onclick: this.#mainClick.bind(this),
            image: this
        });
        document.getElementById("canvasdiv").appendChild(this.#mainDisplay);
        
        //add the drag and drop event listeners
        this.#mainDisplay.addEventListener("dragstart", function(event){
            event.dataTransfer.setData("image", event.target.image.#name);
            event.dataTransfer.setData("displayNum", -1);

            this.highlightDisplays();
        }.bind(this));

        this.#mainDisplay.addEventListener("dragend", function(event){
            this.lowlightDisplays();
        }.bind(this))
    }

    //-----Instance functions

    highlightDisplays(){
        this.#mainDisplay.classList.add("highlight");

        for(var display of this.#displays){
            display.classList.add("highlight");
        }
    }

    lowlightDisplays(){
        this.#mainDisplay.classList.remove("highlight");

        for(var display of this.#displays){
            display.classList.remove("highlight");
        }
    }

    #mainClick(){//--------------------------temporary!!!!!!----------------------
        //triggers when mainElement is clicked
        this.addDisplay(Profile.activeProfile);
    }

    addDisplay(profile){
        //adds display to provided profile
        var display = Object.assign(document.createElement("img"),{
            src: this.#src, 
            classList: "image", 
            onclick: this.#displayClick,
            image: this,
            profile: profile
        });

        this.#displays.push(display);

        display.addEventListener("dragstart", function(event){
            event.dataTransfer.setData("image", event.target.image.#name);
            event.dataTransfer.setData("displayNum", this.#displays.indexOf(display));

            this.highlightDisplays();
        }.bind(this));

        display.addEventListener("dragend", function(event){
            this.lowlightDisplays();
        }.bind(this))

        display.addEventListener("dragover", function(event){
            var imageName = event.dataTransfer.getData("image");
            var displayIndex = event.dataTransfer.getData("displayNum");
            if(displayIndex >= 0){
                for(var image of Image.getImages()){
                    if(image.getName() == imageName && image != this.image){
                        //check if element to insert before or after element at position to insertion
                        var imageToInsert = image.getDisplays()[displayIndex],
                            position = this.profile.getImages().indexOf(this);

                        this.profile.moveDisplay(imageToInsert, position);
                        
                    }
                }
            }
        });
        
        profile.addDisplay(display);
    }

    #displayClick(){//--------------------------temporary!!!!!!----------------------
        //triggers when display element is clicked
        this.image.removeDisplay(this);
    }

    removeDisplay(display){
        //removes the element provided from this.displays and stopps displaying it

        var indexInDisplays = this.#displays.indexOf(display);

        if(indexInDisplays != -1){//display is part of this Image
            this.#displays.splice(indexInDisplays, 1);

            display.remove();

            //remove from parentProfile
            display.profile.removeDisplay(display);

        }else{
            throw new Error("Provided Element nor part of this Images #displays");
        }
    }

    delete(){
        //deletes the whole Image
        if(confirm("You are about to remove " + this.#name + " from all profiles and delete the file. Are you sure?")){
            for(var display of this.#displays.slice().reverse()){
                this.removeDisplay(display);
            }

            this.#mainDisplay.remove();

            Image.#images.splice(Image.#images.indexOf(this), 1);
        }
    }

    //-----Class functions

    static createImagesFromFileReader(data, profile = false){
        //create new images from data provided by a FileReader
        var i = 0,
        files = data.files,
        len = files.length;

        //Image Reader
        var reader = new FileReader();

        reader.onerror = function(event) {
            throw new Error("File could not be read! Code " + event.target.error.code);
        };
            

        reader.onload = function(event) {// loads each image, displays it and saves it
            var image = new Image(files[i].name.replace(/\s/g , "-"), event.target.result);

            if(profile){
                image.addDisplay(profile);
            }

            //reading cycle iterates through every image
            i++;
            if(i < len){
                reader.readAsDataURL(files[i]);
            };
        }.bind(this);
        
        //starts reading cycle
        reader.readAsDataURL(files[i]);
    }

    static preloadImages(){
        //preload images provided by the server
        
        readTextFile(host + "/data/displayables/info.json", function(output){
            console.log(host + "/data/displayables/info.json");
            
            for(var name of JSON.parse(output)){
                new Image(name, host + "/data/displayables/" + name);
            }
        });
    }

    //-----Getter functions

    getName(){
        return this.#name;
    }

    getSrc(){
        return this.#src;
    }

    getDisplays(){
        return this.#displays;
    }

    getMainDisplay(){
        return this.#mainDisplay;
    }

    static getImages(){
        return Image.#images;
    }

}

export {Image}