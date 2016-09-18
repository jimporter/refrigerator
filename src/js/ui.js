var ChatLog = {
  addLine: function(name, userId, text) {
    let line = document.createElement('div');
    line.className = 'chat-line';

    let author = document.createElement('span');
    author.className = 'chat-author';
    author.dataset.userId = userId;
    author.textContent = name;
    line.appendChild(author);

    let message = document.createElement('span');
    message.className = 'chat-message';
    message.textContent = ' ' + text;
    line.appendChild(message);

    document.getElementById('scrollback').appendChild(line);
  },

  updateLines: function(userId, name) {
    let lines = document.getElementById('scrollback').querySelectorAll(
      '.chat-author[data-user-id="' + userId + '"]'
    );
    for (let i of lines)
      i.textContent = name;
  },
};

var UserList = {
  add: function(info) {
    let user = document.createElement('div');
    user.className = 'user-line';
    user.dataset.id = info.id;
    user.textContent = info.name;

    document.getElementById('user-list').appendChild(user);
  },

  remove: function(id) {
    let list = document.getElementById('user-list');
    let user = list.querySelector('.user-line[data-id="' + id + '"]');
    list.removeChild(user);
  },

  update: function(info) {
    let list = document.getElementById('user-list');
    let user = list.querySelector('.user-line[data-id="' + info.id + '"]');
    user.textContent = info.name;
  },
};

function WorkingCanvasSet(primary, count) {
  this._primary = primary;
  this._canvases = [];
  for (let i = 0; i != count; i++)
    this._canvases.push(this._createCanvas());
}

WorkingCanvasSet.prototype = {
  _createCanvas: function(temp) {
    let working = document.createElement('canvas');
    working.classList.add('working-canvas');
    working.classList.toggle('temp', temp);
    working.width = this._primary.width;
    working.height = this._primary.height;

    this._primary.parentNode.insertBefore(working, this._primary);
    return working;
  },

  acquire: function(id) {
    // XXX: Set z-index so this canvas is on top of all the others.
    let canvas = this._canvases.length ? this._canvases.pop() :
                                         this._createCanvas(true);
    canvas.classList.add('active');
    canvas.dataset.id = id;
    return canvas;
  },

  release: function(canvas) {
    if (canvas.classList.contains('temp')) {
      canvas.parentNode.removeChild(canvas);
      return;
    }
    canvas.classList.remove('active');
    canvas.dataset.id = null;
    let ctx = working.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);wq
    this._canvases.push(canvas);
  },

  find: function(id) {
    return this._primary.parentNode.querySelector(
      '.working-canvas[data-id="' + id + '"]'
    );
  },
};

function addCircle(ctx, info) {
  ctx.fillStyle = info.color;
  ctx.beginPath();
  ctx.arc(info.x, info.y, info.radius, 0, Math.PI*2);
  ctx.fill();
}

conn.onconnected = (data) => {
  let primary = document.getElementById('primary-canvas');
  let drawingId = 0;
  let workingSet = new WorkingCanvasSet(primary, 64);
  let users = new Map();
  let myUserId = data.userInfo.id;

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
      x: event.layerX - primary.offsetLeft,
      y: event.layerY - primary.offsetTop,
      radius: parseInt(document.getElementById('brush-size').value),
      color: document.getElementById('brush-color').value,
    };

    let working = workingSet.acquire(id);
    let ctx = working.getContext('2d');
    addCircle(ctx, info);

    conn.sendDrawing(info);
  }

  document.getElementById('user-info').textContent = data.userInfo.name;
  document.getElementById('user-info').addEventListener('click', (event) => {
    let name = prompt('Enter new name', event.target.textContent);
    if (name)
      conn.sendNameChange(name);
  });

  let userList = document.getElementById('user-list');
  for (let user of data.users) {
    users.set(user.id, user);
    if (user.id !== myUserId)
      UserList.add(user);
  }

  document.getElementById('chat-input').addEventListener('change', (event) => {
    conn.sendChat(event.target.value);
    event.target.value = '';
  });

  primary.addEventListener('mousedown', (event) => {
    if (event.buttons & 0x01)
      drawPixel(event);
  });

  primary.addEventListener('mousemove', (event) => {
    // XXX: Draw a line segment from the previous dot so we don't get gaps.
    // Also, batch these events together to reduce network bandwidth usage?
    if (event.buttons & 0x01)
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
      ChatLog.addLine(users.get(i.userId).name, i.userId, i.value);
  }

  conn.onuserjoined = (data) => {
    users.set(data.userInfo.id, data.userInfo);
    UserList.add(data.userInfo);
  };

  conn.onuserparted = (data) => {
    users.delete(data.userId);
    UserList.remove(data.userId);
  };

  conn.onchat = (data) => {
    ChatLog.addLine(users.get(data.userId).name, data.userId, data.value);
  };

  conn.ondrawing = (data) => {
    let ctx = document.getElementById('primary-canvas').getContext('2d');
    addCircle(ctx, data.value);

    let working = workingSet.find(data.value.id);
    if (working)
      workingSet.release(working);
  };

  conn.onnamechange = (data) => {
    if (data.userId === myUserId)
      document.getElementById('user-info').textContent = data.value;
    else
      UserList.update({id: data.userId, name: data.value});
    ChatLog.updateLines(data.userId, data.value);
  };
};
