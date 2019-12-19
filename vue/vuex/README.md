# vuex

诚如官网所说， `Vuex` 是一个专为 `Vue.js` 应用程序开发的 **状态管理模式** ，帮助我们更好的理清数据源之间的关系。

`State` 定义了数据源， `Mutation` 、 `Action` 等实现了对数据的管理模式。

![vuex.png](./image/vuex.png)

> 参考版本： vuex@v3.1.2
> 
> https://github.com/vuejs/vuex/tree/v3.1.2

源码在 `./src` 下，使用 `tree` 命令查看下目录结构

```
.
|-- helpers.js
|-- index.esm.js
|-- index.js
|-- mixin.js
|-- module
|   |-- module-collection.js
|   `-- module.js
|-- plugins
|   |-- devtool.js
|   `-- logger.js
|-- store.js
`-- util.js
```

文件很少，直接可以看下入口文件 `./src/index.js` 

```js
export default {
  Store,
  install,
  version: '__VERSION__',
  mapState,
  mapMutations,
  mapGetters,
  mapActions,
  createNamespacedHelpers
}
```

`vuex` 对外暴露这些接口。

### **`install.js`**

我们知道 `vuex` 是 `vue` 以插件的形式引入。 `vue` 对插件的引入方式，在 `vue-router源码解析` 中已经写过，也可以查看官网提供的示例： [https://cn.vuejs.org/v2/guide/plugins.html#开发插件](https://cn.vuejs.org/v2/guide/plugins.html#开发插件)

在文件 `./src/store.js` 

```js
export function install (_Vue) {
  // 确保 Vuex 只安装一次
  if (Vue && _Vue === Vue) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        '[vuex] already installed. Vue.use(Vuex) should be called only once.'
      )
    }
    return
  }
  Vue = _Vue
  applyMixin(Vue)
}
```

`applyMixin` 在 `./src/mixin.js` 

```js
Vue.mixin({ beforeCreate: vuexInit })
```

在 `vue` 的 `beforeCreate` 周期，通过 `mixin` 的方式注入 `vuex` 。

```js
function vuexInit () {
  const options = this.$options
  if (options.store) {
    this.$store = typeof options.store === 'function'
      ? options.store()
      : options.store
  } else if (options.parent && options.parent.$store) {
    this.$store = options.parent.$store
  }
}
```

使用 `mixin` 的形式，代表每个 `.vue` 组件的创建都会调用 `vuexInit` 。但我们引入 `vuex` ，一般是在根引入一次就可以了。为了每个 `.vue` 组件都能获取到 `store` ， `vuexInit` 通过每次获取父组件的形式保证每个组件都有 `store` 。

### `Store` 函数

看下 `vuex` 的主体函数 `./src/store.js` 

```js
export class Store {
  constructor (options = {}) {
    // ...
    this._committing = false
    this._actions = Object.create(null)
    this._actionSubscribers = []
    this._mutations = Object.create(null)
    this._wrappedGetters = Object.create(null)
    this._modules = new ModuleCollection(options)
    this._modulesNamespaceMap = Object.create(null)
    this._subscribers = []
    this._watcherVM = new Vue()
    this._makeLocalGettersCache = Object.create(null)
    // ...

    const { dispatch, commit } = this
    this.dispatch = function boundDispatch (type, payload) {
      return dispatch.call(store, type, payload)
    }
    this.commit = function boundCommit (type, payload, options) {
      return commit.call(store, type, payload, options)
    }

    installModule(this, state, [], this._modules.root)

    resetStoreVM(this, state)

  }
}
```

`ModuleCollection` 在 `./src/module/module-collection.js` 。打印一下变量，发现

`this._modules = new ModuleCollection(options)` 会将例如：

```js
var store = new Vuex.Store({
  state: {
    count: 0
  },
  modules: {
    a: {
      state: { x: 'a' },
      modules: {
        c: {
          state: { x: 'c' }
        }
      }
    },
    b: {
      state: { x: 'b' }
    }
  },
  mutations: {
    increment(state) {
      state.count++;
    },
    decrement(state) {
      state.count--;
    }
  }
});
```

中的 `modules` 转化成

```js
root: {
  runtime: false,
  state: {x: 0},
  _children: {
    a: {
      runtime: false,
      state: {x: 'a'},
      _children: {
        c: {
          state: {x: 'c'}
        }
      },
      _rawModule: a
    },
    b: {
      runtime: false,
      state: {x: 'b'},
      _children: {},
      _rawModule: b
    }
  },
  _rawModule: root
}
```

本质上是对数据做一些结构上的转换

再往下是 `installModule` 函数

```js
function installModule (store, rootState, path, module, hot) {
  const isRoot = !path.length
  // 获取命名空间 官网介绍： https://vuex.vuejs.org/zh/guide/modules.html#命名空间
  const namespace = store._modules.getNamespace(path)

  // 如果存在 namespaced ，则在 _modulesNamespaceMap 中注册
  if (module.namespaced) {
    if (store._modulesNamespaceMap[namespace] && process.env.NODE_ENV !== 'production') {
      console.error(`[vuex] duplicate namespace ${namespace} for the namespaced module ${path.join('/')}`)
    }
    store._modulesNamespaceMap[namespace] = module
  }

  if (!isRoot && !hot) {
    // 获取父级的 state
    const parentState = getNestedState(rootState, path.slice(0, -1))
    const moduleName = path[path.length - 1]
    store._withCommit(() => {
      if (process.env.NODE_ENV !== 'production') {
        if (moduleName in parentState) {
          console.warn(
            `[vuex] state field "${moduleName}" was overridden by a module with the same name at "${path.join('.')}"`
          )
        }
      }
      // 将子 module 设置为响应式
      Vue.set(parentState, moduleName, module.state)
    })
  }

  const local = module.context = makeLocalContext(store, namespace, path)

  // 接下来是遍历父子模块的 mutation
  module.forEachMutation((module, key) => {
    const namespacedType = namespace + key
    registerMutation(store, namespacedType, mutation, local)
  })

  // 遍历父子模块的 action
  module.forEachAction((action, key) => {
    const type = action.root ? key : namespace + key
    const handler = action.handler || action
    registerAction(store, type, handler, local)
  })

  // 遍历父子模块的 getter
  module.forEachGetter((getter, key) => {
    const namespacedType = namespace + key
    registerGetter(store, namespacedType, getter, local)
  })

  module.forEachChild((child, key) => {
    installModule(store, rootState, path.concat(key), child, hot)
  })
}
```

总结一下 `installModule` 函数就是遍历父子模块下的 `mutation` 、 `action` 、 `getter` 。以上面的 `new Vuex.Store({})` 为例， `modules` 下有 `a` 、 `b` ，  `a` 下面有 `c` ，他们的 `mutations` 下都有 `increment` 方法，当在没有指定命名空间的情况下，调用 `increment` 会执行三次。

关于函数的实现，以 `registerMutation` 举例，可以简化为：

```js
var store = {
  arr: []
};
function a1(state) {
  console.log('a1,' + state);
}
store.arr.push(function (payload) {
  a1.call(store, 1);
});
store.arr.push(function (payload) {
  a1.call(store, 2);
});
store.arr.push(function (payload) {
  a1.call(store, 3);
});

