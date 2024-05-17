let device = null;
let mainCharacteristic = null; // A global variable to store the characteristic

const elements = {
    aom:{
        stDialout: document.getElementById("aom-st-dialout"),
        shield: document.getElementById("aom-shield"),
        alarmIncoming: document.getElementById("aom-alarm-incoming")
    },
    status: document.getElementById("status"),
    BTPrompt: document.getElementById("bluetooth-prompt")
}

const connectionStatus = {
    isConnecting: false,
    connected: false,
    connecting: ()=>{
        connectionStatus.isConnecting = true;
        elements.status.textContent = "Connecting...";
    },
    success: ()=>{
        if(!connectionStatus.isConnecting)
            return;

        elements.BTPrompt.classList.add("hide");
        connectionStatus.connected = true;
        connectionStatus.isConnecting = false;
        elements.status.textContent = `Connected`;
        stargate.enableGate();
        document.getElementById("bluetooth-indicator").style.fill = "green";
    },
    fail: ()=>{
        if(!connectionStatus.isConnecting)
            return;

        connectionStatus.isConnecting = false;
        document.getElementById("bluetooth-indicator").style.fill = "red";
    },
    disconnect: ()=>{
        connectionStatus.connected = false;
        elements.BTPrompt.classList.remove("hide");
        elements.status.textContent = `Disconnected`;
        document.getElementById("bluetooth-indicator").style.fill = "grey";
        closeGate();
        stargate.disableGate();
    }
}

function setupMainCharacteristicNotifications(characteristic) {

    characteristic.startNotifications()
    .then(() => {

        characteristic.addEventListener('characteristicvaluechanged', (event) => {
            let value = event.target.value;
            let decodedValue = new TextDecoder().decode(value);
            elements.status.textContent = decodedValue;


            console.log("notify:",decodedValue);

            if (decodedValue === "dhdpress") {
                playDhdPress();
            }
            else if (decodedValue.startsWith("dial-ch")){
                dialSingleChevron(parseInt(decodedValue.replace(/\D/g, '')));
            }
            else if (decodedValue === "open" || decodedValue === "dial-open") {
                openGate();
            }
            else if (decodedValue === "incoming") {
                incoming();
            }
            else if (decodedValue === "close") {
                closeGate();
            }
            else if (decodedValue === "shieldon") {
                playShield();
            }
            else if (decodedValue === "shieldoff") {
                stopShield();
            }
            else if (decodedValue === "dial-fail") {
                dialFail();
            }
            else if (decodedValue === "dialout") {
                
            }
            else
            {
                console.warn("unknown message",decodedValue);
            }
        });

        console.log('Notifications have been started.');
    })
    .catch(error => console.error('Error starting notifications:', error));
}

function writeToMainCharacteristic(value) {
    if (!device || !device.gatt.connected || !mainCharacteristic) {
        console.error('No device connected or main characteristic found.');
        return;
    }

    let encoder = new TextEncoder();
    mainCharacteristic.writeValue(encoder.encode(value))
    .catch(error => {
        console.error('Failed to write to main characteristic:', error);
    });
}

function writeToAudioDelayCharacteristic(value) {
    if (!device || !device.gatt.connected || !audioDelayCharacteristic) {
        console.error('No device connected or audio delay characteristic found.');
        return;
    }

    let encoder = new TextEncoder();
    audioDelayCharacteristic.writeValue(encoder.encode(value))
    .then(() => {
        console.log(`Sent value: ${value} to audio delay characteristic`);
    })
    .catch(error => {
        console.error('Failed to write to audio delay characteristic:', error);
    });
}

