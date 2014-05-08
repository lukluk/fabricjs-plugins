/* 
  luklukaha@gmail.com
  7mei2014
  LoadSVG
*/
//begin
var later = [];
var currentCanvasId = '';
var X = 1;
var Y = 2;

function deltaTransformPoint(matrix, point) {
  var dx = point.x * matrix[0] + point.y * matrix[2] + 0;
  var dy = point.x * matrix[1] + point.y * matrix[3] + 0;
  return {
    x: dx,
    y: dy
  };
}

function decomposeMatrix(matrix) {
  // @see https://gist.github.com/2052247
  // calculate delta transform point
  var px = deltaTransformPoint(matrix, {
    x: 0,
    y: 1
  });
  var py = deltaTransformPoint(matrix, {
    x: 1,
    y: 0
  });
  // calculate skew
  var skewX = 180 / Math.PI * Math.atan2(px.y, px.x) - 90;
  var skewY = 180 / Math.PI * Math.atan2(py.y, py.x);
  return {
    translateX: matrix[4],
    translateY: matrix[5],
    scaleX: Math.sqrt(matrix[0] * matrix[0] + matrix[1] * matrix[1]),
    scaleY: Math.sqrt(matrix[2] * matrix[2] + matrix[3] * matrix[3]),
    skewX: skewX,
    skewY: skewY,
    rotation: skewX
  };
}

function cek(o, key) {
  if (typeof o != 'undefined') {
    return o[key];
  } else {
    return false;
  }
}

fabric.Object.prototype.id = '';

fabric.Object.prototype.groupName = false;

fabric.Canvas.prototype.later = function() {
  return later[currentCanvasId];
};
fabric.Canvas.prototype.layerone = function(ctx) {
  var O = later[this.id];

  for (var y in O) {
    if (O[y].groupName == 'layerone' || O[y].groupName == 'background') {
      O[y].render(ctx);
    }
  }
};
fabric.Canvas.prototype._renderBackground = function(ctx) {
  if (this.backgroundColor) {
    ctx.fillStyle = this.backgroundColor.toLive ? this.backgroundColor.toLive(ctx) : this.backgroundColor;
    ctx.fillRect(this.backgroundColor.offsetX || 0, this.backgroundColor.offsetY || 0, this.width, this.height);
  }
  if (this.backgroundImage) {
    this.backgroundImage.render(ctx);
  }

  this.layerone(ctx);
};
fabric.paren = function(el) {
  if (typeof el.parentNode != 'undefined')
    while (el.parentNode.parentNode != null && el.parentNode.parentNode.tagName != 'svg') {
      el = el.parentNode;
    }
  return el;
};
fabric.Group.prototype._restoreObjectState = function(object) {
  this._setObjectPosition(object);
  object.setCoords();
  if (object.__origHasControls) {
    object.hasControls = object.__origHasControls;
    delete object.__origHasControls;
  }
  object.set('active', false);
  object.setCoords();
  delete object.group;
  return this;
};
fabric.ElementsParser.prototype.createObject = function(el, index) {
  var d = new Date();
  var n = d.getTime();


  if (typeof fabric.paren(el).attributes.name == 'undefined') {
    fabric.paren(el).setAttribute('name', n);
    el.setAttribute('xx', n);
  } else {
    el.setAttribute('xx', fabric.paren(el).attributes.name.value);
  }
  var klass = fabric[fabric.util.string.capitalize(el.tagName)];
  if (klass && klass.fromElement) {
    try {
      this._createObject(klass, el, index);
    } catch (err) {
      fabric.log(err);
    }
  } else {
    this.checkIfDone();
  }
};

