//Created by Jordi Cenzano 07/2016

//Stores shift key
var m_shiftPressed = false;

//Audio samples play block in ms
const MAX_AUDIO_PLAY_BLOCK_MS = 20.0 * 1000.0;

//Audio playback type enum
const en_play_type = {
    STOPPED: "stopped",
    FRAME: "frame",
    LONG_TERM: "long"
};

//Declare downloaded manifest
var m_manifest = {};

//Manifest URL data
var m_manifest_url = {};

var m_download_state = {
    "video": {
        "num_greater_downloaded_frame": -1,
        "n_frame_index_to_download": 0,
        "n_downloaded_frames": 0,
        "timer_obj": null
    },
    "audio": {
        "n_downloaded_frames": 0
    },
    "timer_obj": null
};

var m_play_state = {
    //General
    "current_frame": -1,
    "timer_obj": null,
    "forward": true,

    //Audio
    "audioCtx": null,
    "audioBufferSource": null,
    "AudioPlayingType": en_play_type.STOPPED
};

function setSourceUrl(srcUrl) {
    //Download the manifest
    downLoadManifest(srcUrl);
}

function downLoadManifest(url) {
    var xhttpreq = new XMLHttpRequest();

    m_manifest_url.url = url;

    xhttpreq.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            m_manifest = this.response;

            downloadMedia();

            expandMetadata(0);
        }
    };
    xhttpreq.responseType = 'json';
    xhttpreq.open("GET", url, true);

    xhttpreq.send(null);
}

function refreshLiveManifest () {
    if (!m_manifest.is_live) {
        clearInterval(m_download_state.timer_obj);
        return;
    }

    var xhttpreq = new XMLHttpRequest();

    xhttpreq.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var new_manifest = this.response;

            var last_expanded_index = mergeManifest(new_manifest);

            expandMetadata(last_expanded_index);

            downloadVideoFrame();
        }
    };
    xhttpreq.responseType = 'json';
    xhttpreq.open("GET", m_manifest_url.url, true);

    xhttpreq.send(null);
}

function mergeManifest(manifest) {
    var ret = 0;

    if ("video" in manifest) {
        if ((m_manifest.video.fps != manifest.video.fps) ||
            (m_manifest.video.frame_ext != manifest.video.frame_ext) ||
            (m_manifest.video.base_file_name != manifest.video.base_file_name) ||
            (m_manifest.video.base_frame_path != manifest.video.base_frame_path) ||
            (m_manifest.video.num_digits_frame != manifest.video.num_digits_frame)) {
            console.error("Incompatible video manifest refresh");
            return;
        }
    }

    if (m_manifest.video_only == false) {
        if ("audio" in manifest) {
            if ((m_manifest.audio.base_frame_path != manifest.audio.base_frame_path) ||
                (m_manifest.audio.base_file_name != manifest.audio.base_file_name) ||
                (m_manifest.audio.num_digits_frame != manifest.audio.num_digits_frame) ||
                (m_manifest.audio.frame_ext != manifest.audio.frame_ext) ||
                (m_manifest.audio.sample_rate != manifest.audio.sample_rate) ||
                (m_manifest.audio.channels != manifest.audio.channels) ||
                (m_manifest.audio.bit_per_sample != manifest.audio.bit_per_sample) ||
                (m_manifest.audio.sample_type != manifest.audio.sample_type)) {
                console.error("Incompatible audio manifest refresh");
                return;
            }
        }
    }

    if (("video" in manifest) && ("num_frames" in manifest.video)) {
        ret = m_manifest.video.num_frames;
        m_manifest.video.num_frames = manifest.video.num_frames;
    }

    return ret;
}

function expandMetadata(start_frame) {

    var video_frame_dur_ms = 1000 / m_manifest.video.fps;

    for (var f = start_frame; f < m_manifest.video.num_frames; f++) {
        var frame_info = createFrameInfo(m_manifest.frames_metadata[f - 1], m_manifest.metadata[f.toString()], video_frame_dur_ms);

        m_manifest.frames_metadata.push(frame_info);
    }
}

