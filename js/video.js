// var slider = document.getElementById("myRange");



// var frameNumber = 0, // start video at frame 0
//     // lower numbers = faster playback
//     playbackConst = 2, 
//     // get page height from video duration
//     setHeight = document.getElementById("set-height"), 
//     // select video element         
//     vid = document.getElementById('v0'); 
//     // var vid = $('#v0')[0]; // jquery option

// // dynamically set the page height according to video length
// // vid.addEventListener('loadedmetadata', function() {
// //   setHeight.style.height = Math.floor(vid.duration) * playbackConst + "px";
// // });


// // Use requestAnimationFrame for smooth playback
// function scrollPlay(){  
//   var frameNumber  = slider.value/playbackConst;
//   vid.currentTime  = frameNumber;
//   window.requestAnimationFrame(scrollPlay);
// }

// window.requestAnimationFrame(scrollPlay);








//Created by Jordi Cenzano 07/2016

//Use this HTML as player
var playerHtml = `
    <canvas id="myVideoCanvas" width="854" height="480">
    Your browser does not support the HTML5 canvas tag.
    </canvas>
    <canvas id="myFrameVideoAudioProgress" width="854" height="10"></canvas>
    <div id="myFrameDownloadProgress">
        <div id="myBar"></div>
        <div id="myPos"></div>
        <div id="myFrameTC"></div>
        <div id="myFrameInfo"></div>
    </div>
    <div id="myButtonsBarCanvas">
        <div id="myButtonPlay"></div>
    </div>
`;

//Get the player element
var elemPlayer = document.getElementById('JocPlayer');

//Get source url
//var srcUrl =elemPlayer.getAttribute("src");
//setSourceUrl(srcUrl);

//Replace player div
elemPlayer.innerHTML = playerHtml;

//Capture the click in the scrubbing bar
document.getElementById('myFrameDownloadProgress').onmousedown = function(eClick) {

    //console.log("onmousedown");

    var absOffset = document.getElementById('myFrameDownloadProgress').getBoundingClientRect();

    //var x = eClick.offsetX;
    var x = eClick.pageX - absOffset.left;
    var w = document.getElementById('myFrameDownloadProgress').offsetWidth;
    var percent = (x+1) / w;

    //console.log("Down offX: " + x.toString() + ". Width: " + w + ". Percent: " + percent);

    showFramePercent(percent);
};

//Capture the drag in the scrubbing bar
document.getElementById('myFrameDownloadProgress').onmousemove = function(eClick) {

    //console.log("mousemove");

    //Left click
    if (eClick.which == 1) {
        var absOffset = document.getElementById('myFrameDownloadProgress').getBoundingClientRect();
        var x = eClick.pageX - absOffset.left;
        //var x = eClick.offsetX;
        var w = document.getElementById('myFrameDownloadProgress').offsetWidth;
        var percent = (x+1) / w;

        //console.log("Move: " + x.toString() + " w: " + w);

        showFramePercent(percent);
    }
};

//Capture the click in the scrubbing bar
document.getElementById('myButtonPlay').onmousedown = function(eClick) {
    startPlay();
};

//Capture document keydown
document.addEventListener("keydown", keyDown, false);

//Capture document keydown
document.addEventListener("keyup", keyUp, false);