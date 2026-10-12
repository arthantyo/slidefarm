# slideshow

Projects and folders are saved to `projects.json` in the local app data directory
(`%APPDATA%\\SlideFarm` on Windows, `~/Library/Application Support/SlideFarm`
on macOS, or `$XDG_DATA_HOME/SlideFarm` on Linux). Set `SLIDEFARM_DATA_DIR`
to override that directory; an Electron main process can set it to
`app.getPath('userData')` before starting the Next.js server. The first local
load migrates projects and folders from the old browser storage.

The file API accepts requests only on a localhost URL. A future Electron
wrapper should bind its Next.js server to the loopback interface.

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-v9gn1bwv)