function createFrameInfo(last_frame_metadata, frame_metadata, frame_dur_ms) {
    var ret = {
        num: 0,
        smpte_tc: -1,
        utc_tc: 0
    };

    if ((last_frame_metadata !== null) && (typeof (last_frame_metadata) !== 'undefined')) {
        ret.num = last_frame_metadata.num + 1;

        //Optional params
        if (last_frame_metadata.smpte_tc >= 0) {
            ret.smpte_tc = last_frame_metadata.smpte_tc + 1;
        }

        if (last_frame_metadata.utc_tc > 0) {
            ret.utc_tc = last_frame_metadata.utc_tc + frame_dur_ms;
        }
    }

    // If the manifest provides info for that frame
    if (typeof (frame_metadata) === 'object') {
        mergeIntoObj(ret, frame_metadata);
    }

    return ret;
}

function downloadMedia() {

    //Download the manifest into m_manifest

    if ("audio" in m_manifest) {
        m_manifest.video_only = false;
    }
    else {
        m_manifest.video_only = true;
        m_manifest.audio = {};
    }

    if ("live" in m_manifest)
        m_manifest.is_live = true;
    else
        m_manifest.is_live = false;

    //Add empty video and audio values
    m_manifest.video.frames = [];
    m_manifest.audio.frames = [];

    //Add manifest audio samples per video/audio frame
    m_manifest.audio.samples_per_frame = m_manifest.audio.sample_rate / m_manifest.video.fps;

    //Add manifest video and audio frame duration
    m_manifest.video.frame_duration_ms = (1.0 / m_manifest.video.fps) * 1000.0;
    m_manifest.audio.frame_duration_ms = (m_manifest.audio.samples_per_frame / m_manifest.audio.sample_rate) * 1000.0;

    //Add metadata info array
    m_manifest.frames_metadata = [];

    //Start downloading frames
    downloadVideoFrame();

    //Refresh manifest if is live
    if (m_manifest.is_live)
        m_download_state.timer_obj = setInterval(refreshLiveManifest, m_manifest.live.min_chunk_dur_ms);
}

function downloadVideoFrame() {

    //Download new frame
    var nFrameIndex = m_download_state.video.n_frame_index_to_download;

    //Check last frame
    if (nFrameIndex >= m_manifest.video.num_frames)
        return;

    var dlVFrame = new Image();
    dlVFrame.frame_number = nFrameIndex;
    dlVFrame.fr_downloaded = false;

    dlVFrame.onload = function(){
        
        //Load frame in the frame array
        m_manifest.video.frames[this.frame_number] = this;
        this.fr_downloaded = true;

        //Show the download progress
        console.log("Downloaded video frame: " + this.frame_number);
        renderDownloadVideoProgress(this.frame_number, 0, m_manifest.video.num_frames - 1);
        
        //If is the 1st downloaded, then show it
        if (m_download_state.video.n_downloaded_frames <= 0)
            showFrame(this.frame_number);

        if (m_manifest.video_only == false) {
            //Download the audio for this frame
            downloadAudioFrame(this.frame_number);
        }

        m_download_state.video.n_downloaded_frames++;
    };
    
    dlVFrame.src = m_manifest.video.base_frame_path + "/" + getFrameName(m_manifest.video.base_file_name, m_manifest.video.num_digits_frame, dlVFrame.frame_number + 1, m_manifest.video.frame_ext);

    //Set next frame to download
    m_download_state.video.n_frame_index_to_download++;

    //Schedule next frame download
    var frame_delay_time = 1;
    if (m_manifest.is_live)
        frame_delay_time = ((1.0 / m_manifest.video.fps) * 1000) / 2; //Wait half a frame time

    m_download_state.video.timer_obj = setTimeout(downloadVideoFrame, frame_delay_time);

    console.log("Exit download video frame: " + nFrameIndex);

}

