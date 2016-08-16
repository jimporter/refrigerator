function addChatLine(message) {
  document.getElementById('scrollback').textContent += message + '\n';
}

conn.onconnected = (data) => {
  document.getElementById('user-info').textContent = 'User ' + data.userId;

  document.getElementById('chat-input').addEventListener('change', (event) => {
    conn.sendChat(event.target.value);
    event.target.value = '';
  });
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