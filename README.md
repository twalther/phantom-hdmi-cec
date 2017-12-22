# phantom-hdmi-cec

## Background
My setup now consists of an Apple TV 4K, LG OLED65B7V and 2 Phantom Gold with a Dialog. The Airplay implementation in the speakers are in a flaky state so optical out from the TV is the best option, the problem however is that volume can then not be controlled by the Apple TV remote.

By seeing this [project](https://github.com/da2001/phantom-bridge) the Phantoms/Dialog now have UPNP-support and by connecting an Raspberry Pi 3 to the TV one is able to listen to HDMI-CEC commands (volume up, volume down) from the Apple TV remote and send the corresponding UPNP-command to the Dialog.

- I run the server by using [PM2](http://pm2.keymetrics.io/)
- [This](https://raspberrypi.stackexchange.com/questions/3810/prevent-pi-from-turning-tv-on) might be useful to make the Raspberry Pi not mess with the TV
- Code is messy, I know
- Works on my machine

Inspired by this [project](https://github.com/da2001/phantom-bridge) as previously mentioned.