function downloadAudioFrame(frame_num) {

    var dlAFrameReq = new XMLHttpRequest();

    dlAFrameReq.frame_number = frame_num;

    var file_name = m_manifest.audio.base_frame_path + "/" + getFrameName(m_manifest.audio.base_file_name, m_manifest.audio.num_digits_frame, dlAFrameReq.frame_number + 1, m_manifest.audio.frame_ext);

    dlAFrameReq.open("GET", file_name, true);
    dlAFrameReq.responseType = "arraybuffer";

    dlAFrameReq.onload = function(oEvent) {

        if (this.status == 200) {
            //Load frame in the frame array
            m_manifest.audio.frames[this.frame_number] = this.response;

            //Show the download progress
            console.log("Downloaded audio frame: " + this.frame_number);
            renderDownloadAudioProgress(this.frame_number, 0, m_manifest.audio.num_frames - 1);

            m_download_state.audio.n_downloaded_frames++;
        }
        else {
            console.error("ERROR! Downloading audio frame: " + this.frame_number);
        }
    };

    dlAFrameReq.send(null);

    //This code is not working good in Chrome (bug downloading Audio() )
/*
    //Download new frame
    var dlAFrame = new Audio();
    dlAFrame.frame_number = frame_num;
    dlAFrame.fr_downloaded = false;

    dlAFrame.onloadeddata = function(){
        //Load frame in the frame array
        m_manifest.audio.frames[this.frame_number] = this;
        this.fr_downloaded = true;

        //Show the download progress
        console.log("Downloaded audio frame: " + this.frame_number);
        renderDownloadAudioProgress(this.frame_number, 0, m_manifest.audio.num_frames - 1);

        m_download_state.audio.n_downloaded_frames++;
    };

    //Set the download path and trigger the download process
    dlAFrame.src = m_manifest.audio.base_frame_path + "/" + getFrameName(m_manifest.audio.base_file_name, m_manifest.audio.num_digits_frame, dlAFrame.frame_number + 1, m_manifest.audio.frame_ext);

    //Set next frame to download
    m_download_state.audio.n_frame_index_to_download++;*/
}

function hasVideoCuePointInfo(num) {
    var ret = false;
    if (isManifestLoaded() == false)
        return ret;

    if ("metadata" in m_manifest) {
        if (num.toString() in m_manifest.metadata) {
            if ("cue_info" in m_manifest.metadata[num.toString()])
                ret = true;
        }
    }

    return ret;
}

function renderDownloadVideoProgress(num, min, max) {
    //Paint the progress
    renderDownloadMaxFrame(num, min, max);

    //Paint each frame state
    renderFrameProgress("video",num, min, max, hasVideoCuePointInfo(num));
}

function renderDownloadAudioProgress(num, min, max) {
    //Paint each frame state
    renderFrameProgress("audio", num, min, max, false);
}

function renderDownloadMaxFrame(num, min, max) {
    var elem = document.getElementById("myBar");

    if (num > m_download_state.video.num_greater_downloaded_frame)  {

        //Convert from frame num to percentage
        var p = ( (num - min) / max ) * 100.0;
        elem.style.width = p + '%';

        m_download_state.video.num_greater_downloaded_frame = num;
    }
}

//Paint every video or audio downloaded frame
function renderFrameProgress(type, num, min, total, is_cue_point) {
    var canvasElem = document.getElementById('myFrameVideoAudioProgress');
    var context = canvasElem.getContext("2d");

    //Get total element width
    var tw = canvasElem.offsetWidth;

    //Get frame width
    var fw = tw / total;
    var fh = canvasElem.offsetHeight / 2;

    //Get x frame pos
    var x = fw * (num - min);
    var y = 0;
    context.fillStyle = "#0D6382";
    if (is_cue_point == true)
        context.fillStyle = "#F1F72D";

    if (type == "audio") {
        y = canvasElem.offsetHeight / 2;
        context.fillStyle = "#0D4B82";
    }

    //console.log("x: "+ x +", y: " + y + ", fw: " + fw + ", fh: " + fh);

    context.fillRect(x , y , fw, fh);
}

function getFrameName(prepend, n_digits, num, ext) {
    var ret = num.toString();
    while (ret.length < n_digits) {
        ret = "0" + ret;
    }

    return prepend + ret + ext;
}

