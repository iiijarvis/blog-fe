# vue双向数据绑定

所谓双向数据绑定，就是视图更新能通知到数据、数据更新能通知到视图。

> `vue@1.0` 地址： [https://github.com/vuejs/vue/tree/1.0](https://github.com/vuejs/vue/tree/1.0)
> 
> `vue@2.6.11` 地址： [https://github.com/vuejs/vue/tree/v2.6.11](https://github.com/vuejs/vue/tree/v2.6.11)

我们知道，通过 `Object.defineProperty` 可以实现对数据劫持。那么，

```html
<input id="txt" />

<script>
  var txt = document.getElementById('txt');

  var obj = {};
  var val;
  Object.defineProperty(obj, 'name', {
    get: function () {
      return val;
    },
    set: function (newVal) {
      val = newVal;
      // 数据更新通知到视图
      txt.value = newVal;
    }
  });

  txt.addEventListener('input', function (e) {
    // 视图更新通知到数据
    obj.name = e.target.value;
  });

  console.log(obj.name);
  // 修改数据
  obj.name = 'zhangsan';
  console.log(obj.name);
</script>
```

这样就形成了一个简易的双向数据绑定结构，修改 `<input>` 内的内容，执行 `console.log(obj.name);` 会输出修改后的 `value` ；修改 `obj.name` 的值， `<input>` 内的 `value` 也会随之改变。

<!-- 收工！ -->

在实际情况中，肯定不止有一个 `<input>` 元素需要监听，当有多个的时只需再次添加一个监听事件：

```js
txt2.addEventListener('input', function (e) {
  obj.name = e.target.value;
});
```

让我们再次升级，这次除了有 `<input>` 标签，还有 `<div>` 标签、 `<textarea>` 标签等等，总之很多种。

我们就需要提供一个 `compile` 函数将他们封装起来，遍历所有目标元素，根据不同的标签调用不同的方法监听视图的变化。
