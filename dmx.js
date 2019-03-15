// xell dmx interface
// (c)copyright 2019 by Gerald Wodni <gerald.wodni@gmail.com>

const _          = require("underscore");
const SerialPort = require("serialport");

const dmxChannels = 128;
const buffer = Buffer.alloc( dmxChannels );
var pars = [];
var queue = [];
var callbacks = [];

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
var mood = 0.5;
var moodFade = 0.0;

const animations = {
    init: {
        cycles: 50,
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
            setAllPars(                [   0,     0,   0,   0, 0, 0] );
            setPar( (cycle/4)%pars.length, [   255,   0,   0,   0, 0, 0] );
        }
    }
};

function playAnimation() {
    if( animationCountdown == 0 && queue.length > 0 ) {
        /* get next animation */
        currentAnmation = queue.shift();
        animations[ currentAnmation ].init();
        animationCountdown = animations[ currentAnmation ].cycles;
    }
    else if( animationCountdown > 0 ) {
        /* play current animation */
        if( _.has( animations[ currentAnmation ], "run" ) )
            animations[ currentAnmation ].run( animationCountdown );
        animationCountdown--;
    }
    else {
        /* set mood */
        moodFade += 0.002;
        const moodShift = 1.0 / pars.length;

        var r = 0, g = 0, b = 0;
        r = Math.max( 0, 255 * (1-mood) );
        g = 255 - r;

        for( var i = 0; i < pars.length; i++ ) {
            var channelFade = ( moodFade + i*moodShift ) % 2.0;
            channelFade = channelFade > 1.0 ? 2.0 - channelFade : channelFade;

            b = channelFade * 255;
            setPar( i, [r, g, b, 0, 0, 0 ] );
        }
    }


    /* write callbacks */
    var newCallbacks = [];
    callbacks.forEach( callback => {
        if( callback( buffer ) )
            newCallbacks.push( callback );
    });
    callbacks = newCallbacks;
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

            if( k.getWebsiteConfig( "fakeSerialPortIfNotFound", false ) ) {
                console.log( "STARTING FAKE PORT".bold.yellow );
                setInterval( function() {
                    playAnimation();
                }, 50 );
            }
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
    queueAnimation( name ) {
        queue.push( name );
    },
    getAnimations() {
        return _.keys( animations );
    },
    setMood( m ) {
        console.log( "MOOD:", m );
        mood = m;
    },
    getMood() {
        return mood;
    },
    addCallback( callback ) {
        callbacks.push( callback );
    }
}

