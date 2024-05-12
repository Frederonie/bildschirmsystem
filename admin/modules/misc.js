function readTextFile(file, callback) {
    var rawFile = new XMLHttpRequest();
    rawFile.overrideMimeType("application/json");
    rawFile.open("GET", file, true);
    console.log(file);
    rawFile.send(null);
    rawFile.onreadystatechange = function() {
        if (rawFile.readyState === 4 && rawFile.status == "200") {
            callback(rawFile.responseText);
        }
    }
}

function getStartofDay(d){
    return new Date(d.getTime() - ((d.getTime() - d.getTimezoneOffset() * 60 * 1000) % (24 * 60 * 60 * 1000)));//current time - (current time - timezoneoffset in milliseconds) % one day in milliseconds
}

function getMonday(d) {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
    
    d.setDate(diff)

    return getStartofDay(d);
}

function removeElementFromArray(array, element){
    try{
        array.splice(array.indexOf(element), 1);
    }
    catch(error){
        throw error;
    }
}

export{readTextFile, getMonday, removeElementFromArray};