const fs = require('fs')
const path = require('path')
const axios = require('axios');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var base_url = 'https://cdn.webtiengnhat.com'

// get from browser's network tool
// NOTES: change it
//var playlistUrl = base_url + '/list/pvdupload/smil:1544355855-3faa7fca8747da87d8cbfcd77647b130e856a2bf-5c0d000f0d0fb-ng-phap-n3-online-uchini-1.smil/1544355855-3faa7fca8747da87d8cbfcd77647b130e856a2bf-5c0d000f0d0fb-ng-phap-n3-online-uchini-1.mp4_chunk.m3u8?nimblesessionid=97160';
var playlistUrl = 'https://cdn.webtiengnhat.com/list/pvdupload/smil:1560481497-3faa7fca8747da87d8cbfcd77647b130e856a2bf-5d030ed9971f7-buoi-13-phan-3.smil/1560481497-3faa7fca8747da87d8cbfcd77647b130e856a2bf-5d030ed9971f7-buoi-13-phan-3__sd.mp4_chunk.m3u8?nimblesessionid=112934'

var numOfParts = 0;

function getTsPart(num) {
    return playlistUrl.replace('mp4_chunk.m3u8', 'mp4-n_' + num + '_0_0.ts');
}

async function getTsUrl(num) {
    let rs = await axios.get(base_url + "/video/touch.php");
    let token = rs.data;
    console.log({ token });
    let tsUrl = getTsPart(num) + "&token=" +
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
function convertTs2Mp4() {
    return require('child_process').execSync(
        'ffmpeg -allowed_extensions ALL -protocol_whitelist file,https,http,crypto,data,tls -i '
        + path.resolve(__dirname, 'data', 'in.m3u8') + ' -hls_time 10 -c copy -bsf:a aac_adtstoasc '
        + path.resolve(__dirname, 'data', 'output.mp4') + ' -loglevel debug -y',
        {
            stdio: 'inherit'
        }
    );
}

function cleanData() {
    return require('child_process').execSync(
        `rm ${path.resolve(__dirname, 'data')}/* 2> /dev/null`
       ,
        {
            stdio: 'inherit'
        }
    );
}

function copyOutput() {
    return require('child_process').execSync(
        `cp ${path.resolve(__dirname, 'data')}/output.mp4  ${path.resolve(__dirname, 'output')}/${fileName}.mp4 2> /dev/null`
       ,
        {
            stdio: 'inherit'
        }
    );
}
async function download(numOfParts) {
    await convertTs2Mp4();
    console.log({
        'Output': path.resolve(__dirname, 'data', 'output.mp4')
    })

    // // Clean data
    // try {
    //     await copyOutput();
    // } catch(e) {
    //     console.log("Error: ", e);
    // }
}

download(numOfParts);
