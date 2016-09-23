function Connection() {
  this._nextMessageId = 0;
}

Connection.prototype = {
  onconnected: null,
  onuserjoined: null,
  onuserparted: null,
  onchat: null,
  onnamechange: null,
  ondrawing: null,
  onclear: null,
  onerror: null,

  _sendMessage: null,

  _generateId: function() {
    return this._nextMessageId++;
  },

  _onmessage: function(data) {
    let handler = 'on' + data.type;
    if (this[handler])
      this[handler](data);
  },

  sendChat: function(message) {
    let id = this._generateId();
    this._sendMessage({type: 'chat', messageId: id, value: message});
    return id;
  },

  sendDrawing: function(info) {
    let id = this._generateId();
    this._sendMessage({type: 'drawing', messageId: id, value: info});
    return id;
  },

  sendClear: function(info) {
    let id = this._generateId();
    this._sendMessage({type: 'clear', messageId: id});
    return id;
  },

  sendNameChange: function(name) {
    let id = this._generateId();
    this._sendMessage({type: 'namechange', messageId: id, value: name});
    return id;
  },
};
