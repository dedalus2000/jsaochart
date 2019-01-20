class OrgChart{
  
  constructor(node_id, options={}) { 
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
    this.canvas.on("mouse:wheel", (opt) => {
      // Note: on Firefox the zoom is very slow!
      let zoom = this.canvas.getZoom();
      let delta = opt.e.deltaY * zoom / 4;
      zoom = zoom - delta / 200;
      if (zoom > 4) {
        zoom = 4;
      }
      if (zoom < .1) {
        zoom = .1;
      }
      this.canvas.zoomToPoint({
        x: opt.e.offsetX,
        y: opt.e.offsetY
      }, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
      this.canvas.requestRenderAll();
    });
    this.canvas.on("mouse:down", (opt) => {
      let evt = opt.e;
      if (!opt.target || !this.editable) { // se editable provvede al pan anche sulle caselle
        this.isDragging = true;
        this.selection = false;
        this.lastPosX = evt.clientX;
        this.lastPosY = evt.clientY;
      }
      this.canvas.requestRenderAll();
    });
    this.canvas.on("mouse:move", (opt) => {
      if (this.isDragging) {
        let e = opt.e;
        this.canvas.viewportTransform[4] += e.clientX - this.lastPosX;
        this.canvas.viewportTransform[5] += e.clientY - this.lastPosY;
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
        this.canvas.requestRenderAll();
      }   
    });
    this.canvas.on("mouse:up", () => {
      this.isDragging = false;
      this.selection = true;
      let objects = this.canvas.getObjects();
      for(let i=0; i<objects.length; i++){
        objects[i].setCoords();
      }
    });
  };

  _valorized(val) {
    return (val !== null && typeof val !== "undefined");
  };

  setEditable (vv) {
    this.editable = vv;
    this.canvas.forEachObject((object) => {
      object.hasControls = false; // FIX ?
      if (typeof object.org !== "undefined") { // there is an jsaochart object
        if (!this.editable){
          object.hoverCursor = null;
          object.selectable = false;
          if (object.type==='circle'){
            object.set({radius:0});
          }
        } else {
          object.hoverCursor = "pointer";
          object.selectable = true;
          if (object.type==='circle'){
            object.set({radius:2});
          }
        }
      }
    });
    this.canvas.requestRenderAll();
  };

  generateOrg (tree_source) {
    // create the chart
    //
    this.canvas.clear();
    tree_source = this.createNodes(tree_source, tree_source.color);
    let left = 200; // should be in the middle
    let top = 130;

    if (this._valorized(tree_source.org.left)) {
      left = tree_source.org.left;
    }
    if (this._valorized(tree_source.org.top)) {
      top = tree_source.org.top;
    }
    this.drawTree(tree_source, left, top);
    this.canvas.selection = false;
    
    this.canvas.forEachObject((object) => {
      object.hasControls = false;
      if (typeof object.org !== "undefined") {
        object.hoverCursor = "pointer";
        object.selectable = this.editable;
      }
    });
    this.canvas.requestRenderAll();
  };

  createNodes (tree, color) {
    color = tree.color || color || this.DEFAULT_COLOR;
    let node = this.create_dept(tree, color);

    node.on("moved", (e) => {
      if (!this.editable){
        return;
      }
      if (this.save_coords_cb){
        this.save_coords_cb(this.getTreeCoords(e.target)); //, this.nodesById.get(e.target.org.id));
      }
    });
    node.on("moving", (e) => {
      if (!this.editable){
        return;
      }
      let node2 = e.target;
      // aggiorno la posizione.
      let top2 = node2.top-(node2.top%this.SNAP);
      node2.set({"top":top2});
      let old_left = node2.org.left;
      let old_top = node2.org.top;
      node2.org.left = node2.left;
      node2.org.top = node2.top;
      let dx = node2.org.left - old_left;
      let dy = node2.org.top - old_top;
      this.updateConjunction(node2);
      this.moveChildren(node2, dx, dy);
      this.canvas.requestRenderAll();
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
      
      getCenter: () => {
        return [this._node.top, this._node.left];
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
    if (this._valorized(tree.left)){
      node.org.left = tree.left;
    }
    let max_child_height = 0;
    let children = tree.children = tree.children || [];
    for (let ii = 0; ii < children.length; ii++) {
      let child = children[ii];
      let node_child = this.createNodes(child, color);
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
  };

  connection_line(x1, y1, x2, y2, color) {
    // a line with common options
    let options = {
      fill: color || this.DEFAULT_COLOR,
      stroke: color || this.DEFAULT_COLOR,
      strokeWidth: 1,
      selectable: false,
      evented: false
    };
    return new fabric.Line([ x1, y1, x2, y2 ], options);
  }

  createConjunction (child) {
    // internal
    let parent = child.org.parent;
    if (child.org.is_staff) {
      // only 1 vertical + 1 horizontal lines
      let _x1 = parent.get("left") + parent.width / 2;
      let _y1 = parent.get("top") + parent.height;
      let _x2 = child.get("left");
      let _y2 = child.get("top") + child.height / 2;
      let llv = this.connection_line(_x1, _y1, _x1, _y2, parent.org.color);
      let llh = this.connection_line(_x1, _y2, _x2, _y2, parent.org.color);
      child.org.conjunctions = [ llv, llh ];
      this.canvas.add(llv, llh);
      llv.sendToBack();
      llh.sendToBack();
    } else {
      // 1 vertical + 1 hor. + 1 vert. lines
      let _x1 = parent.get("left") + parent.width / 2;
      let _y1 = parent.get("top") + parent.height;
      let _x2 = child.get("left") + child.width / 2;
      let _y2 = child.get("top");
      let ymiddle = Number.parseInt(_y1 + parent.org.bottom_point_height);
      let llv1 = this.connection_line(_x1, _y1, _x1, ymiddle, parent.org.color);
      let llh1 = this.connection_line(_x1, ymiddle, _x2, ymiddle, parent.org.color);
      let llv2 = this.connection_line(_x2, ymiddle, _x2, _y2, parent.org.color);
      child.org.conjunctions = [ llv1, llh1, llv2 ];
      this.canvas.add(llv1, llh1, llv2);
      llv1.sendToBack();
      llh1.sendToBack();
      llv2.sendToBack();
    }
  };

  createBottomPoint (tree) {
    // the "bottomPoint" is the bottom below the box department where
    //  all the horizontal lines of the conjunctions arrive
    if (tree.org.children.length>0){ // there are children
      let _x1 = tree.get("left") + tree.width / 2;
      let _y1 = tree.get("top") + tree.height;
      let ymiddle = Number.parseInt(_y1 + tree.org.bottom_point_height);
      let cc = new fabric.Circle({
        radius: this.editable?2:0,
        fill: 'red',
        originX: "center",
        originY: "center",
        top: ymiddle,
        left: _x1
      });
      tree.org.bottom_point = cc;
      this.canvas.add(cc);
      cc.org = {
        left:_x1, 
        top:ymiddle,
        parent:tree
      };
      cc.on("moving", (e) => {
        if (!this.editable){
          this.canvas.requestRenderAll();
          return;
        }
        let node = e.target;
        let rect = node.org.parent;
        // aggiorno la posizione.
        let old_top = node.org.top;
        let top2 = node.top-(node.top%this.SNAP);
        node.set({"top":top2});
        node.org.top = node.top;
        node.set({
          "left": rect.left + rect.width / 2,
          'top':parseInt(node.top) }
        );
        let rect_top = rect.top + rect.height;
        rect.org.bottom_point_height = node.top - rect_top;
        let diff = node.org.top - old_top;
        this.moveChildren(rect, 0, diff, true);
        this.canvas.requestRenderAll();
      });
      cc.on("moved", (e) => {
        
        if (!this.editable){
          return;
        }
        e.target.org.bottom_point_height = e.target.org.bottom_point_height;
        
        if (this.save_coords_cb){
          this.save_coords_cb(this.getTreeCoords(e.target.org.parent)); //, this.nodesById.get(e.target.org.id));
        }
      });
      cc.on("mouseup", () => {
        this.canvas.requestRenderAll();
        // let node=e.target;
      });
    }
  };

  updateConjunction(child) {
    let conj_qty = child.org.conjunctions.length;
    let parent = child.org.parent;
    if (!parent || conj_qty===0){
      return; // root
    }
    let _x1 = parent.get('left') + parent.width / 2;
    let _y1 = parent.get('top') + parent.height;
    let _x2 = child.get("left") + child.width / 2;
    
    if (conj_qty === 3) {
      let _y2 = child.get("top");
      let middle_y = Number.parseInt(parent.org.bottom_point_height + _y1);
      let llv1 = child.org.conjunctions[0];
      let llh1 = child.org.conjunctions[1];
      let llv2 = child.org.conjunctions[2];
      llv1.set({x1:_x1, y1:_y1, x2:_x1, y2:middle_y});
      llh1.set({x1:_x2, y1:middle_y, x2:_x1, y2:middle_y });
      llv2.set({x1:_x2, y1:middle_y, x2:_x2, y2:_y2 });
    } else if (conj_qty === 2) {
      let _y2 = child.top + child.height/2;
      let llv = child.org.conjunctions[0];
      let llh = child.org.conjunctions[1];
      llv.set({x1:_x1, y1:_y1, x2:_x1, y2: _y2});
      llh.set({
        x1: _x1,
        y1: _y2,
        x2: _x2,
        y2: _y2
      });
    }
  }

  drawTree (tree, xx, yy) {
    // create the "current" tree (it is recursive).
    //  It start from the root, then it calls itself for each of its children

    if (tree.org.top !== null && tree.org.left !== null){
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

    let ytop = tree.top + tree.height;
    let yy_bottom = ytop + tree.org.bottom_point_height + this.VMARGIN / 2;
    let children = tree.org.children || [];
    if (children.length > 0) {
      let children_qty = children.length;
      let children_width = 0;
      let leftxx = null;
      for (let ii = 0; ii < children_qty; ii++) {
        if (children[ii].org.top!==null && children[ii].org.left!==null){
          // there is at least one manually set coordinate
          leftxx = leftxx>children[ii].org.left?leftxx:children[ii].org.left;
          break;
        } else {
          children_width += children[ii].org.tree_width;
        }
      }
      if (leftxx === null){
        leftxx = tree.left+tree.width/2 - children_width / 2;
      }
      
      for (let ii = 0; ii < children_qty; ii++) {
        let child = children[ii];
        leftxx += child.org.tree_width / 2;
        this.drawTree(child, leftxx, yy_bottom);
        this.createConjunction(child);
        leftxx += child.org.tree_width / 2;
      }
    }
  };

  _create_dept (tree, dept_color) {
    // draw the "department" rectangle.
    // it returns a single Fabric object (probably a group of objects)
    //
    let list_of_names = tree.components || [];
    let heights = [];
    let last = 0;
    let max_width = 0;
    let group = new fabric.Group(); 
    let top_blank = 0;
    if (tree.name) {
      // title
      let text = new fabric.Text(tree.name, {
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
    let options_default = {
      fontSize: 10,
      fontFamily: "arial",
      left: 0,
      originX: "center"
    };
    for (let ii = 0; ii < list_of_names.length; ii++) {
      let options = Object.assign({}, options_default); // copy
      let rt = list_of_names[ii];

      let name = '[Unknown]'; // what should I do if the name is missing?
      if (typeof rt === "object") {
        // the name is not a simple text: some style options has been passed
        for (let eachopt in rt) {
          if (eachopt==='text'){
            name = rt["text"];
          }
          options[eachopt] = rt[eachopt];
        }        
      } else {
        name = rt;
      }
      options.top = last;
      let text = new fabric.Text(name, options);
      last += text.height;
      max_width = max_width > text.width ? max_width : text.width;
      heights.push(last);
      group.addWithUpdate(text);
    }
    let baserect = new fabric.Rect({
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
    let intern = new fabric.Rect({
      top: -5,
      left: -group.width / 2 + 1,
      width: group.width - 1,
      height: top_blank,
      fill: dept_color,
      hasBorders: false,
      ry: 3,
      rx: 3
    });
    let intern2 = new fabric.Rect({
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
  };

  getTreeCoords(tree, objcoords) {
    if (typeof tree === "undefined" || typeof tree.org === "undefined"){
      return;
    }
    if (typeof objcoords === "undefined"){
      objcoords = {};
    }
    objcoords[tree.org.id] = {
      left: tree.get("left"),
      top: tree.get("top"),
      bottom_point_height: tree.org.bottom_point_height
    };
    for (let ii = 0; ii < tree.org.children.length; ii++) {
      this.getTreeCoords(tree.org.children[ii], objcoords);
    }
    return objcoords;
  }

  moveChildren(tree, dx, dy, dontmovebottompoint) {
    if (typeof tree === "undefined"){
      return;
    }
    if (tree.org.bottom_point && typeof dontmovebottompoint==='undefined') {
      tree.org.bottom_point.set({
        left: tree.org.left + tree.width/2,
        top: tree.org.top + tree.height + tree.org.bottom_point_height
      });
      tree.org.bottom_point.org.left = tree.org.bottom_point.left;
      tree.org.bottom_point.org.top = tree.org.bottom_point.top;
    }
    for (let ii = 0; ii < tree.org.children.length; ii++) {
      let child = tree.org.children[ii];
      child.set({
        top: child.top + dy,
        left: child.left + dx
      });
      child.org.left += dx;
      child.org.top += dy;
      this.updateConjunction(child);
      this.moveChildren(child, dx, dy);
    }
  };
}