function connectToDevice() {
    if (connectionStatus.isConnecting || connectionStatus.connected) 
        return;

    navigator.bluetooth.requestDevice({
        filters: [{services:['4fafc201-1fb5-459e-8fcc-c5c9c331914b']}],
        optionalServices: ['4fafc201-1fb5-459e-8fcc-c5c9c331914b']
    })
    .then(selectedDevice => {
        connectionStatus.connecting();
        selectedDevice.addEventListener('gattserverdisconnected', ()=>{connectionStatus.disconnect();});
        device = selectedDevice;
        return device.gatt.connect();
    })
    .then(server => {
        
        return server.getPrimaryService('4fafc201-1fb5-459e-8fcc-c5c9c331914b');
    })
    .then(service => {
        return Promise.all([
            service.getCharacteristic('beb5483e-36e1-4688-b7f5-ea07361b26a8'), //Main
            service.getCharacteristic('8a52b9fc-cffe-415d-bdb0-0b1aff28438f')  //Audio delay
        ]);
    })
    .then(characteristics => {
        mainCharacteristic = characteristics[0];
        audioDelayCharacteristic = characteristics[1];

        setupMainCharacteristicNotifications(characteristics[0]); //todo - promise setupMainCharacteristicNotifications

        updateAudioDelayFromGate();

        connectionStatus.success();
    })
    .catch(error => {
        console.error(error);
        elements.status.textContent = `Error - ${error.message}`;
        connectionStatus.fail();
    });
}

function run(type) {
    writeToMainCharacteristic(type);
}

function setDelayToGate(delay){
    writeToAudioDelayCharacteristic(delay);
    setTimeout(()=>{
        updateAudioDelayFromGate();
    }, 2000);
}

function updateAudioDelayFromGate(){
    if (!device || !device.gatt.connected || !audioDelayCharacteristic) {
        console.error('No device connected or audio delay characteristic found.');
        return;
    }
    audioDelayCharacteristic.readValue().then(value=>{
        const decodedValue = new TextDecoder().decode(value);
        audioShiftSliderAmount.value = decodedValue;
        audioShiftSlider.value = parseInt(decodedValue);
    }).catch(error => {
        console.error(error);
    });
}





// ====== AUDIO START

const defaultVolume = {
    dhdPress: 0.4,
    roll: 0.2,
    puddle: 0.6,
    inChev: 0.2,
    outChev: 0.2,
    openGate: 0.6,  
    openFail: 0.2,
    closeGate: 0.2,
    alarm: 0.1,
    shielddeactivate: 0.4,
    shielddeactivate: 0.4,
    shieldloop: 0.2,
    
}


// DHD press
const audio_dhdpress = document.getElementById("audio_dhdpress");
audio_dhdpress.loop = false;
audio_dhdpress.volume = defaultVolume.dhdPress;

function playDhdPress()
{
    audio_dhdpress.currentTime = 0;
    audio_dhdpress.play();
}


// Roll audio
const audio_roll = document.getElementById("audio_roll");
audio_roll.volume = defaultVolume.roll;

function onRollAudioTimeUpdate()
{
    if (audio_roll.currentTime >= 5) {
        audio_roll.currentTime = 1.2;
        audio_roll.play();
    }
}

function playInfiniteRoll() 
{
    audio_roll.loop = true;
    audio_roll.currentTime = 1.2;
    audio_roll.addEventListener('timeupdate', onRollAudioTimeUpdate);
    audio_roll.play();
}

function stopInfiniteRoll() 
{
    audio_roll.pause();
    audio_roll.removeEventListener('timeupdate', onRollAudioTimeUpdate);
}

function playRoll() 
{
    audio_roll.loop = false;
    audio_roll.currentTime = 0;
    audio_roll.play();
}

function stopRoll() 
{
    audio_roll.pause();
}


// In chevron audio

const audio_inchev = document.getElementById("audio_inchev");
audio_inchev.loop = false;
audio_inchev.volume = defaultVolume.inChev;

function playInChev()
{
    audio_inchev.currentTime = 0;
    audio_inchev.play();
}

// Out chevron audio

const audio_outchev = document.getElementById("audio_outchev");
audio_outchev.loop = false;
audio_outchev.volume = defaultVolume.outChev;

function playOutChev()
{
    audio_outchev.currentTime = 0;
    audio_outchev.play();
}


// Open gate Audio

const audio_opengate = document.getElementById("audio_opengate");
audio_opengate.loop = false;
audio_opengate.volume = defaultVolume.openGate;

