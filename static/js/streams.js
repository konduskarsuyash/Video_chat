const APP_ID = 'b0e192178b22483585e91359904c0c4e';
const CHANNEL = sessionStorage.getItem('room');
const TOKEN = sessionStorage.getItem('token');
let UID = Number(sessionStorage.getItem('UID'));
let NAME = sessionStorage.getItem('name');

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

let localTracks = [];
let remoteUsers = {};

let joinAndDisplayLocalStream = async () => {
    document.getElementById('room-name').innerText = CHANNEL;

    client.on('user-published', handleUserJoined);
    client.on('user-unpublished', handleUserUnpublished);

    try {
        console.log('Joining channel:', CHANNEL);
        await client.join(APP_ID, CHANNEL, TOKEN, UID);
        console.log('Joined channel:', CHANNEL, 'with UID:', UID);
    } catch (error) {
        console.log('Error joining channel:', error);
        window.open('/', '_self');
    }

    try {
        localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        console.log('Local tracks created:', localTracks);
    } catch (error) {
        console.error('Error creating local tracks:', error);
        return;
    }

    let member = await createMember();

    let player = `<div class='video-container' id='user-container-${UID}'>
        <div class='username-wrapper'>
            <span class='user-name'>${member.name}</span>
        </div>
        <div class='video-player' id='user-${UID}'></div>
    </div>`;

    document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);

    try {
        localTracks[1].play(`user-${UID}`);
        console.log(`Playing local video: user-${UID}`);
    } catch (error) {
        console.error('Error playing local video:', error);
    }

    try {
        await client.publish(localTracks);
        console.log('Published local tracks');
    } catch (error) {
        console.error('Error publishing local tracks:', error);
    }
};

let handleUserJoined = async (user, mediaType) => {
    remoteUsers[user.uid] = user;
    await client.subscribe(user, mediaType);

    if (mediaType === 'video') {
        let player = document.getElementById(`user-container-${user.uid}`);

        if (player != null) {
            player.remove();
        }

        let member = await getMember(user.uid);
        player = `<div class='video-container' id='user-container-${user.uid}'>
            <div class='username-wrapper'>
                <span class='user-name'>${member.name}</span>
            </div>
            <div class='video-player' id='user-${user.uid}'></div>
        </div>`;

        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);
        user.videoTrack.play(`user-${user.uid}`);
        console.log(`Playing remote video: user-${user.uid}`);
    }

    if (mediaType === 'audio') {
        user.audioTrack.play();
        console.log(`Playing remote audio: user-${user.uid}`);
    }
};

let handleUserUnpublished = async (user, mediaType) => {
    if (mediaType === 'video') {
        let player = document.getElementById(`user-container-${user.uid}`);
        if (player) {
            player.innerHTML = `<div class='video-container' id='user-container-${user.uid}'>
                <div class='username-wrapper'>
                    <span class='user-name'>${user.uid}</span>
                </div>
                <div class='video-player black-screen'></div>
            </div>`;
            console.log(`User video unpublished: ${user.uid}`);
        }
    }

    if (mediaType === 'audio') {
        console.log(`User audio unpublished: ${user.uid}`);
    }
};

let leaveAndRemoveLocalStream = async () => {
    for (let i = 0; i < localTracks.length; i++) {
        localTracks[i].stop();
        localTracks[i].close();
    }

    await client.leave();
    await deleteMember();
    window.open('/', '_self');
    console.log('Left the channel');
};

let toggleCamera = async (e) => {
    const videoTrack = localTracks[1];
    if (videoTrack.enabled) {
        await videoTrack.setEnabled(false);
        e.target.style.backgroundColor = "rgb(255, 80, 80, 1)";
        console.log('Camera off');
    } else {
        await videoTrack.setEnabled(true);
        e.target.style.backgroundColor = "#fff";
        console.log('Camera on');
    }
};

let toggleMic = async (e) => {
    const audioTrack = localTracks[0];
    if (audioTrack.enabled) {
        await audioTrack.setEnabled(false);
        e.target.style.backgroundColor = "rgb(255, 80, 80, 1)";
        console.log('Microphone off');
    } else {
        await audioTrack.setEnabled(true);
        e.target.style.backgroundColor = "#fff";
        console.log('Microphone on');
    }
};

let createMember = async () => {
    let response = await fetch('/create_member/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 'name': NAME, 'room_name': CHANNEL, 'UID': UID })
    });
    let member = await response.json();
    return member;
};

let getMember = async (uid) => {
    let response = await fetch(`/get_member/?UID=${uid}&room_name=${CHANNEL}`);
    let member = await response.json();
    return member;
};

let deleteMember = async () => {
    let response = await fetch('/delete_member/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 'name': NAME, 'room_name': CHANNEL, 'UID': UID })
    });
    let member = await response.json();
};

joinAndDisplayLocalStream();

window.addEventListener('beforeunload', deleteMember);

document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream);
document.getElementById('camera-btn').addEventListener('click', toggleCamera);
document.getElementById('mic-btn').addEventListener('click', toggleMic);