function Root(el) {
  while (el.parentNode.tagName != 'svg') {
    el = el.parentNode;
  }
  return el.parentNode;
}
fabric.ElementsParser.prototype._createObject = function(klass, el, index) {
  var th = this;
  var opt = this.options;

  if (el.attributes.id)
    opt.id = el.attributes.id.value;
  opt.groupName = el.attributes.xx.value;
  opt.clip = null;
  var path = '';
  if (el.parentNode.style.clipPath) {
    path = el.parentNode.style.clipPath;
  } else {
    path = el.parentNode.style['clip-path'];
  }
  if (el.parentNode.tagName == 'g' && path != '' && path != null) {
    var root = Root(el);
    var id = path.replace('url(#', '').replace(')', '');
    id = id.replace('url("#', '').replace(')"', '');
    id = id.replace('"', '').replace("'", "");

    var cp = root.getElementById(id);
    if (cp.getElementsByTagName('use').length > 0) {
      var link = cp.getElementsByTagName('use')[0].getAttribute('xlink:href').replace('#', '');
      var ele = root.getElementById(link);
      var k = fabric[fabric.util.string.capitalize(ele.tagName)];
      opt.clip = link;
      if (k && k.fromElement) {
        k.fromElement(ele, function(o) {
          o.id = link;
          o.setCoords();
          //var a=getPathArea(o);
          //trimPath(o,X,a.minX);
          //trimPath(o,Y,a.minY);
          this.canvas.addLater(o);
        }, {
          left: 0,
          top: 0,
          width: parseFloat(el.attributes.width.value),
          height: parseFloat(el.attributes.height.value)
        }); //opt.clipTo=function(ctx){ if(app.getCanvas().findById(this.clip)) { app.getCanvas().findById(this.clip).render(ctx); } };
      } //         
    }
  }
  if (klass.async) {
    klass.fromElement(el, this.createCallback(index, el), opt);
  } else {
    var obj = klass.fromElement(el, opt);
    this.reviver && this.reviver(el, obj);
    this.instances.splice(index, 0, obj);
    this.checkIfDone();
  }
  opt = null;
};
fabric.parseSVGDocument = function() {
  var reAllowedSVGTagNames = /^(path|circle|polygon|polyline|ellipse|rect|line|image|text)$/,
    // http://www.w3.org/TR/SVG/coords.html#ViewBoxAttribute
    // \d doesn't quite cut it (as we need to match an actual float number)
    // matches, e.g.: +14.56e-12, etc.
    reNum = '(?:[-+]?\\d+(?:\\.\\d+)?(?:e[-+]?\\d+)?)',
    reViewBoxAttrValue = new RegExp('^' + '\\s*(' + reNum + '+)\\s*,?' + '\\s*(' + reNum + '+)\\s*,?' + '\\s*(' + reNum + '+)\\s*,?' + '\\s*(' + reNum + '+)\\s*' + '$');

  function hasAncestorWithNodeName(element, nodeName) {
    while (element && (element = element.parentNode)) {
      if (nodeName.test(element.nodeName)) {
        return true;
      }
    }
    return false;
  }
  return function(doc, callback, reviver) {
    if (!doc)
      return;
    var g = doc.getElementsByTagName('g');
    if (typeof g[0] != 'undefined' && g[0].tagName == 'g') {
      var eles = g[0].getElementsByTagName('*');
      for (var jj = 0; jj < eles.length; jj++) {
        eles[jj].setAttribute('xx', 'layerone');
        eles[jj].setAttribute('name', 'layerone');
      }
    }
    var lg = doc.getElementsByTagName('linearGradient');
    var n = 0;
    for (n = 0; n < lg.length; n++) {
      lg[n].removeAttribute('x1');
      lg[n].removeAttribute('x2');
      lg[n].removeAttribute('y2');
      lg[n].removeAttribute('y1');
    }
    var startTime = new Date(),
      descendants = fabric.util.toArray(doc.getElementsByTagName('*'));
    if (descendants.length === 0) {
      // we're likely in node, where "o3-xml" library fails to gEBTN("*")
      // https://github.com/ajaxorg/node-o3-xml/issues/21
      descendants = doc.selectNodes('//*[name(.)!="svg"]');
      var arr = [];
      var i;
      for (i = 0, len = descendants.length; i < len; i++) {
        arr[i] = descendants[i];
      }
      descendants = arr;
    }
    var elements = descendants.filter(function(el) {
      return reAllowedSVGTagNames.test(el.tagName) && !hasAncestorWithNodeName(el, /^(?:pattern|defs)$/); // http://www.w3.org/TR/SVG/struct.html#DefsElement
    });
    if (!elements || elements && !elements.length)
      return;
    var viewBoxAttr = doc.getAttribute('viewBox'),
      widthAttr = doc.getAttribute('width'),
      heightAttr = doc.getAttribute('height'),
      width = null,
      height = null,
      minX, minY;
    if (viewBoxAttr && (viewBoxAttr = viewBoxAttr.match(reViewBoxAttrValue))) {
      minX = parseInt(viewBoxAttr[1], 10);
      minY = parseInt(viewBoxAttr[2], 10);
      width = parseInt(viewBoxAttr[3], 10);
      height = parseInt(viewBoxAttr[4], 10);
    }
    // values of width/height attributes overwrite those extracted from viewbox attribute
    width = widthAttr ? parseFloat(widthAttr) : width;
    height = heightAttr ? parseFloat(heightAttr) : height;
    var options = {
      width: width,
      height: height
    };
    fabric.gradientDefs = fabric.getGradientDefs(doc);
    fabric.cssRules = fabric.getCSSRules(doc);
    // Precedence of rules:   style > class > attribute
    fabric.parseElements(elements, function(instances) {
      fabric.documentParsingTime = new Date() - startTime;
      if (callback) {
        callback(instances, options);
      }
    }, fabric.util.object.clone(options), reviver);
  };
}();