function showFrame(index_frame) {

    if (isManifestLoaded() == false)
        return;

    //Check if the video frame is in the array
    if ( (index_frame < m_manifest.video.frames.length) && (index_frame >= 0) ) {

        //Check if the video frame is downloaded and valid
        if ( (typeof (m_manifest.video.frames[index_frame]) !== 'undefined') && (m_manifest.video.frames[index_frame].fr_downloaded == true) ) {
            //Sound section ----

            if (m_manifest.video_only == false) {
                //Check if the user is scrubbing or playing (play rev = scrubbing)
                if (isScrubbing()) {
                    //Stop playing audio
                    if (getAudioPlayingType() == en_play_type.LONG_TERM)
                        stopAudioBuffer();

                    //Play just the audio samples that belong to the video frame
                    playAudioBuffer(index_frame, en_play_type.FRAME);
                }
                else {
                    //If the audio is not playing and we want to play, then play audio
                    if (isAudioPlaying() == false) {
                        playAudioBuffer(index_frame, en_play_type.LONG_TERM);
                    }
                }
            }

            //End sound section -----

            //Paint the frame on the canvas
            var canvasElem = document.getElementById('myVideoCanvas');
            var context = canvasElem.getContext("2d");
            
            context.drawImage(m_manifest.video.frames[index_frame], 0, 0);
            console.log("Image shown: " + index_frame);

            m_play_state.current_frame = index_frame;

            showPlayPosition();

            showFrameMetadataInfo();
        }
        else {
            //Pause in case is playing
            pause();
        }
    }
    else {
        //Pause in case is playing
        pause();
    }
}

//External function called from player
function showFramePercent(p) {
    pause();

    //Convert percentage to frame
    var index_frame = Math.floor(p * m_manifest.video.num_frames);

    showFrame(index_frame);
}

function showFrameMetadataInfo() {

    var elemTC = document.getElementById('myFrameTC');
    var elemInfo = document.getElementById('myFrameInfo');

    var textTC = "";
    var textInfo = "";

    //Get frame metadata
    var frame_info = getFrameInfo(m_play_state.current_frame);
    if (frame_info != null) {
        textTC = frame_info.num.toString();

        // Show TC
        if (("smpte_tc" in frame_info) && (frame_info.smpte_tc >= 0) && (m_manifest.video.fps > 0)) {
            textTC = textTC + ' - ' + fromSMPTETCFrameToHHMMSSFF(frame_info.smpte_tc, m_manifest.video.fps);
        }

        // Show UTC if present
        if (("utc_tc" in frame_info) && (frame_info.utc_tc > 0)) {
            textTC = textTC + ' - (' +  new Date(frame_info.utc_tc).toISOString() + ')';
        }

        if (("cue_info" in frame_info) && ("info" in frame_info.cue_info))
            textInfo = frame_info.cue_info.info;
    }

    elemTC.innerHTML = textTC;
    elemInfo.innerHTML = textInfo;
}

function getFrameInfo(frame_index) {
    var ret = null;

    if ("frames_metadata" in m_manifest)
        ret = m_manifest.frames_metadata[frame_index];

    return ret;
}

function showPlayPosition() {
    var elem = document.getElementById('myPos');
    var w = document.getElementById('myFrameDownloadProgress').offsetWidth;

    //Calculate x pos from current frame
    var offsetxPos = (m_play_state.current_frame / (m_manifest.video.num_frames - 1)) * w;

    elem.style.left = offsetxPos;
}

function keyUp(e) {
    var keyCode = e.keyCode;

    if (keyCode == 16) //SHIFT
        m_shiftPressed = false;
}

function keyDown(e) {
    var keyCode = e.keyCode;

    if(keyCode == 16 ) //SHIFT
        m_shiftPressed = true;

    if((keyCode == 39 ) && (m_shiftPressed)) { //>
        pause();
        gotoNextCuePoint(m_play_state.current_frame);
        e.preventDefault();
    }
    else if ((keyCode == 37)&& (m_shiftPressed)) { //<
        pause();
        gotoNextCuePointRev(m_play_state.current_frame);
        e.preventDefault();
    }
    else if(keyCode == 39) { //>
        pause();
        showFrame(m_play_state.current_frame + 1);
        e.preventDefault();
    }
    else if (keyCode == 37) { //<
        pause();
        showFrame(m_play_state.current_frame - 1);
        e.preventDefault();
    }
    else if (keyCode == 32) { //Space (play/pause)
        togglePlay();
        e.preventDefault();
    }
    else if (keyCode == 35) { //End (will stop playing automatically)
        showFrame(m_manifest.video.num_frames - 1);
        e.preventDefault();
    }
    else if (keyCode == 36) {//Home
        pause();
        showFrame(0);
        e.preventDefault();
    }
    else if (keyCode == 82) {//R
        togglePlayRev(0);
        e.preventDefault();
    }
}