// 执行
for (var i = 0; i < store.arr.length; i++) {
  store.arr[i]();
}
```

或者

```js
var arr = [];
function a1(state) {
  console.log('a1,' + state);
}
arr.push(function (payload) {
  a1.call(this, 1);
});
arr.push(function (payload) {
  a1.call(this, 2);
});
arr.push(function (payload) {
  a1.call(this, 3);
});

// 执行
for (var i = 0; i < arr.length; i++) {
  arr[i]();
}
```

接下来是 `resetStoreVM` 

```js
function resetStoreVM (store, state, hot) {
  // ...

  // 通过 Object.defineProperty 为每一个 store.getters 设置 get 方法
  // 如获取 this.$store.getters.increment 的时候获取的是 store._vm.increment ，也就是 Vue 对象的 computed 属性
  forEachValue(wrappedGetters, (fn, key) => {
    computed[key] = partial(fn, store)
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key],
      enumerable: true // for local getters
    })
  })

  // 暂时设置为true的目的是在new一个Vue实例的过程中不会报出一切警告
  Vue.config.silent = true

  // 严格模式，保证修改store只能通过mutation
  if (store.strict) {
    enableStrictMode(store)
  }

  // 解除旧vm的state的引用，以及销毁旧的Vue对象
  if (oldVm) {
    // ...
  }
}
```

### `commit`

在 `./src/store.js` 中

```js
commit (_type, _payload, _options) {
  const {
    type,
    payload,
    options
  } = unifyObjectStyle(_type, _payload, _options)

  const mutation = { type, payload }
  // 取出 type 对应的 mutation 的所有方法
  const entry = this._mutations[type]
  if (!entry) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[vuex] unknown mutation type: ${type}`)
    }
    return
  }
  // 执行 mutation 中的所有方法
  this._withCommit(() => {
    entry.forEach(function commitIterator (handler) {
      handler(payload)
    })
  })
  // 通知所有订阅者
  this._subscribers.forEach(sub => sub(mutation, this.state))
  // ...
}
```

`commit` 有多种形式，参考官网示例： [https://vuex.vuejs.org/zh/guide/mutations.html#mutation](https://vuex.vuejs.org/zh/guide/mutations.html#mutation)

```js
store.commit('increment', 10)
```

```js
store.commit('increment', {
  amount: 10
})
```

```js
store.commit({
  type: 'increment',
  amount: 10
})
```

`unifyObjectStyle` 函数可以将其统一转换成

```js
{
  type: type,
  payload: payload,
  options: options
}
```

订阅者：

```js
subscribe (fn) {
  return genericSubscribe(fn, this._subscribers)
}

function genericSubscribe (fn, subs) {
  if (subs.indexOf(fn) < 0) {
    subs.push(fn)
  }
  return () => {
    const i = subs.indexOf(fn)
    if (i > -1) {
      // 注销该订阅者的方法
      subs.splice(i, 1)
    }
  }
}
```

### `dispatch`

```js
dispatch (_type, _payload) {
  // 与 commit 相同
  const {
    type,
    payload
  } = unifyObjectStyle(_type, _payload)

  const action = { type, payload }
  const entry = this._actions[type]
  if (!entry) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[vuex] unknown action type: ${type}`)
    }
    return
  }

  try {
    this._actionSubscribers
      .filter(sub => sub.before)
      .forEach(sub => sub.before(action, this.state))
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[vuex] error in before action subscribers: `)
      console.error(e)
    }
  }

  const result = entry.length > 1
    ? Promise.all(entry.map(handler => handler(payload)))
    : entry[0](payload)

  return result.then(res => {
    try {
      this._actionSubscribers
        .filter(sub => sub.after)
        .forEach(sub => sub.after(action, this.state))
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[vuex] error in after action subscribers: `)
        console.error(e)
      }
    }
    return res
  })
}
```

### `vuex` 辅助函数

[https://vuex.vuejs.org/zh/api/#组件绑定的辅助函数](https://vuex.vuejs.org/zh/api/#组件绑定的辅助函数)

1. `mapState(namespace?: string, map: Array<string> | Object<string | function>): Object`

2. `mapGetters(namespace?: string, map: Array<string> | Object<string>): Object`

3. `mapActions(namespace?: string, map: Array<string> | Object<string | function>): Object`

4. `mapMutations(namespace?: string, map: Array<string> | Object<string | function>): Object`

5. `createNamespacedHelpers(namespace: string): Object`

以 `mapState` 为例

```js
export const mapState = normalizeNamespace((namespace, states) => {
  const res = {}
  if (process.env.NODE_ENV !== 'production' && !isValidMap(states)) {
    console.error('[vuex] mapState: mapper parameter must be either an Array or an Object')
  }
  normalizeMap(states).forEach(({ key, val }) => {
    res[key] = function mappedState () {
      let state = this.$store.state
      let getters = this.$store.getters
      if (namespace) {
        const module = getModuleByNamespace(this.$store, 'mapState', namespace)
        if (!module) {
          return
        }
        state = module.context.state
        getters = module.context.getters
      }
      return typeof val === 'function'
        ? val.call(this, state, getters)
        : state[val]
    }
    res[key].vuex = true
  })
  return res
});

// 接收一个方法，返回一个方法
function normalizeNamespace (fn) {
  return (namespace, map) => {
    if (typeof namespace !== 'string') {
      map = namespace
      namespace = ''
    } else if (namespace.charAt(namespace.length - 1) !== '/') {
      namespace += '/'
    }
    return fn(namespace, map)
  }
}

// 返回一个数组，形式如： [{key: key, val: val}]
function normalizeMap (map) {
  if (!isValidMap(map)) {
    return []
  }
  return Array.isArray(map)
    ? map.map(key => ({ key, val: key }))
    : Object.keys(map).map(key => ({ key, val: map[key] }))
}
```

所以，总结一下， `vuex` 本质上其实就是一个 `var bus = new Vue()` ，只是增加了一些封装！

<br/>

终于写完了！！！各位看官给个赞再走吧。

<!-- `vuex` 通用形式

```js
var store = new Vuex.Store({
  state: {},
  mutations: {},
  actions: {},
  getters: {},
  modules: {},
  plugins,
  strict
});
``` -->