function playOpenGate()
{
    audio_opengate.currentTime = 0;
    audio_opengate.play();
}



// Opening gate failed
const audio_openfail = document.getElementById("audio_openfail");
audio_openfail.loop = false;
audio_openfail.volume = defaultVolume.openFail;

function playOpenFail()
{
    audio_openfail.currentTime = 0;
    audio_openfail.play();
}


// Close gate Audio

const audio_closegate = document.getElementById("audio_closegate");
audio_closegate.loop = false;
audio_closegate.volume = defaultVolume.closeGate;

function playCloseGate()
{
    audio_closegate.currentTime = 0;
    audio_closegate.play();
}

// Puddle Audio
const audio_puddle = document.getElementById("audio_puddle");
audio_puddle.loop = true;
audio_puddle.volume = defaultVolume.puddle;

function onPuddleAudioTimeUpdate()
{
    if (audio_puddle.currentTime >= 4.9) {
        audio_puddle.currentTime = 0.1;
    }
}

function playPuddle()
{
    audio_puddle.currentTime = 0.1;
    audio_puddle.play();
    audio_puddle.addEventListener('timeupdate', onPuddleAudioTimeUpdate);
}

function stopPuddle()
{
    audio_puddle.pause();
    audio_puddle.removeEventListener('timeupdate', onPuddleAudioTimeUpdate);
}



// Alarm audio
const audio_alarm = document.getElementById("audio_alarm");
audio_alarm.loop = false;
audio_alarm.volume = defaultVolume.alarm;
let alarm_audio_interval;

function playAlarm()
{
    audio_alarm.play();
    alarm_audio_interval = setInterval(() => {
        audio_alarm.play();
    }, 1200);
    
}

function stopAlarm()
{
    clearInterval(alarm_audio_interval);
}


//Shield
const audio_shieldloop = document.getElementById("audio_shieldloop");
const audio_shieldactivate = document.getElementById("audio_shieldactivate");
const audio_shielddeactivate = document.getElementById("audio_shielddeactivate");
audio_shieldloop.loop = true;
audio_shieldloop.volume = defaultVolume.shieldloop;
audio_shieldactivate.volume = defaultVolume.shielddeactivate;
audio_shielddeactivate.volume = defaultVolume.shielddeactivate;

function onShieldAudioTimeUpdate()
{
    if (audio_shieldloop.currentTime >= 1.0) {
        audio_shieldloop.currentTime = 0.1;
    }
}

function playShield()
{
    audio_shieldloop.currentTime = 0.1;
    audio_shieldactivate.play();
    setTimeout(()=>{
        audio_shieldloop.play();
        audio_shieldloop.addEventListener('timeupdate', onShieldAudioTimeUpdate);
    }, 1000);

//playShieldAudio();
}

function stopShield()
{
    audio_shielddeactivate.play();
    audio_shieldloop.pause();
    audio_shieldloop.removeEventListener('timeupdate', onShieldAudioTimeUpdate);
}

// Soundtrack - main
const audio_soundtrack_main = document.getElementById("audio_soundtrack_main");
audio_soundtrack_main.loop = false;

function playSTMain()
{
    audio_soundtrack_main.currentTime = getRandomInt(10,30);
    fadeInAudio(audio_soundtrack_main,10,1);
}

function stopSTMain()
{
    fadeOutAudio(audio_soundtrack_main,1,0).then(()=>{
        audio_soundtrack_main.pause();
    });
}


// ============ AUDIO END =======================




function incoming()
{
    if(elements.aom.alarmIncoming.checked)
        playAlarm();

    playInfiniteRoll();
    const chevint = setInterval(()=>{playInChev();stargate.enableChevron(1);}, 600);
    if(elements.aom.shield.checked)
        setTimeout(()=>{run("shieldon");}, 2000);
    setTimeout(()=>{stopRoll();clearInterval(chevint);stargate.enableWormHole();playOpenGate();playPuddle();},5420);
}

