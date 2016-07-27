navigator.publishServer('Refrigerator').then((server) => {

  const clientURLMap = {
    '/js/index.js': '/js/index-client.js',
  };

  server.onfetch = (event) => {
    let url = event.request.url;
    if (url in clientURLMap)
      url = clientURLMap[url];

    // Remove the leading '/' from the URL so that this works ok when opened as
    // a local file.
    fetch(url.substr(1)).then((response) => {
      event.respondWith(response);
    });
  };

  var sockets = new Set();

  function relay(s) {
    document.getElementById('scrollback').textContent += s + '\n';
    for (let i of sockets)
      i.send(s);
  }

  server.onwebsocket = (event) => {
    let socket = event.accept();
    socket.onopen = (event) => {
      relay('* user joined');
      sockets.add(socket);
    };
    socket.onclose = (event) => {
      sockets.delete(socket);
      relay('* user parted');
    };
    socket.onmessage = (event) => {
      relay(event.data);
    };
  };

  document.getElementById('chat-input').addEventListener('change', (event) => {
    relay(event.target.value);
    event.target.value = '';
  });

}).catch((e) => {
  console.log('failed to publish server');
});