function getNextCuePoint(num) {
    var ret = -1;

    if (isManifestLoaded() == false)
        return ret;

    if ("frames_metadata" in m_manifest) {
        var frame = num + 1;

        while ( (frame < m_manifest.video.num_frames) && (ret == -1) ) {
            if ("cue_info" in m_manifest.frames_metadata[frame])
                ret = frame;

            frame++;
        }

        //If there is no next cue point return the end
        if (ret < 0)
            ret = m_manifest.video.num_frames - 1;
    }

    return ret;
}

function getNextCuePointRev(num) {
    var ret = -1;

    if (isManifestLoaded() == false)
        return ret;

    if ("frames_metadata" in m_manifest) {
        var frame = num - 1;

        while ( (frame >= 0 ) && (ret == -1) ) {
            if ("cue_info" in m_manifest.frames_metadata[frame])
                ret = frame;

            frame--;
        }

        //If there is no next cue point return the beginning
        if (ret < 0)
            ret = 0;
    }

    return ret;
}

function gotoNextCuePoint(current_frame_index) {
    showFrame(getNextCuePoint(current_frame_index));
}

function gotoNextCuePointRev(current_frame_index) {
    showFrame(getNextCuePointRev(current_frame_index));
}

function showNextFrame() {
    showFrame(m_play_state.current_frame + 1);
}

function showNextFrameRev() {
    showFrame(m_play_state.current_frame - 1);
}

function togglePlay () {
    if (m_play_state.timer_obj == null) {
        startPlay();
    }
    else {
        pause();
    }
}

function togglePlayRev () {
    if (m_play_state.timer_obj == null) {
        startPlayRev();
    }
    else {
        pause();
    }
}

function isScrubbing() {
    var ret = false;
    if ((m_play_state.timer_obj == null) || (m_play_state.forward == false))
        ret = true;

    return ret;
}

function isManifestLoaded() {
    if ( (Object.keys(m_manifest).length === 0) && (m_manifest.constructor === Object))
        return false;

    return true;
}


function startPlay() {
    if ((m_play_state.timer_obj == null) && (isManifestLoaded() == true)) {
        m_play_state.forward = true;
        m_play_state.timer_obj = setInterval(showNextFrame, m_manifest.video.frame_duration_ms);
    }
}

function startPlayRev() {
    if ((m_play_state.timer_obj == null) && (isManifestLoaded() == true)) {
        m_play_state.forward = false;
        m_play_state.timer_obj = setInterval(showNextFrameRev, m_manifest.video.frame_duration_ms);
    }
}

function pause() {

    if (isManifestLoaded() == false)
        return;

    if (m_play_state.timer_obj != null) {
        clearInterval(m_play_state.timer_obj);
        m_play_state.timer_obj = null;

        if (isAudioPlaying() == true)
            stopAudioBuffer();
    }
}

function stopAudioBuffer() {
    if (m_play_state.audioBufferSource != null)
        m_play_state.audioBufferSource.stop();
}

function getAudioPlayingType() {
    return m_play_state.AudioPlayingType;
}

function isAudioPlaying () {
    var ret = false;
    if ( (getAudioPlayingType() == en_play_type.LONG_TERM) || ( (getAudioPlayingType() == en_play_type.FRAME) ) )
        ret = true;

    return ret;
}