function getPathArea(o) {
  var x = [];
  var y = [];
  var xx = [];
  var yy = [];
  if (o.path) {
    for (var j in o.path) {
      if (o.path[j][0] && o.path[j][0] == o.path[j][0].toUpperCase()) {
        if (o.path[j][0] == 'H') {
          x.push(o.path[j][1]);
        } else if (o.path[j][0] == 'V') {
          y.push(o.path[j][1]);
        } else if (o.path[j][0] != 'V' && o.path[j][0] != 'H') {
          for (var k = 1; k < o.path[j].length; k += 2) {
            x.push(o.path[j][k]);
          }
          for (var k = 2; k < o.path[j].length; k += 2) {
            y.push(o.path[j][k]);
          }
        }
      } else {
        if (o.path[j][0] == 'h') {
          xx.push(o.path[j][1]);
        } else if (o.path[j][0] == 'v') {
          yy.push(o.path[j][1]);
        } else if (o.path[j][0] != 'v' && o.path[j][0] != 'h') {
          for (var k = 1; k < o.path[j].length; k += 2) {
            xx.push(o.path[j][k]);
          }
          for (var k = 2; k < o.path[j].length; k += 2) {
            yy.push(o.path[j][k]);
          }
        }
      }
    }
  } else if (o.points) {
    for (var p in o.points) {
      x.push(o.points[p].x);
      y.push(o.points[p].y);
    }
  }
  return {
    ax: x,
    ay: y,
    bx: xx,
    by: yy
  };
}

function getPointArea(o) {
  var x = [];
  var y = [];
  var i;
  for (i in o.points) {
    x.push(o.points[i].x);
    y.push(o.points[i].y);
  }
}

function getArea(o) {
  var x = [];
  var y = [];
  var xx = [];
  var yy = [];
  var i;
  for (i in o.paths) {
    if (o.paths[i].path) {
      for (var j in o.paths[i].path) {
        if (o.paths[i].path[j][0] && o.paths[i].path[j][0] == o.paths[i].path[j][0].toUpperCase()) {
          if (o.paths[i].path[j][0] == 'H') {
            x.push(o.paths[i].path[j][1]);
          } else if (o.paths[i].path[j][0] == 'V') {
            y.push(o.paths[i].path[j][1]);
          } else if (o.paths[i].path[j][0] != 'V' && o.paths[i].path[j][0] != 'H') {
            for (var k = 1; k < o.paths[i].path[j].length; k += 2) {
              x.push(o.paths[i].path[j][k]);
            }
            for (var k = 2; k < o.paths[i].path[j].length; k += 2) {
              y.push(o.paths[i].path[j][k]);
            }
          }
        } else {
          if (o.paths[i].path[j][0] == 'h') {
            xx.push(o.paths[i].path[j][1]);
          } else if (o.paths[i].path[j][0] == 'v') {
            yy.push(o.paths[i].path[j][1]);
          } else if (o.paths[i].path[j][0] != 'v' && o.paths[i].path[j][0] != 'h') {
            for (var k = 1; k < o.paths[i].path[j].length; k += 2) {
              xx.push(o.paths[i].path[j][k]);
            }
            for (var k = 2; k < o.paths[i].path[j].length; k += 2) {
              yy.push(o.paths[i].path[j][k]);
            }
          }
        }
      }
    } else if (o.paths[i].points) {
      for (var p in o.paths[i].points) {
        x.push(o.paths[i].points[p].x);
        y.push(o.paths[i].points[p].y);
      }
    }
  }
  return {
    ax: x,
    ay: y,
    bx: xx,
    by: yy
  };
}

function trimPath(th, cord, min) {
  if (th.path) {
    for (var j in th.path) {
      if (th.path[j][0] && th.path[j][0] == th.path[j][0].toUpperCase()) {
        if (th.path[j][0] == 'H' && cord == 1) {
          th.path[j][1] = th.path[j][1] - min;
        } else if (th.path[j][0] == 'V' && cord == 2) {
          th.path[j][1] = th.path[j][1] - min;
        } else if (th.path[j][0] != 'V' && th.path[j][0] != 'H') {
          for (var k = cord; k < th.path[j].length; k += 2) {
            th.path[j][k] = th.path[j][k] - min;
          }
        }
      }
    }
  } else if (th.points) {
    for (var p in th.points) {
      if (cord == X)
        th.points[p].x = th.points[p].x - min;
      if (cord == Y)
        th.points[p].y = th.points[p].y - min;
    }
  }
}

