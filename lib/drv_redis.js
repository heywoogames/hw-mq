const Redis = require( 'ioredis' );

/**
 * 订阅状态
 * @typedef {object} SubStat
 * @property {'sub'|'psub'} type - 订阅类型
 * @property { Object.<string, number> } sub - 事件订阅计数
 * @property { Object.<string, number> } subCb - 回调类型事件订阅计数
 * 
 */



class MqRedisDrive
{
    /** @type {Redis} */
    #insSub = null;

    /** @type {Redis} */
    #insPub = null;

    /** 是否开启订阅 */
    #enableSub = true;

    /** 是否开启发布 */
    #enablePub = false;

    /** @type {SubStat} 模式订阅状态*/
    #_psubTa = {
        type: 'psub',
        sub: { },
        subCb: { },
    };

    /** @type {SubStat} 普通订阅状态*/
    #_subTa = {
        type: 'sub',
        sub: { },
        subCb: { },
    };

    /** redis 实例是否共享自 hw-redis 插件 */
    #isShared = false;

    /**
     * 
     * @param {import('@heywoogames/hw-mq').HwMqCli} cli 
     * 
     * @param { import("..").HwMQCfg } cfg
     */
    constructor( cli ,cfg  ) {
        /** @type {import('../main')} */
        this.cli = cli;

        this.name = 'redis'
        this.nameSub = `${this.cli.name}-mqsub`;
        this.namePub = `${this.cli.name}-mqpub`;

        /** @type {import('@heywoogames/hw-redis').HwRedisCfg} */
        this.cfg = cfg.redis;

        if( this.cli.info?.extCfg ) {
            /** @type { import('../index').MqExtCfg } */
            const extCfg = this.cli.info.extCfg;
            this.#enableSub = extCfg?.enableSub ?? true;
            this.#enablePub = extCfg?.enablePub ?? false;
        }
    }

    /**
     * 
     * @param {SubStat} ta 
     * @param {string} evtStr 
     * @param {Function} fun 
     */
    #addSubEvt( ta, evtStr, fun ) {
        const sb = ta.sub[evtStr];
        if( sb === undefined ) {
            ta.sub[evtStr] = 1;
            switch( ta.type ){
                case 'sub':
                    this.#insSub.subscribe( evtStr );
                break;
                case 'psub':
                    this.#insSub.psubscribe( evtStr );
                break;
            }
        } else {
            ta.sub[evtStr] = sb + 1;
        }

        if( typeof(fun) === 'function' ){
            const evtName = `mq:${evtStr}`;
            const v = ta.subCb[evtName];
            if( v === undefined ) {
                ta.subCb[evtName] = 1;
            } else {
                ta.subCb[evtName] = v+1;
            }

            this.cli.on(evtName, fun);
        }
    }

    /**
     * 
     * @param {SubStat} ta 
     * @param {string} evtStr 
     * @param {Function} fun 
     */
    #rmSubEvt( ta, evtStr, fun ){
        let sb = ta.sub[evtStr];
        if( sb !== undefined ) {
            sb -= 1;
            if( sb <= 0 ) {
                delete ta.sub[evtStr];
                switch( ta.type ){
                    case 'sub':
                        this.#insSub.unsubscribe( evtStr );
                    break;
                    case 'psub':
                        this.#insSub.punsubscribe( evtStr );
                    break;
                }
            } else {
                ta.sub[evtStr] = sb;
            }


            if( typeof(fun) === 'function' ) {
                const evtName = `mq:${evtStr}`;
                this.cli.off(evtName, fun);

                let v = ta.subCb[evtName];
                if( v !== undefined ) {
                    v -= 1;
                    if( v<=0 ) {
                        delete ta.subCb[evtName];
                    }else {
                        this.ta.subCb[evtName] = v;
                    }
                } else {
                    this.cli._app.logger.warn(`-- evt subCb ${evtName} cnt error, not find`);
                }
            }
        } else {
            this.cli._app.logger.warn(`-- evt ${evtStr} cnt error, not find`);
        }
    }


    /**
     * @ignore
     */
    async init() {
        this.#mkRedisIns();
    }

    /**
     * @ignore
     */
    async stop () {
        if( this.#insSub ) {
            // 
            if( this.#isShared === false ) {
                if( this.#insSub !== null ) {
                    this.#insSub.quit();
                }

                if( this.#insPub !== null ) {
                    this.#insPub.quit();
                }
            }
        }
    }

    async #mkRedisIns() {
        /** @type { import('@heywoogames/hw-redis').HwRediscli } */
        const rd = this.cli.app.getPlugin('redis');
        if( rd !== null ) {
            if( this.#enableSub === true ) {
                this.#insSub = await rd.getIns( this.nameSub, this.cfg, true );

                this.#insSub.on('pmessage', (pattern, channel, message)=>{
                    this.#on_pmessage(pattern, channel, message);
                });

                this.#insSub.on('message', (channel, message)=>{
                    this.#on_message(channel, message);
                });
            }
            
            if( this.#enablePub === true ) {
                this.#insPub = await rd.getIns( this.namePub, this.cfg, false );
            }
            
            this.#isShared = true;
        } else {
            if( this.#enableSub === true ) {
                const insSub = new Redis( this.cfg );
                insSub.on( "ready",  ( err )=>{
                if( !err ) {
                    this.cli.app.logger.info( `redis ${this.nameSub} is Reday!` )
                }
                } );
            
                insSub.on( "error", ( err )=>{
                this.cli.app.logger.warn( `redis ${this.nameSub} error!`, err.toString() );
                } );
            
                insSub.on( "reconnecting",  ( err )=>{
                this.cli.app.logger.warn( `redis ${this.nameSub} is reconnecting!` )
                } );

                insSub.on('pmessage', (pattern, channel, message)=>{
                    this.#on_pmessage(pattern, channel, message);
                });

                insSub.on('message', (channel, message)=>{
                    this.#on_message(channel, message);
                });
                
                this.#insSub = insSub;
            }

            /// Pub
            if( this.#enablePub ) {
                const insPub = new Redis( this.cfg );
                insPub.on( "ready",  ( err )=>{
                if( !err ) {
                    this.cli.app.logger.info( `redis ${this.namePub} is Reday!` )
                }
                } );
            
                insPub.on( "error", ( err )=>{
                this.cli.app.logger.warn( `redis ${this.namePub} error!`, err.toString() );
                } );
            
                insPub.on( "reconnecting",  ( err )=>{
                this.cli.app.logger.warn( `redis ${this.namePub} is reconnecting!` )
                } );

                this.#insPub = insPub;                
            }
        }
    }

    #on_pmessage( pattern, channel, message ) {
        this.cli.emit('pmessage',pattern,channel, message)

        const evtName = `mq:${pattern}`;
        if( this.#_psubTa.subCb[evtName] ) {
            this.cli.emit( evtName,pattern,channel, message );
        }

    }

    #on_message( channel, message ) {
        this.cli.emit('message',channel, message);

        const evtName = `mq:${channel}`;
        if( this.#_subTa.subCb[evtName] ) {
            this.cli.emit( evtName,channel, message );
        }
    }


    /** 根据模式订阅消息
     * 
     * @param {string | string[]}  pattern 模式
     * @param {Function?} fun 回调函数 
     */
    psubscribe ( pattern, fun ){
        if( this.#insSub === null ) {
            return;
        }

        if( (pattern instanceof Array) && typeof(fun) === 'function' ) {
            this.cli._app.logger.warn(` parame fun unsupport for parrern array`);
            return;
        }

        if( typeof pattern === 'string' ) {
            this.#addSubEvt( this.#_psubTa, pattern, fun );
        } else if( pattern instanceof Array ){
            pattern.forEach( (v) => this.#addSubEvt( this.#_psubTa, v ) );
        }
    }

    /** 取消指定模式的订阅
     * 
     * @param {string | string[]}  pattern 模式
     * 
     * @param {(pattern:string,channel:string, message: string)=>void} [fun] 回调函数 
     */
    punsubscribe( pattern, fun ){
        if( this.#insSub === null ) {
            return;
        }

        if( (pattern instanceof Array) && typeof(fun) === 'function' ) {
            this.cli._app.logger.warn(` parame fun unsupport for parrern array`);
            return;
        }

        if( typeof pattern === 'string' ) {
            this.#rmSubEvt( this.#_psubTa, pattern, fun );
        } else if( pattern instanceof Array ){
            pattern.forEach( (v) => this.#rmSubEvt( this.#_psubTa, v ) );
        }
    }

    /** 订阅指定通道的消息
     * 
     * @param {string | string[]} channels  要订阅的通道
     * @param {Function?} fun 回调函数 
     */
    subscribe ( channels, fun ){
        if( this.#insSub === null ) {
            return;
        }
        if( (channels instanceof Array) && typeof(fun) === 'function' ) {
            this.cli._app.logger.warn(` parame fun unsupport for channels array`);
            return;
        }

        if( typeof channels === 'string' ) {
            this.#addSubEvt( this.#_subTa, channels, fun );
        } else if( channels instanceof Array ){
            channels.forEach( (v) => this.#addSubEvt( this.#_subTa, v ) )
        }
    }

    /** 取消指定通道的订阅
     * 
     * @param @param {string | string[]} channels  要取消订阅的通道
     * @param {Function?} fun 回调函数 
     */
    unsubscribe( channels, fun ) {
        if( this.#insSub === null ) {
            return;
        }

        if( (channels instanceof Array) && typeof(fun) === 'function' ) {
            this.cli._app.logger.warn(` parame fun unsupport for channels array`);
            return;
        }

        if( typeof channels === 'string' ) {
            this.#rmSubEvt( this.#_subTa, channels, fun );
        } else if( channels instanceof Array ){
            channels.forEach( (v) => this.#rmSubEvt( this.#_subTa, v ) )
        }
    }

    /**
     * 
     * @param {string | Buffer} channel 通道
     * @param {string | Buffer} message 消息
     */
    publish(channel, message ) {
        if( this.#insPub === null ) {
            this.cli._app.logger.warn(`now extCfg.enablePub is false,Please set extCfg.enablePub  true`);
            return;
        }
        this.#insPub.publish( channel, message );
    }



}


module.exports = { MqRedisDrive };