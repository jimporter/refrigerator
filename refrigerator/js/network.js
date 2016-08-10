function Server() {
  this._sockets = new Set();

  navigator.publishServer('Refrigerator').then((server) => {

    const clientURLMap = {
      '/js/network.js': '/js/network-client.js',
    };

    server.onfetch = (event) => {
      let url = event.request.url;
      if (url in clientURLMap)
        url = clientURLMap[url];

      // Remove the leading '/' from the URL so that this works ok when opened
      // as a local file.
      console.log(event.request.url, url);
      fetch(url.substr(1)).then((response) => {
        event.respondWith(response);
      });
    };

    server.onwebsocket = (event) => {
      let socket = event.accept();
      socket.onopen = (event) => {
        this.send('* user joined');
        this._sockets.add(socket);
      };
      socket.onclose = (event) => {
        this._sockets.delete(socket);
        this.send('* user parted');
      };
      socket.onmessage = (event) => {
        this.send(event.data);
      };
    };

    if (this.onopen)
      this.onopen(); // XXX: Pass an event.

  }).catch((e) => {
    console.log('failed to publish server', e);
  });
}

Server.prototype = {
  onopen: null,
  onmessage: null,

  send: function(data) {
    if (this.onmessage)
      this.onmessage(new MessageEvent('message', {data: data}));
    for (let i of this._sockets)
      i.send(data);
  },
};


var conn = new Server();
