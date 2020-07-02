const fs = require('fs')
const path = require('path')
const axios = require('axios');
const tmp = require('tmp');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var base_url = 'https://cdn.webtiengnhat.com'

// get from browser's network tool
// NOTES: change it
//var playlistUrl = base_url + '/list/pvdupload/smil:1544355855-3faa7fca8747da87d8cbfcd77647b130e856a2bf-5c0d000f0d0fb-ng-phap-n3-online-uchini-1.smil/1544355855-3faa7fca8747da87d8cbfcd77647b130e856a2bf-5c0d000f0d0fb-ng-phap-n3-online-uchini-1.mp4_chunk.m3u8?nimblesessionid=97160';
// var playlistUrl = 'https://cdn.webtiengnhat.com/list/pvdupload/smil:1560481497-3faa7fca8747da87d8cbfcd77647b130e856a2bf-5d030ed9971f7-buoi-13-phan-3.smil/1560481497-3faa7fca8747da87d8cbfcd77647b130e856a2bf-5d030ed9971f7-buoi-13-phan-3__sd.mp4_chunk.m3u8?nimblesessionid=112934'

if (process.argv.length < 3 || process.argv.length > 4) {
    throw new Error("Not expected arguments.");
}
    
var playlistUrl = process.argv[2];
var fileName = process.argv[3];
var numOfParts = 0;


if (fs.existsSync(`${path.resolve(__dirname, 'output')}/${fileName}.mp4`)) {
    throw new Error(`${path.resolve(__dirname, 'output')}/${fileName}.mp4 file existed.`);
}
  
function getTsPart(num) {
    return playlistUrl.replace('mp4_chunk.m3u8', 'mp4-n_' + num + '_0_0.ts');
}

async function getTsUrl(num) {
    let rs = await axios.get(base_url + "/video/touch.php");
    let token = rs.data;
    console.log({ token });
    let tsUrl = getTsPart(num) + "&xtoken=" +
        function (_token) {
            {
                var c = "";
                var characters = "123456780ABCDEFGHKLMNOPYTRQW";
                for (var i = 0; i < _token.length; i++) {
                    if (i % 2 == 0) {
                        c += _token[i]
                    } else {
                        c += characters[Math.floor((Math.random() * characters.length))];
                        c += _token[i]
                    }
                };
                return c
            }
        }(token);
    return tsUrl;
};

async function downloadFile(url, path) {
    console.log('Downloading ' + url);
    const writer = fs.createWriteStream(path)

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    })

    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
    })
}

// NOTES: you must install ffmpeg first
function convertTs2Mp4(tmpDir) {
    return require('child_process').execSync(
        'ffmpeg -allowed_extensions ALL -protocol_whitelist file,https,http,crypto,data,tls -i '
        + path.resolve(tmpDir.name, 'in.m3u8') + ' -hls_time 10 -c copy -bsf:a aac_adtstoasc '
        + path.resolve(tmpDir.name, 'output.mp4') + ' -loglevel debug -y',
        {
            stdio: 'inherit'
        }
    );
}

function copyOutput(tmpDir) {
    return require('child_process').execSync(
        `cp ${tmpDir.name}/output.mp4  ${path.resolve(__dirname, 'output')}/${fileName}.mp4 2> /dev/null`
       ,
        {
            stdio: 'inherit'
        }
    );
}

async function download(numOfParts) {
    // Create tmp directory
    const tmpDir = tmp.dirSync({'unsafeCleanup': true});
    console.log("Temp dir: ", tmpDir.name);

    // download m3u8 file
    let _m3u8Path = path.resolve(tmpDir.name, '_in.m3u8');
    await downloadFile(playlistUrl, _m3u8Path)

    // regenerate m3u8 file
    let m3u8Path = path.resolve(tmpDir.name, 'in.m3u8')
    fs.readFile(_m3u8Path, 'utf8', function (err, data) {
        if (err) {
            return console.log(err);
        }
        var result = data.replace(/\?nimblesessionid=[0-9]*/g, '')
        // get number of Ts files
        numOfParts = data.match(/ts/gm).length
        console.log({ numOfParts })

        fs.writeFile(m3u8Path, result, 'utf8', function (err) {
            if (err) return console.log(err);
        });
    });

    // download hls key
    let hlsPath = path.resolve(tmpDir.name, 'hls.key')
    let hlsKeyurl = playlistUrl.replace(/\.smil\/.*m3u8/g, '.smil/hls.key')
    console.log('hls key', hlsKeyurl)
    await downloadFile(hlsKeyurl, hlsPath)

    // download all Ts files
    for (var i = 0; i < numOfParts; i++) {
        try {
            let tsUrl = await getTsUrl(i)

            // download a ts file
            let filenameTs = tsUrl.split('?')[0].split(':').reverse()[0].split('/')[1];
            const filePathTs = path.resolve(tmpDir.name, filenameTs)
            console.log({
                'Downloading ts': tsUrl
            });
            await downloadFile(tsUrl, filePathTs)

        } catch (error) {
            console.log(error)
            process.exit()
        }
    }
    await convertTs2Mp4(tmpDir);
    console.log({
        'Output': path.resolve(tmpDir.name, 'output.mp4')
    })

    // Clean data
    try {
        await copyOutput(tmpDir);
    } catch(e) {
        console.log("Error: ", e);
    }

    tmpDir.removeCallback();
}

download(numOfParts);
