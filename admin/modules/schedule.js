import { getMonday, readTextFile, removeElementFromArray } from './misc.js';
import { Profile } from './profiles.js';

var host = window.location.protocol + "//" + window.location.host;

class Timeslot{
    static #timeslots = [];
    #displays = [];
    #infoDisplay;
    #data;

    constructor(data){
        this.#data = data;
        this.#data.startDate = new Date(this.#data.startDate);
        this.#data.endDate =  new Date(this.#data.endDate);

        Timeslot.#timeslots.push(this);

        //dsiplay Timeslot
        var startString = Day.getWeekdayNames()[this.#data.startDate.getDay()] + " " + this.#data.startDate.getDate() + "." + (this.#data.startDate.getMonth() + 1),
            endString = Day.getWeekdayNames()[this.#data.endDate.getDay()] + " " + this.#data.endDate.getDate() + "." + (this.#data.endDate.getMonth() + 1);

        this.#infoDisplay = Object.assign(document.createElement("div"), {
            classList: "timeslotBox",
            onclick: this.delete.bind(this),
            innerHTML: this.#data.profiles + ":<br>" + startString + " - " + endString + "<br>" + this.#data.startTime + " - " + this.#data.endTime + "<br>" + this.#data.priority
        });
        Object.assign(this.#infoDisplay.style, {
            backgroundColor: this.#data.color
        });
        
        document.getElementById("timeslots").appendChild(this.#infoDisplay);
    }

    #display(){
        //displays this Timeslot in week
        this.#removeDisplays();

        for(var day of Week.getWeek().getWeekdays()){
            if(this.#checkDayOverlap(day)){
                var displayHeight = (this.#data.endTime.slice(0, 2) * 60 + parseInt(this.#data.endTime.slice(3, 5)) - this.#data.startTime.slice(0, 2) * 60 + parseInt(this.#data.startTime.slice(3, 5))) / 2;

                var displayMarginTop = (this.#data.startTime.slice(0, 2) * 60 + parseInt(this.#data.startTime.slice(3, 5))) / 2;

                this.#displays.push(Object.assign(document.createElement("div"), {
                    classList: "timeslotBox",
                    textContent: this.#data.profiles + " " + this.#data.startTime + " - " + this.#data.endTime + " " + this.#data.priority,
                    onclick: this.delete.bind(this)
                }));
                Object.assign(this.#displays[this.#displays.length - 1].style, {
                    backgroundColor: this.#data.color,
                    marginTop: displayMarginTop + "px",
                    height: displayHeight + "px",
                    zIndex: this.#data.priority
                });
                

