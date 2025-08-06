const base = require('@heywoogames/hw-base');

class Main extends base.HwAppBase
{
    constructor(){
        super();

        /** @type { import('..').HwMqCli } */
        this._mq = null;
        this.timer = null;

        this._cbOnPm = this.onPm.bind( this );
        this._cbSubPm = this.onSubPm.bind( this );
        
    }

    async onBeforeInit() {
        this.env.PROJ_PATH = this.env.PROJ_PATH + '/example';
        this.env.CFG_PATH = this.env.PROJ_PATH + '/config';

        console.log( '--- onBeforeInit' );
    }

    async onAfterInit() {
    }

    async onPm( pattern, channel, msg) {
        console.log('--- onPm',pattern, channel, msg );
    }

    async onSubPm( channel, msg) {
        console.log('--- onSubPm', channel, msg );
    }

    async onBeforeStart(){
        this.logger.info( this.env.PROJ_PATH);
        console.log( '-- onBeforeStart' );
    }

    async onAfterStart(){
        console.log( '-- onAfterStart' );

        this._mq = this.getPlugin('mq');
        this._mq.psubscribe(['msg.*','msg1.*']);
        this._mq.on('pmessage', (pattern, channel, message) =>{
            console.log('--- onpmessage', pattern, channel, message);
        });

        this._mq.subscribe(['msg','msg.z9']);
        this._mq.on('message', ( channel, message) =>{
            console.log('--- onmessage', channel, message);
        });

        this.testStep = 0;

        this.timer = setInterval( async ()=>{
            console.log( '-- step: ', this.testStep );
            switch( this.testStep ) {
                case 0:

                break;
                case 5:
                    this._mq.unsubscribe('msg.z9')
                    this._mq.punsubscribe('msg.*')
                    //this._mq.punsubscribe()
                break;
                case 10:
                    this._mq.unsubscribe('msg');
                break;
                case 15:
                    this._mq.punsubscribe("msg.*", this._cbOnPm);
                break;
                case 20:
                    this._mq.unsubscribe("msg", this._cbSubPm);
                break;
                default:
                    {
                        if( this.testStep % 2 === 0) {
                            this._mq.publish('msg.z9', Date.now())
                        } else {
                            this._mq.publish('msg', Date.now())
                        }
                    }
                break;
            }

            this.testStep++;
            if( this.testStep > 20 ) {
                clearInterval( this.timer );
                this._mq.stop();
            }
        }, 1000);

        this._mq.psubscribe("msg.*", this._cbOnPm);
        this._mq.subscribe("msg", this._cbSubPm);

    }

    async onBeforeStop(){
        console.log( '--- onBeforeStop' );
        if( this._timer !== null ) {
            clearInterval( this._timer );
        }
    }

    async onAfterStop(){
        console.log( '--- onAfterStop' );
        process.exit(0)
    }


}

(async()=>{
    const main = new Main();
    await main.init();
    await main.start();
})();

