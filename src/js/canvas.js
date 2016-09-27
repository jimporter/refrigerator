function WorkingCanvasSet(container, width, height, count) {
  this._container = container;
  this._width = width;
  this._height = height;
  this._canvases = [];
  for (let i = 0; i != count; i++)
    this._canvases.push(this._createCanvas());
}

WorkingCanvasSet.prototype = {
  _createCanvas: function(temp) {
    let working = document.createElement('canvas');
    working.classList.add('working-canvas');
    working.classList.toggle('temp', temp === true);
    working.width = this._width;
    working.height = this._height;

    this._container.insertBefore(working, this._container.firstChild);
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
    let ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this._canvases.push(canvas);
  },

  find: function(id) {
    return this._container.querySelector(
      '.working-canvas[data-id="' + id + '"]'
    );
  },
};

function PaintCanvas(canvas, options) {
  if (options == null)
    options = {};

  this._canvas = canvas;

  this._primary = canvas.querySelector('.primary-canvas');
  this._primary.addEventListener('mousedown', this._mousedown.bind(this));
  this._primary.addEventListener('mousemove', this._mousemove.bind(this));
  this._primary.addEventListener('mouseup', this._mouseup.bind(this));

  if (options.width)
    this._primary.width = options.width;
  if (options.height)
    this._primary.height = options.height;

  if (options.data) {
    let img = new Image();
    img.src = options.data;
    img.onload = (event) => {
      this._primary.getContext('2d').drawImage(img, 0, 0);
    };
  } else {
    this.clear();
  }

  this._workingSet = new WorkingCanvasSet(
    this._canvas, this._primary.width, this._primary.height, 64
  );
}

PaintCanvas.prototype = {
  ondrawing: null,

  commit: function(info, workingId) {
    this._drawSegment(this._primary.getContext('2d'), info);

    if (workingId != null) {
      let working = this._workingSet.find(workingId);
      if (working)
        this._workingSet.release(working);
    }
  },

  zoom: function(ratio) {
    for (let i of this._canvas.getElementsByTagName('canvas')) {
      i.style.width = i.width * ratio + 'px';
      i.style.height = i.height * ratio + 'px';
    }
  },

  clear: function() {
    let ctx = this._primary.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this._primary.width, this._primary.height);
    ctx.fillStyle = 'black';
  },

  _drawSegment: function(ctx, info) {
    ctx.strokeStyle = info.color;
    ctx.lineWidth = info.width;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(info.start.x, info.start.y);
    ctx.lineTo(info.end.x, info.end.y);
    ctx.stroke();
  },

  _mousedown: function(event) {
    if (event.buttons & 0x01)
      this._prevCoords = this._paintSegment(event);
  },

  _mousemove: function(event) {
    // XXX: Batch these events together to reduce network bandwidth usage?
    if (event.buttons & 0x01)
      this._prevCoords = this._paintSegment(event, this._prevCoords);
  },

  _mouseup: function(event) {
    this._prevCoords = null;
  },

  _paintSegment: function(event) {
    let rect = this._primary.getBoundingClientRect();
    let end = {
      x: (event.pageX - rect.left) * (this._primary.width / rect.width),
      y: (event.pageY - rect.top) * (this._primary.height / rect.height),
    };
    let info = {
      start: this._prevCoords || end,
      end: end,
      // XXX: Abstract this out so we aren't explicitly referring to other
      // elements.
      width: parseInt(document.getElementById('brush-size').value),
      color: document.getElementById('brush-color').value,
    };

    let messageId = this.ondrawing(info);
    let working = this._workingSet.acquire(messageId);
    let ctx = working.getContext('2d');
    this._drawSegment(ctx, info);

    return end;
  },
};
