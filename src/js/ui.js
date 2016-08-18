function addChatLine(data) {
  let line = document.createElement('div');
  line.className = 'chat-line';

  if (data.type === 'chat') {

    let author = document.createElement('span');
    author.className = 'chat-author';
    author.textContent = 'user ' + data.userId;
    line.appendChild(author);

    let message = document.createElement('span');
    message.className = 'chat-message';
    message.textContent = ' ' + data.value;
    line.appendChild(message);

  } else if (data.type === 'userjoined') {

    let message = document.createElement('span');
    message.className = 'chat-server-log';
    message.textContent = 'user ' + data.userId + ' joined';
    line.appendChild(message);

  } else if (data.type === 'userparted') {

    let message = document.createElement('span');
    message.className = 'chat-server-log';
    message.textContent = 'user ' + data.userId + ' parted';
    line.appendChild(message);

  }

  document.getElementById('scrollback').appendChild(line);
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

  if ('image' in data) {
    let img = new Image();
    img.src = data.image;
    img.onload = (event) => {
      let canvas = document.getElementById('canvas').getContext('2d');
      canvas.drawImage(img, 0, 0);
    };
  }

  if ('chat' in data) {
    for (let i of data.chat)
      addChatLine(i);
  }
};

conn.onuserjoined = addChatLine;
conn.onuserparted = addChatLine;
conn.onchat = addChatLine;

conn.ondrawing = (data) => {
  addCircle(data.value);
};
