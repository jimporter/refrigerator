// Make sure the toolbar elements are in the default state, even if the user
// reloaded the page. That way, nothing gets out of sync.
document.getElementById('toolbar').reset();

var ChatLog = {
  addLine: function(userInfo, text) {
    let line = document.createElement('div');
    line.className = 'chat-line';

    let author = document.createElement('span');
    author.className = 'chat-author';
    author.dataset.userId = userInfo.id;
    author.textContent = userInfo.name;
    line.appendChild(author);

    let message = document.createElement('span');
    message.className = 'chat-message';
    message.textContent = ' ' + text;
    line.appendChild(message);

    document.getElementById('scrollback').appendChild(line);
  },

  updateLines: function(userInfo) {
    let lines = document.getElementById('scrollback').querySelectorAll(
      '.chat-author[data-user-id="' + userInfo.id + '"]'
    );
    for (let i of lines)
      i.textContent = userInfo.name;
  },

  clear: function() {
    document.getElementById('scrollback').textContent = '';
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

document.getElementById('user-info').addEventListener('click', (event) => {
  document.getElementById('chat').classList.toggle('hidden');
});

conn.onconnected = (data) => {
  let users = new Map();
  let myUserId = data.userInfo.id;

  document.title = data.title;

  let canvas = new PaintCanvas(document.getElementById('canvas'), data.image);
  canvas.ondrawing = (info) => conn.sendDrawing(info);

  document.getElementById('new-drawing').addEventListener('click', (event) => {
    if (confirm('Are you sure?'))
      conn.sendClear();
  });

  document.getElementById('zoom').addEventListener('change', (event) => {
    canvas.zoom(parseFloat(event.target.value));
  });

  conn.ondrawing = (data) => {
    canvas.commit(data.value, data.userId === myUserId ? data.messageId : null);
  };

  conn.onclear = () => {
    // XXX: Give each "page" an ID (the same across all clients?) so that we
    // know when a new drawing was started. This will avoid sync issues if
    // someone is drawing and another person creates a new page.
    canvas.clear();
  };

  // Set up username stuff.

  document.getElementById('user-name').textContent = data.userInfo.name;
  document.getElementById('change-name').addEventListener('click', (event) => {
    let currentName = document.getElementById('user-name').textContent;
    let name = prompt('Enter new name', currentName);
    if (name)
      conn.sendNameChange(name);
    event.stopPropagation();
  });

  conn.onnamechange = (data) => {
    if (data.userInfo.id === myUserId)
      document.getElementById('user-name').textContent = data.userInfo.name;
    else
      UserList.update(data.userInfo);
    ChatLog.updateLines(data.userInfo);
    users.set(data.userId, data.userInfo);
  };

  // Set up the user list.

  let userList = document.getElementById('user-list');
  for (let user of data.users) {
    users.set(user.id, user);
    if (user.id !== myUserId)
      UserList.add(user);
  }

  conn.onuserjoined = (data) => {
    users.set(data.userInfo.id, data.userInfo);
    UserList.add(data.userInfo);
  };

  conn.onuserparted = (data) => {
    users.delete(data.userId);
    UserList.remove(data.userId);
  };

  // Set up the chat log.

  document.getElementById('chat-input').addEventListener('change', (event) => {
    conn.sendChat(event.target.value);
    event.target.value = '';
  });

  if ('chat' in data) {
    for (let i of data.chat)
      ChatLog.addLine(users.get(i.userId), i.value);
  }

  conn.onchat = (data) => {
    ChatLog.addLine(users.get(data.userId), data.value);
  };

  conn.onerror = (data) => {
    if (data.value === 'namechangefailed')
      alert('That name is already in use.');
  };
};
