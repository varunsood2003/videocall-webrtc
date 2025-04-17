const localVideo = document.getElementById("local");
const remoteVideo = document.getElementById("remote");
const ws = new WebSocket("ws://localhost:8080/ws");

let localStream;
let peer = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
});

navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
  localStream = stream;
  localVideo.srcObject = stream;
  stream.getTracks().forEach(track => peer.addTrack(track, stream));
});

peer.onicecandidate = e => {
  if (e.candidate) {
    ws.send(JSON.stringify({ type: "ice", candidate: e.candidate }));
  }
};

peer.ontrack = e => {
  remoteVideo.srcObject = e.streams[0];
};

ws.onmessage = async (msg) => {
  const data = JSON.parse(msg.data);

  if (data.type === "offer") {
    await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    ws.send(JSON.stringify({ type: "answer", answer }));
  }

  if (data.type === "answer") {
    await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
  }

  if (data.type === "ice" && data.candidate) {
    try {
      await peer.addIceCandidate(data.candidate);
    } catch (err) {
      console.error("Failed to add ICE:", err);
    }
  }
};

async function startCall() {
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  ws.send(JSON.stringify({ type: "offer", offer }));
}