function playAudioBuffer(index_frame, play_type) {
    var to_play_ms = m_manifest.audio.frame_duration_ms;
    if (play_type == en_play_type.LONG_TERM)
        to_play_ms = MAX_AUDIO_PLAY_BLOCK_MS;

    if ( ("audio_rendering_error" in m_manifest) && (m_manifest.audio_rendering_error == true) ) {
        return;
    }

    //This is a hard coded conversion. But audio context accept NUMBERS
    if ((16 != m_manifest.audio.bit_per_sample) || ("signed" != m_manifest.audio.sample_type)) {
        m_manifest.audio_rendering_error = true;
        console.error("ERROR! This POC only works with 16 bits per sample SIGNED");
        return;
    }

    //This is a hard coded limitation.
    var channels = 2;
    if (channels != m_manifest.audio.channels) {
        m_manifest.audio_rendering_error = true;
        console.error("ERROR! This POC only works with: " + channels + " channels. And the origin is: " + m_manifest.audio.channels + " channels");
        return;
    }

    //Create Audio context if is not created
    if (m_play_state.audioCtx == null) {
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        console.log("audioCtx: " + JSON.stringify(audioCtx.sampleRate));

        if (audioCtx.sampleRate != m_manifest.audio.sample_rate) {
            m_manifest.audio_rendering_error = true;

            console.error("ERROR! This POC IN THIS BROWSER only works with sample rate: " + audioCtx.sampleRate + "Hz. And the origin is: " + m_manifest.audio.sample_rate + "Hz");

            audioCtx.close();

            return;
        }

        m_play_state.audioCtx = audioCtx;
    }

    var final_frame = index_frame;
    var num_total_samples_channel = 0;
    var max_audio_block_s = to_play_ms / 1000.0;
    while (( final_frame < m_manifest.audio.frames.length ) && (typeof (m_manifest.audio.frames[final_frame]) !== 'undefined') && ((num_total_samples_channel / m_manifest.audio.sample_rate) < max_audio_block_s) ) {
        final_frame++;
        num_total_samples_channel = num_total_samples_channel + m_manifest.audio.samples_per_frame;
    }

    var bufferSeconds = num_total_samples_channel / m_manifest.audio.sample_rate;

    // Create an empty two second stereo buffer at the
    // sample rate of the AudioContext = m_manifest.audio.sample_rate

    if ((final_frame - index_frame) > 0 ) {
        console.log("Creating a buffer of : " + num_total_samples_channel + " samples per channel (" + bufferSeconds + " s). From index: " + index_frame + " to : " + final_frame);

        var myAudioBuffer = m_play_state.audioCtx.createBuffer(channels, num_total_samples_channel, m_play_state.audioCtx.sampleRate);

        //Fill the channels of the buffer
        for (var channel = 0; channel < channels; channel++) {
            var dst_buff_audio_channel_pos = 0;
            var dstBuffer = myAudioBuffer.getChannelData(channel);

            //Use all video frames
            for (var f = index_frame; f < final_frame; f++) {
                var buff = m_manifest.audio.frames[f];
                //Samples should be 16bits
                var sample_array = new Int16Array(buff);

                //For every frame
                for (var s = (22 + channel); s < sample_array.length; s = s + channels) {
                    var sample = sample_array[s];
                    var norm_sample = sample / 32768.0;

                    dstBuffer[dst_buff_audio_channel_pos] = norm_sample;
                    dst_buff_audio_channel_pos++;
                }
            }
        }

        // Get an AudioBufferSourceNode.
        // This is the AudioNode to use when we want to play an AudioBuffer
        m_play_state.audioBufferSource = m_play_state.audioCtx.createBufferSource();
        // set the buffer in the AudioBufferSourceNode
        m_play_state.audioBufferSource.buffer = myAudioBuffer;
        // connect the AudioBufferSourceNode to the
        // destination so we can hear the sound
        m_play_state.audioBufferSource.connect(m_play_state.audioCtx.destination);

        //Set end event
        m_play_state.audioBufferSource.onended = function() {
            console.log('Your audio has finished playing');
            m_play_state.AudioPlayingType = en_play_type.STOPPED;
        };

        // start the source playing
        m_play_state.AudioPlayingType = play_type;
        m_play_state.audioBufferSource.start();
    }
}

function mergeIntoObj (base, obj) {
    for (var item in obj) {
        //Use copy to add new items to base, we don't know if obj will change later
        //It copies / overwrites just the 1st level
        if (obj.hasOwnProperty(item))
            base[item] = obj[item];
    }
}

function fromSMPTETCFrameToHHMMSSFF(frame_num, fps) {
    var remaining_frames = frame_num;

    var h = Math.floor(remaining_frames / (fps * 3600));
    remaining_frames = remaining_frames - (h * (fps * 3600));

    var m = Math.floor(remaining_frames / (fps * 60));
    remaining_frames = remaining_frames - (m * (fps * 60));

    var s = Math.floor(remaining_frames / fps);
    remaining_frames = remaining_frames - (s * fps);

    var f = remaining_frames;

    return ensure2Digits(h) + ":" + ensure2Digits(m) + ":" +  ensure2Digits(s) + ":" + ensure2Digits(f);
}

function ensure2Digits(s) {
    var ret = s.toString();

    while (ret.length < 2)
        ret = "0" + ret;

    return ret;
}