function getBound(o) {
  var area = getPathArea(o);
  return {
    minX: fabric.util.array.min(area.ax),
    minY: fabric.util.array.min(area.ay),
    maxX: fabric.util.array.max(area.ax),
    maxY: fabric.util.array.max(area.ay),
    width: Math.abs(fabric.util.array.min(area.ax) - fabric.util.array.max(area.ax)),
    height: Math.abs(fabric.util.array.min(area.ay) - fabric.util.array.max(area.ay))
  };
}

function getGBound(o) {
  var area = getArea(o);
  var minX = fabric.util.array.min(area.ax) + fabric.util.array.min(area.bx),
    minY = fabric.util.array.min(area.ay) + fabric.util.array.min(area.by),
    maxX = fabric.util.array.max(area.ax) + fabric.util.array.max(area.bx),
    maxY = fabric.util.array.max(area.ay) + fabric.util.array.max(area.by);
  return {
    minX: minX,
    minY: minY,
    maxX: maxX,
    maxY: maxY,
    width: Math.abs(minX - maxX),
    height: Math.abs(minY - maxY)
  };
}

function trimAll(o) {
  var area = getPathArea(o);
  var minX = fabric.util.array.min(area.ax);
  var minY = fabric.util.array.min(area.ay);
  var maxX = fabric.util.array.max(area.ax);
  var maxY = fabric.util.array.max(area.ay);
  trimPath(o, X, minX);
  trimPath(o, Y, minY); // o.width = Math.abs(minX - maxX);
  // o.height = Math.abs(minY - maxY);
  // trimGroup(o, Y, o.height - 50 - (o.height / 2));
  // trimGroup(o, X, o.width - 50 - (o.width / 2));
}

function trimGroup(o, cord, min) {
  var i;
  for (i in o.paths) {
    trimPath(o.paths[i], cord, min);
  }
}
fabric.Object.prototype.setOriginToCenter = function() {
  this._originalOriginX = this.originX;
  this._originalOriginY = this.originY;
  var center = this.getCenterPoint();
  this.set({
    originX: 'center',
    originY: 'center',
    left: center.x,
    top: center.y
  });
};
fabric.Canvas.prototype.addLater = function(o) {
  if (!later[currentCanvasId]) {
    later[currentCanvasId] = [];
  }
  later[currentCanvasId].push(o);
};
fabric.Canvas.prototype.findById = function(id) {
  var i;
  for (i in this.getObjects()) {
    var o = this.getObjects()[i];
    if (o.id == id) {
      return o;
    }
  }
  return false;
};

function findById(array, id) {
  var i;
  for (i in array) {
    var o = array[i];
    if (o.id == id) {
      return o;
    }
  }
  return false;
}

