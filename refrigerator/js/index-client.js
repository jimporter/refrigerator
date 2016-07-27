
var socket = new WebSocket('ws://' + location.host);
socket.onopen = (event) => {
  document.getElementById('chat-input').addEventListener('change', (event) => {
    socket.send(event.target.value);
    event.target.value = '';
  });
};

socket.onmessage = (event) => {
  document.getElementById('scrollback').textContent += event.data + '\n';
};
