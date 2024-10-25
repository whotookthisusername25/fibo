document.getElementById('alertButton').addEventListener('click', sendAlert);
document.getElementById('startRecording').addEventListener('click', startRecording);
document.getElementById('stopRecording').addEventListener('click', stopRecording);

let mediaRecorder;
let chunks = [];

// Send alert with location data
function sendAlert() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            fetch('/api/send-alert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ latitude, longitude }),
            })
            .then((response) => response.json())
            .then((data) => {
                document.getElementById('status').innerText = 'Alert sent successfully!';
            })
            .catch((error) => {
                document.getElementById('status').innerText = 'Failed to send alert';
            });
        });
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

// Start recording audio/video
function startRecording() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
            document.getElementById('videoPreview').style.display = 'block';
            document.getElementById('videoPreview').srcObject = stream;
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();

            mediaRecorder.ondataavailable = function(event) {
                chunks.push(event.data);
            };

            mediaRecorder.onstop = function() {
                const blob = new Blob(chunks, { 'type': 'video/mp4;' });
                chunks = [];
                uploadRecording(blob);
            };

            document.getElementById('startRecording').style.display = 'none';
            document.getElementById('stopRecording').style.display = 'inline';
        });
}

// Stop recording and send the data to the server
function stopRecording() {
    mediaRecorder.stop();
    document.getElementById('startRecording').style.display = 'inline';
    document.getElementById('stopRecording').style.display = 'none';
}

function uploadRecording(blob) {
    const formData = new FormData();
    formData.append('file', blob);

    fetch('/api/upload-recording', {
        method: 'POST',
        body: formData,
    })
    .then((response) => response.json())
    .then((data) => {
        console.log('Recording uploaded successfully');
    })
    .catch((error) => {
        console.log('Failed to upload recording');
    });
}
