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

function createWorkingCanvas(primary, id) {
  let working = document.createElement('canvas');
  working.className = 'working-canvas';
  working.dataset.id = id;
  working.width = primary.width;
  working.height = primary.height;

  primary.parentNode.insertBefore(working, primary);
  return working;
}

function addCircle(canvas, info) {
  canvas.beginPath();
  canvas.arc(info.x, info.y, info.radius, 0, Math.PI*2);
  canvas.fill();
}

conn.onconnected = (data) => {
  let primary = document.getElementById('primary-canvas');
  let drawingId = 0;

  // XXX: Who should be responsible for the userId portion? The client (as it is
  // now) or the server? The latter is safer and harder to spoof, but also less
  // convenient.
  function generateId() {
    return data.userId + '/' + drawingId++;
  }

  function drawPixel(event) {
    let id = generateId();
    let info = {
      id: id,
      x: event.clientX - primary.offsetLeft,
      y: event.clientY - primary.offsetTop,
      radius: parseInt(document.getElementById('brush-size').value),
    };

    let working = createWorkingCanvas(primary, id);
    let ctx = working.getContext('2d');
    addCircle(ctx, info);

    conn.sendDrawing(info);
  }

  document.getElementById('user-info').textContent = 'User ' + data.userId;

  document.getElementById('chat-input').addEventListener('change', (event) => {
    conn.sendChat(event.target.value);
    event.target.value = '';
  });

  let isDrawing = false;

  primary.addEventListener('mousedown', (event) => {
    isDrawing = true;
    drawPixel(event);
  });

  primary.addEventListener('mouseup', (event) => {
    isDrawing = false;
  });

  primary.addEventListener('mousemove', (event) => {
    // XXX: Draw a line segment from the previous dot so we don't get gaps.
    // Also, batch these events together to reduce network bandwidth usage?
    if (isDrawing)
      drawPixel(event);
  });

  if ('image' in data) {
    let img = new Image();
    img.src = data.image;
    img.onload = (event) => {
      primary.getContext('2d').drawImage(img, 0, 0);
    };
  } else {
    // Initialize the canvas to white.
    let ctx = primary.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, primary.width, primary.height);
    ctx.fillStyle = 'black';
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
  let ctx = document.getElementById('primary-canvas').getContext('2d');
  addCircle(ctx, data.value);

  let working = document.querySelector(
    '.working-canvas[data-id="' + data.value.id + '"]'
  );
  if (working)
    working.parentNode.removeChild(working);
};
