
function html2AST (html) {
  var startTag = /<([a-zA-Z_][\w\-\.]*)((?:\s+([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))*)\s*(\/?)>/;
  var endTag = /<\/([a-zA-Z_][\w\-\.]*)>/;
  var attr = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

  var bufArray = [];
  var result = {
    node: "root",
    children: []
  };

  var chars; // 字符串
  var match;
  var last;

  while (html && last != html) {
    last = html;
    chars = true; // 判断是否为文本

    if (html.indexOf("</") == 0) {
      match = html.match(endTag);
      if (match) {
        chars = false;
        html = html.substring(match[0].length);
        match[0].replace(endTag, parseEndTag);
      }
    } else if (html.indexOf("<") == 0) {
      match = html.match(startTag);
      if (match) {
        chars = false;
        html = html.substring(match[0].length);
        match[0].replace(startTag, parseStartTag);
      }
    }
    if (chars) {
      var index = html.indexOf("<");
      var text;
      if (index < 0) {
        text = html;
        html = "";
      } else {
        text = html.substring(0, index);
        html = html.substring(index);
      }
      var node = {
        node: "text",
        text: text
      };
      pushChild(node);
    }
  }

  function pushChild (node) {
    if (bufArray.length == 0) {
      result.children.push(node);
    } else {
      var parent = bufArray[bufArray.length - 1];
      if (typeof parent.children == "undefined") {
        parent.children = [];
      }
      parent.children.push(node);
    }
  }

  function parseStartTag (tag, tagName, rest) {
    tagName = tagName.toLowerCase();
    var ds = {};
    var attrs = [];
    var unary = !!arguments[7];
    var node = {
      node: "element",
      tag: tagName
    };

    rest.replace(attr, function (match, name) {
      var value = arguments[2]
        ? arguments[2]
        : arguments[3]
          ? arguments[3]
          : arguments[4]
            ? arguments[4]
            : "";
      // if(name&&name.indexOf("data-"))
      if (name == "class") {
        node.class = value;
      } else {
        attrs.push({
          name: name,
          value: value
        });
      }
    });

    node.attrs = attrs;
    if (!unary) {
      bufArray.push(node);
    } else {
      pushChild(node);
    }
  }

  function parseEndTag (tag, tagName) {
    var pos = 0;
    for (pos = bufArray.length - 1; pos >= 0; pos--) {
      if (bufArray[pos].tag == tagName) {
        break;
      }
    }
    if (pos >= 0) {
      pushChild(bufArray.pop());
    }
  }

  return result;

}
