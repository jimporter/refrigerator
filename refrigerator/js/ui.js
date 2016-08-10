conn.onopen = (event) => {
  document.getElementById('chat-input').addEventListener('change', (event) => {
    conn.send(event.target.value);
    event.target.value = '';
  });
};

conn.onmessage = (event) => {
  document.getElementById('scrollback').textContent += event.data + '\n';
};