async function dialSingleChevron(chn)
{
    switch (chn) {
        case 1:
            playRoll();
            await new Promise(r => setTimeout(r, 1839));
            stopRoll();
            stargate.enableChevron(1);
            playOutChev();
            await new Promise(r => setTimeout(r, 500));
            break;

        case 2:
            playRoll();
            await new Promise(r => setTimeout(r, 2640));
            stopRoll();
            stargate.enableChevron(1);
            playOutChev();
            await new Promise(r => setTimeout(r, 500));

            if(elements.aom.stDialout.checked)
                playSTMain();

            break;

        case 3:
            playRoll();
            await new Promise(r => setTimeout(r, 3285));
            stopRoll();
            stargate.enableChevron(1);
            playOutChev();
            await new Promise(r => setTimeout(r, 500));
            break;

        case 4:
            playRoll();
            await new Promise(r => setTimeout(r, 2000));
            stopRoll();
            stargate.enableChevron(3);
            playOutChev();
            await new Promise(r => setTimeout(r, 500));
            break;

        case 5:
            playRoll();
            await new Promise(r => setTimeout(r, 3365));
            stopRoll();
            stargate.enableChevron(3);
            playOutChev();
            await new Promise(r => setTimeout(r, 500));
            break;

        case 6:
            playRoll();
            await new Promise(r => setTimeout(r, 2640));
            stopRoll();
            stargate.enableChevron(3);
            playOutChev();
            await new Promise(r => setTimeout(r, 500));
            break;

        case 7:
            playRoll();
            await new Promise(r => setTimeout(r, 3365));
            stopRoll();
            stargate.enableChevron(0);
            playOutChev();
            await new Promise(r => setTimeout(r, 500));
            break;

        default:
            break;
    }
}

function openGate()
{
    stargate.enableWormHole();
    playOpenGate();
    playPuddle();
}

function closeGate()
{
    stopAlarm();
    stargate.disableWormHole();
    playCloseGate();
    fadeOutAudio(audio_puddle,1,0).then(()=>{
        stopPuddle();
        audio_puddle.volume = defaultVolume.puddle;
    });
    stopSTMain();
    
}

function dialFail(){
    stopSTMain();
    playOpenFail();
    stargate.disableWormHole();
}

function dhdPress(){
    playDhdPress();
}







async function fadeInAudio(audioElement, duration, targetVolume) {
    return new Promise(resolve => {
        const intervalTime = 100; // ms
        const volumeStep = targetVolume/(duration*1000/intervalTime);

        let currentVolume = 0;
        audioElement.volume = currentVolume;
        audioElement.play();

        const interval = setInterval(() => {
            currentVolume += volumeStep;

            if (currentVolume >= targetVolume) {
                audioElement.volume = targetVolume;
                clearInterval(interval);
                resolve();
                return;
            }

            audioElement.volume = currentVolume;
        }, intervalTime);
    });
}

async function fadeOutAudio(audioElement, duration, targetVolume) {
    return new Promise(resolve => {
        let currentVolume = audioElement.volume;
        const intervalTime = 100; // ms
        const volumeStep = currentVolume/(duration*1000/intervalTime);

        const interval = setInterval(() => {
            currentVolume -= volumeStep;

            if (currentVolume <= targetVolume) {
                audioElement.volume = targetVolume;
                clearInterval(interval);
                resolve();
                return;
            }

            audioElement.volume = currentVolume;
        }, intervalTime);
    });
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}







// Audio
const shieldAudioContext = new window.AudioContext();
loadAdvancedAudioFiles();
async function loadAdvancedAudioFiles()
{
    const response = await fetch("https://raw.githubusercontent.com/RafaelDeJongh/cap_resources/master/sound/stargate/shield/idle_loop.wav");
    const arrayBuffer = await response.arrayBuffer();
    shieldAudioBuffer = await shieldAudioContext.decodeAudioData(arrayBuffer);
}

// Function to play the audio in a loop
function playShieldAudio() {    
    const source = shieldAudioContext.createBufferSource();
    source.buffer = shieldAudioBuffer;
    source.loop = true;

    source.connect(shieldAudioContext.destination);
    source.start(0);
}

function stopshieldAudio() {

}

