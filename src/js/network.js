function fetchAndRespond(url, event) {
  // XXX: Ideally, we should be able to just pass the result of the `fetch()`
  // call directly to `respondWith()`. However, this will not work if the page
  // hosting the FlyWeb server is on a host using HTTP compression (e.g. GitHub
  // Pages). Once HTTP compression is supported, this can all be reduced to a
  // single line of code:
  //
  // event.respondWith(fetch(url));

  let contentType;
  return fetch(url).then((response) => {
    contentType = response.headers.get('Content-Type');
    return response.blob();
  }).then((blob) => {
    event.respondWith(new Response(blob, {
      headers: {'Content-Type': contentType}
    }));
  });
}

function parseQueryString(query) {
  function decode(s) {
    return decodeURIComponent(s.replace('+', ' '));
  }

  let result = {};
  let s = (query || location.search).substring(1);
  for (let i of s.split('&')) {
    let [k, v] = i.split('=', 2);
    result[decode(k)] = decode(v);
  }
  return result;
}

function Server(name, canvas, options) {
  this._fullName = 'Refrigerator: ' + name;
  this._canvas = canvas;
  this._scrollback = [];
  this._nextUserId = 0;
  this._users = new Map();
  this._sockets = new Map();

  if (options.width)
    canvas.width = options.width;
  if (options.height)
    canvas.height = options.height;

  navigator.publishServer(this._fullName).then((server) => {
    const clientURLMap = {
      '/js/network.js': '/js/network-client.js',
      'index.html': 'refrigerator.html',
    };

    server.onfetch = (event) => {
      let url = event.request.url;
      if (url in clientURLMap)
        url = clientURLMap[url];

      // Remove the leading '/' from the URL so that this works ok when opened
      // as a local file.
      fetchAndRespond(url.substr(1), event);
    };

    let hostUser = this._makeUser();
    this._users.set(hostUser.id, hostUser);

    server.onwebsocket = (event) => {
      let socket = event.accept();
      socket.onopen = (event) => {
        var user = this._makeUser();
        this._broadcast({type: 'userjoined', userInfo: user, userId: user.id});

        socket.userId = user.id;
        this._sockets.set(user.id, socket);
        this._users.set(user.id, user);

        socket.send(JSON.stringify({
          type: 'connected',
          title: this._fullName,
          userInfo: user,
          users: [...this._users.values()],
          image: this._canvas.toDataURL(),
          chat: this._scrollback
        }));
      };
      socket.onclose = (event) => {
        this._sockets.delete(socket.userId);
        this._users.delete(socket.userId);
        this._broadcast({type: 'userparted', userId: socket.userId});
      };
      socket.onmessage = (event) => {
        this._processMessage(JSON.parse(event.data), socket.userId);
      };
    };

    this._onmessage({
      type: 'connected',
      title: this._fullName,
      userInfo: hostUser,
      users: [...this._users.values()],
    });

  }).catch((e) => {
    console.log('failed to publish server', e);
  });
}

Server.prototype = Object.create(Connection.prototype);
Server.prototype.constructor = Server;

Server.prototype._makeUser = function() {
  let id = this._nextUserId++;
  return {
    id: id,
    name: 'User ' + id,
  };
};

Server.prototype._findUserByName = function(name) {
  for (let i of this._users.values()) {
    if (i.name === name)
      return i;
  }
};

Server.prototype._send = function(data, userId) {
  if (userId === 0)
    this._onmessage(data);
  else
    this._sockets.get(userId).send(JSON.stringify(data));
};

Server.prototype._broadcast = function(data) {
  this._onmessage(data);

  var string = JSON.stringify(data);
  for (let socket of this._sockets.values())
    socket.send(string);
};

// Handle an incoming message, route it to the right event handler, and relay
// it to the clients.
Server.prototype._processMessage = function(data, userId) {
  data.userId = userId;

  // XXX: This should probably be abstracted somehow.
  if (data.type === 'chat') {

    this._scrollback.push(data);
    this._broadcast(data);

  } else if (data.type === 'namechange') {

    let found = this._findUserByName(data.value);
    if (found && found.id !== userId) {
      this._send({type: 'error', value: 'namechangefailed'}, userId);
    } else {
      let user = this._users.get(userId);
      user.name = data.value;
      this._broadcast({type: 'namechange', userInfo: user, userId: userId});
    }

  } else if (data.type === 'clear') {

    this._scrollback = [];
    // The UI will handle clearing the canvas.
    this._broadcast(data);

  } else {

    // Other messages just get passed through without any special processing.
    this._broadcast(data);

  }
};

Server.prototype._sendMessage = function(data) {
  this._processMessage(data, 0);
};

let query = parseQueryString();
let conn = new Server(query.name, document.getElementById('primary-canvas'),
                      {width: query.width, height: query.height});
