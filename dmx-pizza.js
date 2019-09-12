// xell dmx interface
// (c)copyright 2019 by Gerald Wodni <gerald.wodni@gmail.com>

const _          = require("underscore");
const SerialPort = require("serialport");

const dmxChannels = 128;
const buffer = Buffer.alloc( dmxChannels );
var pars = [];
var queue = [];

function setChannel( index, value ) {
    buffer[ index-1 ] = value;
    //console.log( "SetChannel", index, value );
}
function setPar( index, color ) {
    for( var i = 0; i < color.length; i++ )
        setChannel( pars[index] + i, color[i] );
}
function setAllPars( color ) {
    for( var index = 0; index < pars.length; index++ )
        for( var i = 0; i < color.length; i++ )
            setChannel( pars[index] + i, color[i] );
}

var currentAnmation = "init";
var animationCountdown = 0;
const animations = {
    init: {
        cycles: 0,
        init: function() {
            setAllPars( [   0,   0,   0,   0, 255, 0] );
        },
        run: function() {
            setAllPars( [   0,   0,   0,   0, 255, 0] );
        }
    },
    pizzaTime: {
        cycles: 44*15,
        init: function() {
            setPar( 0, [ 255,   0,   0,   0, 0, 0] );
            setPar( 1, [   0,   0,   0, 255, 0, 0] );
            setPar( 2, [   0, 255,   0,   0, 0, 0] );
            setPar( 3, [   0,   0,   0,   0, 0, 0] );
        },
        run: function(cycle) {
            setPar( 0, [ 255,   0,   0,   0, 0, 0] );
            setPar( 1, [   0,   0,   0, 255, 0, 0] );
            setPar( 2, [   0, 255,   0,   0, 0, 0] );
            setPar( 3, [   0,   0,   0,   0, 0, 0] );
            setPar( Math.round((cycle%(3*10))/10), [   0,   0,   0,   0, 0, 0] );
        }
    },
    placeFirst: {
        cycles: 44*1.5,
        init: function() {
            setAllPars( [   0,   0,   0, 255, 0, 0] );
        },
        run: function(cycle) {
            setAllPars( [   0,   0,   0,   0, 0, 0] );
            setPar( cycle%pars.length, [   0,   0,   0, 255, 0, 0] );
        }
    },
    firstBlood: {
        cycles: 44*4,
        init: function() {
            setAllPars( [   0,   0,   0, 255, 0, 0] );
        },
        run: function(cycle) {
            const count = pars.length
            setAllPars(                [   0,     0,   0,   0, 0, 0] );
            setPar( Math.round((cycle%(count*4))/4), [   255,   0,   0,   0, 0, 0] );
        }
    },
    moodHappy: {
        cycles: 0,
        init: function() {
            setAllPars( [   0, 255,   0,   0, 0, 0] );
        }
    },
    moodNeutral: {
        cycles: 0,
        init: function() {
            setAllPars( [ 255, 255,   0,   0, 0, 0] );
        }
    },
    moodSad: {
        cycles: 0,
        init: function() {
            setAllPars( [ 255,   0,   0,   0, 0, 0] );
        }
    }
};

function playAnimation() {
    if( animationCountdown == 0 && queue.length > 0 ) {
        currentAnmation = queue.shift();
        animations[ currentAnmation ].init();
        animationCountdown = animations[ currentAnmation ].cycles;
    }
    else if( animationCountdown > 0 )
        animationCountdown--;

    if( _.has( animations[ currentAnmation ], "run" ) )
        animations[ currentAnmation ].run( animationCountdown );
}

module.exports = {
    setup: function( k ) {
        const port = new SerialPort( k.getWebsiteConfig("serialPort.port"), {
            baudRate: k.getWebsiteConfig("serialPort.baudRate")
        })

        buffer.fill( 0 );

        pars = k.getWebsiteConfig("devices.pars");

        console.log( "SERIAL START".bold.yellow );
        port.on( "error", function( err ) {
            console.log( "SERIAL ERROR".bold.yellow, err );
        });

        var mode = "waitSync";
        var cycle = 0;
        port.on( "data", function( data ) {
            //console.log( "GOT SERIAL DATA:".bold.yellow, data );

            if( data[0] == 223 && mode == "waitSync" ) {
                if( data.length == 1 ) {
                    mode = "waitCycle";
                    return;
                }
                cycle = data[1];
            }
            else if( mode == "waitCycle" ) {
                cycle = data[0];
                mode = "waitSync"
            }
            
            playAnimation();
            port.write( buffer );
        });

        /* initial write */
        port.write( buffer );
    },
    setChannel: setChannel,
    setPar: setPar,
    setAllPars: setAllPars,
    getParCount() {
        return pars.length;
    },
    getAnimations() {
        return _.keys( animations );
    },
    queueAnimation(name) {
        queue.push( name );
    }
}

