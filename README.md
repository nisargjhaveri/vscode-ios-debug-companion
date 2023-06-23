# ios-debug-companion · Remote iOS Device Debugging

Companion extension to support remote features in [iOS Debug](https://marketplace.visualstudio.com/items?itemName=nisargjhaveri.ios-debug).

This helps add support for debugging on locally connected devices when VS Code is connected to [remote development](https://code.visualstudio.com/docs/remote/remote-overview).

Generally, when developing on remote machine via VS Code, the [iOS Debug](https://marketplace.visualstudio.com/items?itemName=nisargjhaveri.ios-debug) extension cannot see or attach to the iOS devices connected on your local machine. The workspace resides on the remote machine and only devices connected to the remote machine can be attached to. Along with this extension running on the UI side, iOS Debug can list and launch/attach on the physical devices you have connected to the local machine.

This extension by itself is not much useful, [install "iOS Debug" extension](https://marketplace.visualstudio.com/items?itemName=nisargjhaveri.ios-debug) to make use of this.