function loadSVG(mode, c) {
  currentCanvasId = c.id;
  fabric.loadSVGFromURL(mode, function(objects, options) {
    var gn = '';
    var group = [];
    c.setWidth(1.5 * options.width);
    c.setHeight(1.5 * options.height);
    var g = new fabric.Group();
    g.width = options.width;
    g.height = options.height;
    g.originX = 'center';
    g.originY = 'center';
    var rate = c.width / options.width;
    var loadedObject;
    var i = 0;
    for (i in objects) {
      var o = objects[i];
      o.padding = 10;
      if (o.clip) {
        var clip = findById(c.later(), o.clip);
        if (clip.type = 'path') {
          trimAll(clip);
          clip.realWidth = getBound(clip).width;
          clip.left = -clip.realWidth;
          clip.top = -clip.getHeight();
        } else {
          clip.left = -(clip.getWidth() / 2);
          clip.top = -(clip.getHeight() / 2);
        }
        //var b=getBound();
        o.clipTo = function(ctx) {
          clip.render(ctx);
        };
      }
      if (gn != o.groupName) {
        if (group.length > 0) {
          //console.log(xx.min(),yy.min());
          // loadedObject = new fabric.PathGroup(group, options);
          // loadedObject.left = loadedObject.left - (options.width / 2);
          // loadedObject.top = loadedObject.top - (options.height / 2);
          // g.add(loadedObject);
          var xoptions = options;
          loadedObject = new fabric.PathGroup(group, xoptions);
          var area = getGBound(loadedObject);
          loadedObject.area = area;
          if ( cek(group[0], 'groupName') != 'layerone') {
            trimGroup(loadedObject, Y, area.minY);
            trimGroup(loadedObject, X, area.minX);
            loadedObject.width = area.width;
            loadedObject.height = area.height;
            trimGroup(loadedObject, Y, loadedObject.height - options.height / 2 - loadedObject.height / 2);
            trimGroup(loadedObject, X, loadedObject.width - options.width / 2 - loadedObject.width / 2);
            //trimGroup(loadedObject,X,loadedObject.width-(options.width/2));
            loadedObject.top = area.minY;
            loadedObject.left = area.minX;
          }
          loadedObject.left = loadedObject.left - xoptions.width / 2;
          loadedObject.top = loadedObject.top - xoptions.height / 2;
          loadedObject.setCoords();
          if (loadedObject.paths.length > 0)
            g.add(loadedObject);
        }
        loadedObject = null;
        group = [];
        gn = o.groupName;
      }
      o.originX = 'left';
      o.originY = 'top';
      if (typeof o.x != 'undefined')
        o.left = o.x;
      if (typeof o.y != 'undefined')
        o.top = o.y;
      if (o.transformMatrix) {
        var m = decomposeMatrix(o.transformMatrix);
        var x = m.translateX;
        var y = m.translateY;
        o.transformMatrix = null;
        o.left = x + o.left - o.width / 2;
        o.top = y + o.top - o.height / 2;
        o.setAngle(m.rotation);
        o.scaleX = m.scaleX;
        o.scaleY = m.scaleY;
      }
      o.setCoords();
      //path|circle|polygon|polyline|ellipse|rect|line|image|text
      if (o.type == 'path') {
        group.push(o);
      } else {
        if (o.type == 'polygon' || o.type == 'polyline') {
          var a = getBound(o);
          trimAll(o);
          var b = getBound(o);
          trimPath(o, X, b.width / 2);
          trimPath(o, Y, b.height / 2);
          o.left = a.minX;
          o.top = a.minY;
        } else if (o.type == 'rect' || o.type == 'line' || o.type == 'text' || o.type == 'i-text') {
          o.left = o.left - options.width / 2;
          o.top = o.top - options.height / 2;
        } else {
          o.left = o.left - o.width / 2;
          o.top = o.top - o.height / 2;
          console.log(o.type);
        }
        g.add(o);
      }
    }
    var xoptions = options;
    loadedObject = new fabric.PathGroup(group, xoptions);
    var area = getGBound(loadedObject);
    loadedObject.area = area;
    if (cek(group[0], 'groupName') != 'layerone') {
      trimGroup(loadedObject, Y, area.minY);
      trimGroup(loadedObject, X, area.minX);
      loadedObject.width = Math.abs(area.minX - area.maxX);
      loadedObject.height = Math.abs(area.minY - area.maxY);
      trimGroup(loadedObject, Y, loadedObject.height - options.height / 2 - loadedObject.height / 2);
      trimGroup(loadedObject, X, loadedObject.width - options.width / 2 - loadedObject.width / 2);
      //trimGroup(loadedObject,X,loadedObject.width-(options.width/2));
      loadedObject.top = area.minY;
      loadedObject.left = area.minX;
    }
    loadedObject.left = loadedObject.left - xoptions.width / 2;
    loadedObject.top = loadedObject.top - xoptions.height / 2;
    loadedObject.setCoords();
    if (loadedObject.paths.length > 0)
      g.add(loadedObject);
    c.add(g);
    g.scaleToHeight(c.height);
    c.centerObject(g);
    g.setCoords();
    var items = g._objects;
    g._restoreObjectsState();
    c.remove(g);
    var i = 0;
    for (i = 0; i < items.length; i++) {
      items[i].setCoords();
        items[i].id = 'obj' + i;
        c.add(items[i]);
        c.bringToFront(items[i]);


    }
    c.renderAll();
    if (typeof fn == 'function') {
      fn();
    }
  });
}

fabric.StaticCanvas.prototype._setSVGObjects = function(markup, reviver) {
  var activeGroup = this.getActiveGroup();
  if (activeGroup) {
    this.discardActiveGroup();
  }
  //  var len=later[this.id].length
  // for (var i = 0; i < len; i++) {
  //    markup.push(later[this.id][i].toSVG(reviver));
  //  }      
  for (var i = 0, objects = this.getObjects(), len = objects.length; i < len; i++) {
    markup.push(objects[i].toSVG(reviver));
  }
  if (activeGroup) {
    this.setActiveGroup(new fabric.Group(activeGroup.getObjects()));
    activeGroup.forEachObject(function(o) {
      o.set('active', true);
    });
  }
}
