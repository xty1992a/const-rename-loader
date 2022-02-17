### 简介
本项目针对taro2做了特定的优化，提供了若干插件用于提升taro开发的编译速度，结果。

### 使用
插件对外暴露plugins,loaders,uses三个模块
一般情况下，仅需使用uses

#### taro组件搜寻缓存插件
taro在启动编译之前，会先搜寻项目所有的taro组件，汇总组件信息。  
这个过程比较耗时，本插件针对这一点，劫持它的插件，在搜寻结束后，将其结果缓存。  
再次编译时，直接启用缓存，跳过搜寻。  
如有异常，手动删除指定目录下的缓存即可。  
```javascript
// taro config.js
const {useFakePlugin} = require('@redbuck/taro-compiler-helper').uses;

// 传入taro插件，以及缓存存放目录
useFakePlugin(
	require('@tarojs/mini-runner/dist/plugins/MiniPlugin'),
	{root}
);
```

#### optional语法支持
taro2使用babel6，这个版本的babel不支持?.语法  
本插件在webpack将代码交给taro之前，用babel7先转换其中的?.  
具体是两个节点
1. [t|j]sx？文件的第一个loader
2. @tarojs/transformer-wx处理代码之前
````javascript
// taro config.js
const {makeUseOptionalLoader} = require('@redbuck/taro-compiler-helper').uses
const useOptionalLoader = makeUseOptionalLoader(require('@tarojs/transformer-wx'))

const config = {
  mini: {
	webpackChain(chain) {
	  useOptionalLoader(chain)
	}
  }
}

````


#### 小程序更名插件
同一个小程序项目开启多个开发者工具预览时，很难区分名称。   
本插件在编译结束后，将当前分支名写入名称当中。  
```javascript
// taro config.js
const {useMiniRenamePlugin} = require('@redbuck/taro-compiler-helper').uses;

const config = {
  mini: {
	webpackChain(chain) {
	  useMiniRenamePlugin(chain)
    }
  }
}
```
