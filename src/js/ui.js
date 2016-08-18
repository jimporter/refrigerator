function addChatLine(message) {
  document.getElementById('scrollback').textContent += message + '\n';
}

function addCircle(info) {
  let canvas = document.getElementById('canvas').getContext('2d');
  canvas.beginPath();
  canvas.arc(info.x, info.y, info.radius, 0, Math.PI*2);
  canvas.fill();
}

conn.onconnected = (data) => {
  document.getElementById('user-info').textContent = 'User ' + data.userId;

  document.getElementById('chat-input').addEventListener('change', (event) => {
    conn.sendChat(event.target.value);
    event.target.value = '';
  });

  document.getElementById('make-circle').addEventListener('click', (event) => {
    let info = {
      x: Math.floor(50 + Math.random() * 200),
      y: Math.floor(50 + Math.random() * 200),
      radius: Math.floor(10 + Math.random() * 40),
    };
    conn.sendDrawing(info);
  });

  let img = new Image();
  img.src = data.image;
  img.onload = (event) => {
    let canvas = document.getElementById('canvas').getContext('2d');
    canvas.drawImage(img, 0, 0);
  };
};

conn.onuserjoined = (data) => {
  addChatLine('* user ' + data.userId + ' joined');
};

conn.onuserparted = (data) => {
  addChatLine('* user ' + data.userId + ' parted');
};

conn.onchat = (data) => {
  addChatLine('<user ' + data.userId + '> ' + data.value);
};

conn.ondrawing = (data) => {
  addCircle(data.value);
};
