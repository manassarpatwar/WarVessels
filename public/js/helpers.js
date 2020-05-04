function select(query) {
    return document.querySelector(query);
}

function html(el, text) {
    el.innerHTML = text;
}


//AUDIO URL play cross browser : https://codepen.io/kslstn/pen/pagLqL

function playUrl(url) {

    // Check if the browser supports web audio. Safari wants a prefix.
    if ('AudioContext' in window || 'webkitAudioContext' in window) {

        //////////////////////////////////////////////////
        // Here's the part for just playing an audio file.
        //////////////////////////////////////////////////
        var play = function play(audioBuffer) {
            var source = context.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(context.destination);
            source.start();
        };

        var URL = url;
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        var context = new AudioContext(); // Make it crossbrowser
        var gainNode = context.createGain();
        gainNode.gain.value = 1; // set volume to 100%

        var urlBuffer = void 0;

        // The Promise-based syntax for BaseAudioContext.decodeAudioData() is not supported in Safari(Webkit).
        window.fetch(URL)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => context.decodeAudioData(arrayBuffer,
                audioBuffer => {
                    urlBuffer = audioBuffer;
                    play(urlBuffer);
                },
                error =>
                    console.error(error)
            ))

        // Try to unlock, so the unmute is hidden when not necessary (in most browsers).
        unlock(context);
    }
}

//////////////////////////////////////////////////
// Here's the part for unlocking the audio context, probably for iOS only
//////////////////////////////////////////////////

// From https://paulbakaus.com/tutorials/html5/web-audio-on-ios/
// "The only way to unmute the Web Audio context is to call noteOn() right after a user interaction. This can be a click or any of the touch events (AFAIK – I only tested click and touchstart)."

function unlock(context) {
    if(context === null){
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        context = new AudioContext();
    }
    console.log("unlocking")
    try{
        // create empty buffer and play it
        var buffer = context.createBuffer(1, 1, 22050);
        var source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);

        // play the file. noteOn is the older version of start()
        source.start ? source.start(0) : source.noteOn(0);
    }catch(e){}
}