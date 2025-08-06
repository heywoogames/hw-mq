# 概述
hw-mq 插件，提供消息队列机制。 支持驱动:

* redis驱动

# 配置
## app 配置
插件原始配置 (app 的 config.json 里 plugin 字段配置)
``` json
"plugins": {
        "mq": {
            "path": "../index.js",
            "enable": true,
            "alias": "_mq",
            "cfgName": "mq",
            "extCfg": {
                "enablePub": true,
                "enableSub": false
            }
        }
    }
```
基于不同的应用场景，为了减少 redis连接资源，增加下列扩展配置。
extCfg, 扩展配置说明
 * disablePub 是否禁用 发布,缺省 false;
 * disableSub 是否禁用 订阅,缺省 true;

## 插件配置
缺省配置文件 ```mq.json```
``` json
{
    "driver": "redis",
    "redis": {
        "host" : "127.0.0.1",
        "port" : 6379,
        "password" : "111111"
    }
}
```

如果使用```redis```驱动，可以通过配置 app 里 插件的依赖选项，重用 hw-redis 插件的实例。




# Change Log


## 1.0.0
* 实现功能