                day.getTimeslotDiv().appendChild(this.#displays[this.#displays.length - 1]);
            }
        }
    }

    #checkDayOverlap(day){
        //checks if the time of the this timeslot overlaps with the day
        if(day.getDate().getTime() >= this.#data.startDate && day.getDate().getTime() <= this.#data.endDate){
            return true;
        }
        return false;
    }

    #removeDisplays(){
        //removes all #displays of this Timeslot

        for(var display of this.#displays){
            display.remove();
        }

        this.#displays = [];
    }

    //-----Instance functions

    delete(){
        //deletes current timeslot
        this.#removeDisplays();

        this.#infoDisplay.remove();

        removeElementFromArray(Timeslot.#timeslots, this);
    }

    //-----Class functions

    static displayTimeslots(){
        //displays all Timeslots in week
        for(var timeslot of this.#timeslots){
            timeslot.#display();
        }
    }

    static createTimeslotfromForm(form){
        //creates Timeslot from given form

        //create object with all the data

        var startDate = new Date(form.startDate.value)
        var endDate = new Date(form.endDate.value)

        var color;

        for(var profile of Profile.getProfiles()){
            if(profile.getName() == form.profiles.value){
                color = profile.getColor();
            }
        }

        var data = {
            profiles: form.profiles.value,
            //targets: form.targets.value,

            startTime: form.startTime.value,
            endTime: form.endTime.value,

            startDate: startDate.setTime(startDate.getTime() + startDate.getTimezoneOffset() * 60 * 1000),
            endDate: endDate.setTime(endDate.getTime() + endDate.getTimezoneOffset() * 60 * 1000),

            priority: form.priority.value,
            //tags: form.tags.value,

            color: color,
        }

        //display error messages
        var errorDisplay = document.getElementById("error");

        var time_correct = (data.endTime.slice(0, 2) * 60 + parseInt(data.endTime.slice(3, 5))) > (data.startTime.slice(0, 2) * 60 + parseInt(data.startTime.slice(3, 5))),
            date_correct = data.startDate <= data.endDate,
            priority_correct = data.priority >= 0;

        if(!time_correct){
            errorDisplay.innerText = "Endtime must be greater than Starttime";
        }else if(!date_correct){
            errorDisplay.innerText = "Enddate must be greater than or equal to Startdate";
        }else if(!priority_correct){
            errorDisplay.innerText = "Priority must be at least 0";
        }else{
            //create new timeslot
            new Timeslot(data);

            Timeslot.displayTimeslots();

            document.getElementById("creationOverlay").style.display= "none";
            document.getElementById("timeslotCreation").style.display = "none";

            errorDisplay.innerText = "";
        }
    }

    static preloadTimeslots(){
        //peloads all timeslots
        readTextFile(host + "/data/schedule/info.json", function(output){
            var schedulesrc = JSON.parse(output);
    
            for(var timeslotData of schedulesrc){
                new Timeslot(timeslotData);
            }

            new Week(Date.now());
        });
    }

    //-----Getters

    getData(){
        //outputs the Data of this Timeslot as a JSON-Object
        return this.#data;
    }

    static getTimeslots(){
        return Timeslot.#timeslots;
    }
}

class Day{
    static #weekdayNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

    #date;
    #div;
    #dateDiv;
    #timeslotDiv;

    constructor(date){
        this.#date = date;

        this.#div = Object.assign(document.createElement("div"), {
            classList: "day"
        });

        this.#dateDiv = Object.assign(document.createElement("div"), {
            classList: "dateDiv",
            textContent: Day.#weekdayNames[date.getDay()] + " " + date.getDate() + "." + (date.getMonth() + 1)
        });

        this.#div.appendChild(this.#dateDiv);

        this.#timeslotDiv = Object.assign(document.createElement("div"), {
            classList: "dayDisplay"
        });

        this.#div.appendChild(this.#timeslotDiv);

        Week.getWeek().getDiv().appendChild(this.#div);
    }

    //-----Getters

    getDate(){
        return this.#date;
    }

    getTimeslotDiv(){
        return this.#timeslotDiv;
    }

    static getWeekdayNames(){
        return Day.#weekdayNames;
    }
}

class Week{
    static #weekLength = 7 * 24 * 60 * 60 * 1000;

    static #week = false;
    #weekdays = [];
    #div;

    constructor(date){
        if(Week.#week){
            Week.#week.wipe();
        }

        this.#div = Object.assign(document.createElement("div"), {
            classList: "week"
        });

        document.getElementById("schedule").appendChild(this.#div);

        var startday = getMonday(date);

        Week.#week = this;

        for(var i = 0; i < 7; i++){
            var day = new Date(startday.getTime() + i * 24 * 60 * 60 * 1000);
            this.#weekdays.push(new Day(day));
        }

        Timeslot.displayTimeslots();
    }

    //-----Instance functions

    wipe(){
        //wipes all Html nodes
        this.#div.remove();
    }

    //-----Class functions

    static updateWeekbyDay(day){
        //updates week by using a provided time
        new Week(day);
    }

    static updateWeeknykw(kw_diff){
        //updates week using provided kw difference
        new Week(new Date(Week.getWeek().getWeekdays()[0].getDate().getTime() + kw_diff * Week.#weekLength));
    }

    static preloadWeek(){
        //creates a week object
        new Week(new Date());
    }

    //-----Getters

    getDiv(){
        return this.#div;
    }

    getWeekdays(){
        return this.#weekdays;
    }

    static getWeek(){
        return Week.#week;
    }
}

export{Timeslot, Week, Day}