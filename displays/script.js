function readdataFile(file, callback) {
    var rawFile = new XMLHttpRequest();
    rawFile.overrideMimeType("application/json");
    rawFile.open("GET", file, true);
    rawFile.onreadystatechange = function() {
        if (rawFile.readyState === 4 && rawFile.status == "200") {
            callback(rawFile.responseText);
        }
    }
    rawFile.send(null);
}

var imgdiv = document.getElementById("imgdiv"),
    element = 0,
    interval = 5000,
    images = [],
    winDim = getWinDim();

var host = window.location.protocol + "//" + window.location.host;

function getWinDim()
{
    var body = document.documentElement || document.body;

    return {
        x: window.innerWidth  || body.clientWidth,
        y: window.innerHeight || body.clientHeight
    }
}

var srcList = false;

function loadImages(data){ //loads images of new profile
    var profileSrcs = JSON.parse(data).files

    if(profileSrcs != srcList){
        srcList = profileSrcs;

        for(var image of images){//clear images
            image.remove()
        }
        images = [];
        
        for(var src of srcList){
            var image = document.createElement("img");

            //adjust size on load
            image.addEventListener('load', function() {
                if (image.offsetWidth > winDim.x)
                {
                    image.style["margin-top"] = (winDim.y - (image.style.width / winDim.x * image.style.height)) / 2 + "px";// cant center vertically
        
                    image.style.height = null;
                    image.style.width = winDim.x + "px";
                }
            });

            image.onerror = function(err) {
                console.log("Error:" + err);
            };

            imgdiv.appendChild(image);

            image.src = "data/displayables/" + src;

            image.style.height = winDim.y + "px";

            image.style["margin"] = "auto";

            image.style.display = "none";

            images.push(image);
        }
        
        //set current image in accordance with time
        var timeintoloop = Date.now() % (interval * srcList.length),
            currentimage = Math.floor(timeintoloop / interval);

        images[currentimage].style.display = "block";

        element = currentimage;
    }
}

function getProfile(){ // gets the current profile
    setTimeout(getProfile, interval - (Date.now() % interval));

    readdataFile(host + "/data/schedule/info.json", function(output) {
        var timeslots = JSON.parse(output),
            currentprofile = "main",
            currentpriority = false;

        for(var timeslot of timeslots){
            var indaterange = Date.now() >= new Date(timeslot.startDate).getTime() && Date.now() <= new Date(timeslot.endDate).getTime();
            
            var starttime = new Date(Date.now());
            starttime.setHours(timeslot.startTime.slice(0, 2), timeslot.startTime.slice(3, 5));
            var endtime = new Date(Date.now());
            endtime.setHours(timeslot.endTime.slice(0, 2), timeslot.endTime.slice(3, 5));

            var intimerange = Date.now() >= starttime && Date.now() <= endtime;

            if(indaterange && intimerange && (!currentpriority || timeslot.priority >= currentpriority)){
                currentprofile = timeslot.profiles;
                currentpriority = timeslot.priority;
            }
        }
        try{
            readdataFile(host + "/data/profiles/" + currentprofile + ".txt", data => loadImages(data));
        }catch(err){
            console.log(err);
        }
    });
}

function updateimg() { // loads next image
    setTimeout(updateimg, interval - (Date.now() % interval));
    images[element].style.display = "none";

    element = (element + 1) % images.length;

    images[element].style.display = "block";
};

window.onload = function() {
    getProfile();

    console.log(interval - (Date.now() % interval));

    setTimeout(getProfile, interval - (Date.now() % interval));

    setTimeout(updateimg, interval - (Date.now() % interval));
}