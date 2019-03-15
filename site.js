// w1y - we illuminate you
// (c)copyright 2019 by Gerald Wodni <gerald.wodni@gmail.com>

const _ = require("underscore");
const socketIoClient = require('socket.io-client')

module.exports = {
    setup: function( k ) {

        const pars = k.getWebsiteConfig("devices.pars");

        /* value aggregator - keep static for now, extend if needed */
        function vals( req, obj ){
            return _.extend( obj || {}, {
                title: "w1y - we 1llum1n4t3 y0u",
                pars: pars,
                channelColors: {
                    "r": "#F00",
                    "g": "#0F0",
                    "b": "#00F",
                    "w": "#CCC",
                    "a": "#F80",
                    "u": "#80F",
                },
                animations: k.reg("dmx").getAnimations(),
                mood: k.reg("dmx").getMood()
            });
        }

        /* http/rest access */
        k.router.get("/", function( req, res ) {
            k.jade.render( req, res, "home", vals(req) );
        });
        k.router.postman("/", function( req, res ) {
            if( req.postman.exists( "queueAnimation" ) )
                k.reg("dmx").queueAnimation( req.postman.id("animation") )
            if( req.postman.exists( "mood" ) )
                k.reg("dmx").setMood( req.postman.decimal("mood") );

            k.jade.render( req, res, "home", vals(req) );
        });

        /* frontend websocket */
        k.ws(k.website, "/dmx", function( ws ) {
            console.log("WEBSOCKET HERE!");
            ws.send( "Get Ready" );
            k.reg("dmx").addCallback( function( buffer ) {
                try {
                    ws.send( buffer );
                    return true;
                }
                catch( err ) {
                    console.log( "Websocket Error, remove callback" );
                    return false;
                }
            });

            ws.on("message", function( data ) {
                var obj = JSON.parse(data);
                switch( obj.action ) {
                    case "setMood":
                        k.reg("dmx").setMood( obj.value );
                        break;
                }
            });
        });

        /* subscribe to socketIO on dashboard and send queued Animations to dmx */
        const socketIoHost = k.getWebsiteConfig( "dashboard" );
        const socket = socketIoClient( socketIoHost );

        socket.on('connect', function(){
            console.log( "SOCKET CONNECTED".bold.magenta );
        });
        socket.on('updateServices', function(data){
            var okCount = 0, failCount = 0;
            data.forEach( service => {
                var statusWeight = service.status_max_tick - service.status_min_tick;
                //console.log( "SERVICE".yellow, service.name.green, service.status, service.up, service.down );
                if( service.up )
                    okCount++;
                if( service.down )
                    failCount++;
            });

            var happyness = okCount / (failCount + okCount);
            console.log( "HAPPYNESS".bold.red, happyness.toFixed(2) );

            if( happyness >0.6 )
                k.reg("dmx").queueAnimation( "moodHappy" );
            else if( happyness < 0.3 )
                k.reg("dmx").queueAnimation( "moodSad" );
            else
                k.reg("dmx").queueAnimation( "moodNeutral" );
        });
        var lastAlert = 0;
        socket.on('updateAlerts', function(data){
            data.forEach( alert => {
                if( alert.time <= lastAlert )
                    return;
                lastAlert = alert.time;
                console.log( "ALERT".red, alert.message.green, alert.sound, alert.time );

                if( alert.message == "The game has started! Good hunting!" ) {
                    console.log( "PLAY START".bold.white );
                }
                if( alert.message.indexOf( "We exploited" ) == 0 ) {
                    console.log( "ALERT".red, alert.message.green, alert.sound, alert.time );
                    console.log( "PLAY FLASH".bold.white );
                    k.reg("dmx").queueAnimation( "firstBlood" );
                }
                if( alert.sound == "pizzatime.ogg" ) {
                    k.reg("dmx").queueAnimation( "pizzaTime" );
                    console.log( "PLAY PIZZA".bold.white );
                }
            });
        });
        var lastGlobalStateTick = 0;
        var lastRank = 0;
        socket.on('updateGlobalStates', function( data ){
            try {
                var state = data[0];
                console.log( "UPDA GLOB".bold.magenta, state.tick );
                if( state.tick <= lastGlobalStateTick )
                    return;
                lastGlobalStateTick = state.tick;
                rank = state.score.rank;

                console.log( "RANK".bold.magenta, rank );

                if( rank <= 3 && rank < lastRank ) {
                    k.reg("dmx").queueAnimation( "placeFirst" );
                }
                lastRank = rank;
            }
            catch( x ) {
            }
        });
        var rank = -1;
        socket.on('updateConfig', function( data ){
            console.log( "CONFIG".bold.magenta, data );
        });
        socket.on('disconnect', function(){
            console.log( "SOCKET DISCONNECTED".bold.magenta );
        });

        /* dmx interface */
        k.useSiteModule( null, k.website, "dmx.js", { register: "dmx" } );
        //k.reg("dmx").setAllPars( [0, 0, 0, 0, 255, 0 ] );
    }
};
