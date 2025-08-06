
import { HwPluginBase, PluginConfigItem } from "@heywoogames/hw-base";
import { Redis} from 'ioredis'

export interface HwMQCfg {
    driver: 'redis',
    redis?: {
        host: string,
        port : number,
        username?: string,
        password?: string
    }
}

interface MqExtCfg  {
    /** 是否禁用 发布,缺省 false */
    enablePub?: boolean = false

    /** 是否禁用 订阅,缺省 true */
    enableSub: boolean = true
}
/**
 * mq 插件配置
 */
export type HwPluginMqCfg = PluginConfigItem< MqExtCfg >

/**
 * @class HwMqCli Message Queue 客户端
 * @extends HwPluginBase
 * 
 *  支持 redis 驱动，可以通过 插件配置可选依赖 optionalDependencies, 那么重用已有的redis实例，减少redis连接
 * 
 *  
 * 支持事件
 *   - message ( channel, message)=> {}
 *   - pmessage (pattern, channel, message)=> {}
 */
export class HwMqCli extends HwPluginBase {

    /** 根据模式订阅消息
     * 
     * @param pattern 模式
     * @param fun 绑定函数
     */
    psubscribe ( pattern: string | string[], fun?: (pattern:string,channel:string, message: string)=>void );

    /** 取消指定模式的订阅
     * 
     * @param pattern 模式
     * @param fun 绑定函数
     */
    punsubscribe( pattern: string | string[], fun?: (pattern:string,channel:string, message: string)=>void );

    /** 订阅指定通道的消息
     * 
     * @param channels  要订阅的通道
     * @param fun 绑定函数
     */
    subscribe ( channels : string | string[], fun?: (channel:string, message: string)=>void );

    /** 取消指定通道的订阅
     * 
     * @param channels  要取消订阅的通道
     * @param fun 绑定函数
     */
    unsubscribe( channels : string | string[], fun?: (channel:string, message: string)=>void );

    /**
     * 
     * @param channel 通道
     * @param message 消息
     */
    publish(channel: string | Buffer, message: string | Buffer);

}



