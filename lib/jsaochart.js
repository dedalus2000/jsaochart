"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var OrgChart = function () {
  function OrgChart(node_id) {
    var _this = this;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, OrgChart);

    this.node_id = node_id;
    this.MARGIN = options.MARGIN || 30;
    this.VMARGIN = options.VMARGIN || 40;
    this.DEFAULT_COLOR = options.DEFAULT_COLOR || "#de7370"; // red
    this.editable = options.editable || false;
    this.save_coords_cb = options.save_coords_cb || null;
    this.SNAP = options.snap || 10;
    this.create_dept = options.create_dept || this._create_dept;
    this.nodesById = new Map();

    this.canvas = new fabric.Canvas(node_id);
    this.canvas.on("mouse:wheel", function (opt) {
      // Note: on Firefox the zoom is very slow!
      var zoom = _this.canvas.getZoom();
      var delta = opt.e.deltaY * zoom / 4;
      zoom = zoom - delta / 200;
      if (zoom > 4) {
        zoom = 4;
      }
      if (zoom < .1) {
        zoom = .1;
      }
      _this.canvas.zoomToPoint({
        x: opt.e.offsetX,
        y: opt.e.offsetY
      }, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
      _this.canvas.requestRenderAll();
    });
    this.canvas.on("mouse:down", function (opt) {
      var evt = opt.e;
      if (!opt.target || !_this.editable) {
        // se editable provvede al pan anche sulle caselle
        _this.isDragging = true;
        _this.selection = false;
        _this.lastPosX = evt.clientX;
        _this.lastPosY = evt.clientY;
      }
      _this.canvas.requestRenderAll();
    });
    this.canvas.on("mouse:move", function (opt) {
      if (_this.isDragging) {
        var e = opt.e;
        _this.canvas.viewportTransform[4] += e.clientX - _this.lastPosX;
        _this.canvas.viewportTransform[5] += e.clientY - _this.lastPosY;
        _this.lastPosX = e.clientX;
        _this.lastPosY = e.clientY;
        _this.canvas.requestRenderAll();
      }
    });
    this.canvas.on("mouse:up", function () {
      _this.isDragging = false;
      _this.selection = true;
      var objects = _this.canvas.getObjects();
      for (var i = 0; i < objects.length; i++) {
        objects[i].setCoords();
      }
    });
  }

  _createClass(OrgChart, [{
    key: "_valorized",
    value: function _valorized(val) {
      return val !== null && typeof val !== "undefined";
    }
  }, {
    key: "setEditable",
    value: function setEditable(vv) {
      var _this2 = this;

      this.editable = vv;
      this.canvas.forEachObject(function (object) {
        object.hasControls = false; // FIX ?
        if (typeof object.org !== "undefined") {
          // there is an jsaochart object
          if (!_this2.editable) {
            object.hoverCursor = null;
            object.selectable = false;
            if (object.type === 'circle') {
              object.set({ radius: 0 });
            }
          } else {
            object.hoverCursor = "pointer";
            object.selectable = true;
            if (object.type === 'circle') {
              object.set({ radius: 2 });
            }
          }
        }
      });
      this.canvas.requestRenderAll();
    }
  }, {
    key: "generateOrg",
    value: function generateOrg(tree_source) {
      var _this3 = this;

      // create the chart
      //
      this.canvas.clear();
      tree_source = this.createNodes(tree_source, tree_source.color);
      var left = 200; // should be in the middle
      var top = 130;

      if (this._valorized(tree_source.org.left)) {
        left = tree_source.org.left;
      }
      if (this._valorized(tree_source.org.top)) {
        top = tree_source.org.top;
      }
      this.drawTree(tree_source, left, top);
      this.canvas.selection = false;

      this.canvas.forEachObject(function (object) {
        object.hasControls = false;
        if (typeof object.org !== "undefined") {
          object.hoverCursor = "pointer";
          object.selectable = _this3.editable;
        }
      });
      this.canvas.requestRenderAll();
    }
  }, {
    key: "createNodes",
    value: function createNodes(tree, color) {
      var _this4 = this;

      color = tree.color || color || this.DEFAULT_COLOR;
      var node = this.create_dept(tree, color);

      node.on("moved", function (e) {
        if (!_this4.editable) {
          return;
        }
        if (_this4.save_coords_cb) {
          _this4.save_coords_cb(_this4.getTreeCoords(e.target)); //, this.nodesById.get(e.target.org.id));
        }
      });
      node.on("moving", function (e) {
        if (!_this4.editable) {
          return;
        }
        var node2 = e.target;
        // aggiorno la posizione.
        var top2 = node2.top - node2.top % _this4.SNAP;
        node2.set({ "top": top2 });
        var old_left = node2.org.left;
        var old_top = node2.org.top;
        node2.org.left = node2.left;
        node2.org.top = node2.top;
        var dx = node2.org.left - old_left;
        var dy = node2.org.top - old_top;
        _this4.updateConjunction(node2);
        _this4.moveChildren(node2, dx, dy);
        _this4.canvas.requestRenderAll();
      });

      node.org = {
        // FIX : use a incremental -and unused- integer value
        // in order to save its coordinates on the server probably you need an already set (and known) id
        id: tree.id || Math.floor(Math.random() * 1000000000),
        children: [],
        color: color,
        components: [],
        conjunctions: tree.conjunctions || [],
        bottom_point: null,
        parent: null,
        name: tree.name,
        tree_width: 0,
        tree_height: 0,
        bottom_point_height: this.VMARGIN / 2,
        top: null,
        left: null,
        is_staff: tree.is_staff || false,

        getCenter: function getCenter() {
          return [_this4._node.top, _this4._node.left];
        },

        _node: node
      };
      this.nodesById.set(node.org.id, node.org); // map the node

      //node.org._node = node;
      if (this._valorized(tree.bottom_point_height)) {
        node.org.bottom_point_height = tree.bottom_point_height;
      }
      // pre-setting "left" to user values (tip: they can be 0)
      if (this._valorized(tree.top)) {
        node.org.top = tree.top;
      }
      if (this._valorized(tree.left)) {
        node.org.left = tree.left;
      }
      var max_child_height = 0;
      var children = tree.children = tree.children || [];
      for (var ii = 0; ii < children.length; ii++) {
        var child = children[ii];
        var node_child = this.createNodes(child, color);
        node_child.org.parent = node;
        node.org.children.push(node_child);
        node.org.tree_width += node_child.org.tree_width;
        if (max_child_height < node_child.org.tree_height) {
          max_child_height = node_child.org.tree_height;
        }
      }
      node.org.tree_height = max_child_height + node.height + node.org.bottom_point_height + this.VMARGIN / 2;
      if (node.org.tree_width < node.width + this.MARGIN) {
        node.org.tree_width = node.width + this.MARGIN;
      }
      if (node.org.tree_height < node.height + node.org.bottom_point_height + this.VMARGIN / 2) {
        node.org.tree_height = node.height + node.org.bottom_point_height + this.VMARGIN / 2;
      }
      return node;
    }
  }, {
    key: "connection_line",
    value: function connection_line(x1, y1, x2, y2, color) {
      // a line with common options
      var options = {
        fill: color || this.DEFAULT_COLOR,
        stroke: color || this.DEFAULT_COLOR,
        strokeWidth: 1,
        selectable: false,
        evented: false
      };
      return new fabric.Line([x1, y1, x2, y2], options);
    }
  }, {
    key: "createConjunction",
    value: function createConjunction(child) {
      // internal
      var parent = child.org.parent;
      if (child.org.is_staff) {
        // only 1 vertical + 1 horizontal lines
        var _x1 = parent.get("left") + parent.width / 2;
        var _y1 = parent.get("top") + parent.height;
        var _x2 = child.get("left");
        var _y2 = child.get("top") + child.height / 2;
        var llv = this.connection_line(_x1, _y1, _x1, _y2, parent.org.color);
        var llh = this.connection_line(_x1, _y2, _x2, _y2, parent.org.color);
        child.org.conjunctions = [llv, llh];
        this.canvas.add(llv, llh);
        llv.sendToBack();
        llh.sendToBack();
      } else {
        // 1 vertical + 1 hor. + 1 vert. lines
        var _x3 = parent.get("left") + parent.width / 2;
        var _y = parent.get("top") + parent.height;
        var _x4 = child.get("left") + child.width / 2;
        var _y3 = child.get("top");
        var ymiddle = Number.parseInt(_y + parent.org.bottom_point_height);
        var llv1 = this.connection_line(_x3, _y, _x3, ymiddle, parent.org.color);
        var llh1 = this.connection_line(_x3, ymiddle, _x4, ymiddle, parent.org.color);
        var llv2 = this.connection_line(_x4, ymiddle, _x4, _y3, parent.org.color);
        child.org.conjunctions = [llv1, llh1, llv2];
        this.canvas.add(llv1, llh1, llv2);
        llv1.sendToBack();
        llh1.sendToBack();
        llv2.sendToBack();
      }
    }
  }, {
    key: "createBottomPoint",
    value: function createBottomPoint(tree) {
      var _this5 = this;

      // the "bottomPoint" is the bottom below the box department where
      //  all the horizontal lines of the conjunctions arrive
      if (tree.org.children.length > 0) {
        // there are children
        var _x1 = tree.get("left") + tree.width / 2;
        var _y1 = tree.get("top") + tree.height;
        var ymiddle = Number.parseInt(_y1 + tree.org.bottom_point_height);
        var cc = new fabric.Circle({
          radius: this.editable ? 2 : 0,
          fill: 'red',
          originX: "center",
          originY: "center",
          top: ymiddle,
          left: _x1
        });
        tree.org.bottom_point = cc;
        this.canvas.add(cc);
        cc.org = {
          left: _x1,
          top: ymiddle,
          parent: tree
        };
        cc.on("moving", function (e) {
          if (!_this5.editable) {
            _this5.canvas.requestRenderAll();
            return;
          }
          var node = e.target;
          var rect = node.org.parent;
          // aggiorno la posizione.
          var old_top = node.org.top;
          var top2 = node.top - node.top % _this5.SNAP;
          node.set({ "top": top2 });
          node.org.top = node.top;
          node.set({
            "left": rect.left + rect.width / 2,
            'top': parseInt(node.top) });
          var rect_top = rect.top + rect.height;
          rect.org.bottom_point_height = node.top - rect_top;
          var diff = node.org.top - old_top;
          _this5.moveChildren(rect, 0, diff, true);
          _this5.canvas.requestRenderAll();
        });
        cc.on("moved", function (e) {

          if (!_this5.editable) {
            return;
          }
          e.target.org.bottom_point_height = e.target.org.bottom_point_height;

          if (_this5.save_coords_cb) {
            _this5.save_coords_cb(_this5.getTreeCoords(e.target.org.parent)); //, this.nodesById.get(e.target.org.id));
          }
        });
        cc.on("mouseup", function () {
          _this5.canvas.requestRenderAll();
          // let node=e.target;
        });
      }
    }
  }, {
    key: "updateConjunction",
    value: function updateConjunction(child) {
      var conj_qty = child.org.conjunctions.length;
      var parent = child.org.parent;
      if (!parent || conj_qty === 0) {
        return; // root
      }
      var _x1 = parent.get('left') + parent.width / 2;
      var _y1 = parent.get('top') + parent.height;
      var _x2 = child.get("left") + child.width / 2;

      if (conj_qty === 3) {
        var _y2 = child.get("top");
        var middle_y = Number.parseInt(parent.org.bottom_point_height + _y1);
        var llv1 = child.org.conjunctions[0];
        var llh1 = child.org.conjunctions[1];
        var llv2 = child.org.conjunctions[2];
        llv1.set({ x1: _x1, y1: _y1, x2: _x1, y2: middle_y });
        llh1.set({ x1: _x2, y1: middle_y, x2: _x1, y2: middle_y });
        llv2.set({ x1: _x2, y1: middle_y, x2: _x2, y2: _y2 });
      } else if (conj_qty === 2) {
        var _y4 = child.top + child.height / 2;
        var llv = child.org.conjunctions[0];
        var llh = child.org.conjunctions[1];
        llv.set({ x1: _x1, y1: _y1, x2: _x1, y2: _y4 });
        llh.set({
          x1: _x1,
          y1: _y4,
          x2: _x2,
          y2: _y4
        });
      }
    }
  }, {
    key: "drawTree",
    value: function drawTree(tree, xx, yy) {
      // create the "current" tree (it is recursive).
      //  It start from the root, then it calls itself for each of its children

      if (tree.org.top !== null && tree.org.left !== null) {
        // 'tree' is a Fabric object; ..org.xx is a jsaochart variable attached to the previous one
        // here the coordinates are set manually (stored in the jsaochart vars)
        tree.set({
          top: tree.org.top,
          left: tree.org.left
        });
      } else {
        // coords set via the parent tree
        tree.set({
          top: yy,
          left: xx - tree.width / 2
        });
        tree.org.top = tree.top;
        tree.org.left = tree.left;
      }
      this.canvas.add(tree);
      this.createBottomPoint(tree);

      var ytop = tree.top + tree.height;
      var yy_bottom = ytop + tree.org.bottom_point_height + this.VMARGIN / 2;
      var children = tree.org.children || [];
      if (children.length > 0) {
        var children_qty = children.length;
        var children_width = 0;
        var leftxx = null;
        for (var ii = 0; ii < children_qty; ii++) {
          if (children[ii].org.top !== null && children[ii].org.left !== null) {
            // there is at least one manually set coordinate
            leftxx = leftxx > children[ii].org.left ? leftxx : children[ii].org.left;
            break;
          } else {
            children_width += children[ii].org.tree_width;
          }
        }
        if (leftxx === null) {
          leftxx = tree.left + tree.width / 2 - children_width / 2;
        }

        for (var _ii = 0; _ii < children_qty; _ii++) {
          var child = children[_ii];
          leftxx += child.org.tree_width / 2;
          this.drawTree(child, leftxx, yy_bottom);
          this.createConjunction(child);
          leftxx += child.org.tree_width / 2;
        }
      }
    }
  }, {
    key: "_create_dept",
    value: function _create_dept(tree, dept_color) {
      // draw the "department" rectangle.
      // it returns a single Fabric object (probably a group of objects)
      //
      var list_of_names = tree.components || [];
      var heights = [];
      var last = 0;
      var max_width = 0;
      var group = new fabric.Group();
      var top_blank = 0;
      if (tree.name) {
        // title
        var text = new fabric.Text(tree.name, {
          fontSize: 13,
          fontWeight: "bold",
          fontFamily: "arial",
          top: last,
          left: 0,
          originX: "center",
          fill: "white"
        });
        last += text.height + 5;
        top_blank = last - 2;
        max_width = max_width > text.width ? max_width : text.width;
        heights.push(last);
        group.addWithUpdate(text);
      }
      var options_default = {
        fontSize: 10,
        fontFamily: "arial",
        left: 0,
        originX: "center"
      };
      for (var ii = 0; ii < list_of_names.length; ii++) {
        var options = Object.assign({}, options_default); // copy
        var rt = list_of_names[ii];

        var name = '[Unknown]'; // what should I do if the name is missing?
        if ((typeof rt === "undefined" ? "undefined" : _typeof(rt)) === "object") {
          // the name is not a simple text: some style options has been passed
          for (var eachopt in rt) {
            if (eachopt === 'text') {
              name = rt["text"];
            }
            options[eachopt] = rt[eachopt];
          }
        } else {
          name = rt;
        }
        options.top = last;
        var _text = new fabric.Text(name, options);
        last += _text.height;
        max_width = max_width > _text.width ? max_width : _text.width;
        heights.push(last);
        group.addWithUpdate(_text);
      }
      var baserect = new fabric.Rect({
        top: 0 - 5,
        left: -group.width / 2 - 5,
        width: group.width + 10,
        height: group.height + 11,
        fill: "white",
        stroke: dept_color,
        rx: 3,
        ry: 3,
        strokeWidth: 1.5
      });
      group.addWithUpdate(baserect);
      var intern = new fabric.Rect({
        top: -5,
        left: -group.width / 2 + 1,
        width: group.width - 1,
        height: top_blank,
        fill: dept_color,
        hasBorders: false,
        ry: 3,
        rx: 3
      });
      var intern2 = new fabric.Rect({
        top: -2 + top_blank / 2,
        left: -group.width / 2 + 1,
        width: group.width - 1,
        height: top_blank / 2,
        fill: dept_color,
        hasBorders: false
      });
      group.addWithUpdate(intern);
      group.addWithUpdate(intern2);
      intern.sendToBack();
      intern2.sendToBack();
      baserect.sendToBack();
      return group;
    }
  }, {
    key: "getTreeCoords",
    value: function getTreeCoords(tree, objcoords) {
      if (typeof tree === "undefined" || typeof tree.org === "undefined") {
        return;
      }
      if (typeof objcoords === "undefined") {
        objcoords = {};
      }
      objcoords[tree.org.id] = {
        left: tree.get("left"),
        top: tree.get("top"),
        bottom_point_height: tree.org.bottom_point_height
      };
      for (var ii = 0; ii < tree.org.children.length; ii++) {
        this.getTreeCoords(tree.org.children[ii], objcoords);
      }
      return objcoords;
    }
  }, {
    key: "moveChildren",
    value: function moveChildren(tree, dx, dy, dontmovebottompoint) {
      if (typeof tree === "undefined") {
        return;
      }
      if (tree.org.bottom_point && typeof dontmovebottompoint === 'undefined') {
        tree.org.bottom_point.set({
          left: tree.org.left + tree.width / 2,
          top: tree.org.top + tree.height + tree.org.bottom_point_height
        });
        tree.org.bottom_point.org.left = tree.org.bottom_point.left;
        tree.org.bottom_point.org.top = tree.org.bottom_point.top;
      }
      for (var ii = 0; ii < tree.org.children.length; ii++) {
        var child = tree.org.children[ii];
        child.set({
          top: child.top + dy,
          left: child.left + dx
        });
        child.org.left += dx;
        child.org.top += dy;
        this.updateConjunction(child);
        this.moveChildren(child, dx, dy);
      }
    }
  }]);

  return OrgChart;
}();